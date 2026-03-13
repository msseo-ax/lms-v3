import { NextRequest } from "next/server";
import { ok, badRequest, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { contents, users, readLogs, contentTargets } from "@/lib/mock-db";
import { getTargetUserIds } from "@/lib/targeting";
import { sendSlackDmBulk } from "@/lib/slack";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string) {
  return UUID_RE.test(value);
}

interface UnreadUser {
  name: string;
  slackUserId: string | null;
}

function getUnreadUsersForMock(contentId: string): UnreadUser[] {
  const targets = contentTargets.filter((target) => target.contentId === contentId);
  const targetUserIds = getTargetUserIds(targets, users);
  const readUserIds = new Set(
    readLogs.filter((log) => log.contentId === contentId).map((log) => log.userId)
  );

  return targetUserIds
    .filter((userId) => !readUserIds.has(userId))
    .map((userId) => {
      const user = users.find((u) => u.id === userId);
      return { name: user?.name ?? "", slackUserId: null };
    })
    .filter((u) => u.name);
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return unauthorized();

  const body = await request.json();
  const { contentId } = body;

  if (!contentId) return badRequest("contentId is required");

  const isMockMode = process.env.USE_MOCK_DB === "true";

  let contentTitle = "";
  let unreadUsers: UnreadUser[] = [];

  if (isMockMode) {
    const content = contents.find((item) => item.id === contentId);
    if (!content) return badRequest("Content not found");

    contentTitle = content.title;
    unreadUsers = getUnreadUsersForMock(contentId);
  } else {
    if (!isUuid(contentId)) return badRequest("Invalid content id");

    const { prisma } = await import("@/lib/prisma");
    if (!prisma) return badRequest("Database is not configured");

    const [content, dbTargets, dbUsers, dbReadLogs] = await Promise.all([
      prisma.content.findUnique({
        where: { id: contentId },
        select: { id: true, title: true },
      }),
      prisma.contentTarget.findMany({ where: { contentId } }),
      prisma.user.findMany({
        select: { id: true, name: true, divisionId: true, teamId: true, slackUserId: true },
      }),
      prisma.readLog.findMany({ where: { contentId }, select: { userId: true } }),
    ]);

    if (!content) return badRequest("Content not found");

    const targetUserIds = getTargetUserIds(dbTargets, dbUsers);
    const readUserIds = new Set(dbReadLogs.map((log) => log.userId));
    const unreadUserIds = targetUserIds.filter((id) => !readUserIds.has(id));

    contentTitle = content.title;
    unreadUsers = unreadUserIds
      .map((id) => {
        const dbUser = dbUsers.find((u) => u.id === id);
        return { name: dbUser?.name ?? "", slackUserId: dbUser?.slackUserId ?? null };
      })
      .filter((u) => u.name);
  }

  if (unreadUsers.length === 0) {
    return ok({ sent: false, message: "모든 대상자가 이미 열람했습니다." });
  }

  const unreadNames = unreadUsers.map((u) => u.name);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";

  // 개인 DM 전송
  const dmTargets = unreadUsers
    .filter((u) => u.slackUserId)
    .map((u) => ({
      slackUserId: u.slackUserId!,
      text: `📢 *[LMS 리마인드]* ${contentTitle}\n\n아직 열람하지 않은 콘텐츠가 있습니다.\n확인하기: ${siteUrl}/contents/${contentId}`,
    }));

  if (dmTargets.length === 0) {
    return ok({
      sent: false,
      message: `미열람자 ${unreadNames.length}명이 있지만 Slack 연동된 사용자가 없습니다.`,
      unreadNames,
    });
  }

  const result = await sendSlackDmBulk(dmTargets);

  return ok({
    sent: result.sent > 0,
    dryRun: result.dryRun,
    message: result.dryRun
      ? `${dmTargets.length}명에게 리마인드를 발송했습니다. (dry run)`
      : `${result.sent}명에게 리마인드를 발송했습니다.${result.failed > 0 ? ` (${result.failed}명 실패)` : ""}`,
    unreadNames,
  });
}
