import { NextRequest } from "next/server";
import { ok, badRequest, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { contents, users, readLogs, contentTargets } from "@/lib/mock-db";
import { getTargetUserIds } from "@/lib/targeting";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string) {
  return UUID_RE.test(value);
}

function getUnreadUserNamesForMock(contentId: string): string[] {
  const targets = contentTargets.filter((target) => target.contentId === contentId);
  const targetUserIds = getTargetUserIds(targets, users);
  const readUserIds = new Set(
    readLogs.filter((log) => log.contentId === contentId).map((log) => log.userId)
  );

  return targetUserIds
    .filter((userId) => !readUserIds.has(userId))
    .map((userId) => users.find((user) => user.id === userId)?.name ?? "")
    .filter(Boolean);
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return unauthorized();

  const body = await request.json();
  const { contentId } = body;

  if (!contentId) return badRequest("contentId is required");

  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  const isMockMode = process.env.USE_MOCK_DB === "true";

  let contentTitle = "";
  let unreadNames: string[] = [];

  if (isMockMode) {
    const content = contents.find((item) => item.id === contentId);
    if (!content) return badRequest("Content not found");

    contentTitle = content.title;
    unreadNames = getUnreadUserNamesForMock(contentId);
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
        select: { id: true, name: true, divisionId: true, teamId: true },
      }),
      prisma.readLog.findMany({ where: { contentId }, select: { userId: true } }),
    ]);

    if (!content) return badRequest("Content not found");

    const targetUserIds = getTargetUserIds(dbTargets, dbUsers);
    const readUserIds = new Set(dbReadLogs.map((log) => log.userId));
    const unreadUserIds = targetUserIds.filter((id) => !readUserIds.has(id));

    contentTitle = content.title;
    unreadNames = unreadUserIds
      .map((id) => dbUsers.find((dbUser) => dbUser.id === id)?.name ?? "")
      .filter(Boolean);
  }

  if (unreadNames.length === 0) {
    return ok({ sent: false, message: "모든 대상자가 이미 열람했습니다." });
  }

  const slackMessage = {
    text: `📢 *[LMS 리마인드]* ${contentTitle}\n\n미열람자: ${unreadNames.join(", ")} (${unreadNames.length}명)\n\n확인하기: ${process.env.NEXT_PUBLIC_SITE_URL}/contents/${contentId}`,
  };

  if (isMockMode || !webhookUrl) {
    console.log("[Slack Mock]", slackMessage.text);
    return ok({
      sent: true,
      mock: true,
      message: `${unreadNames.length}명에게 리마인드를 발송했습니다. (mock)`,
      unreadNames,
    });
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(slackMessage),
    });

    if (!response.ok) {
      return ok({ sent: false, message: "Slack 발송에 실패했습니다." });
    }

    return ok({
      sent: true,
      mock: false,
      message: `${unreadNames.length}명에게 리마인드를 발송했습니다.`,
      unreadNames,
    });
  } catch {
    return ok({ sent: false, message: "Slack 연결에 실패했습니다." });
  }
}
