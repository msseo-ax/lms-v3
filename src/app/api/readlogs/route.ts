import { NextRequest } from "next/server";
import { ok, badRequest, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { readLogs } from "@/lib/mock-db";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const body = await request.json();
  const { contentId } = body;

  if (!contentId) {
    return badRequest("contentId is required");
  }

  const isMockMode = process.env.USE_MOCK_DB === "true";

  if (isMockMode) {
    const existing = readLogs.find(
      (l) => l.contentId === contentId && l.userId === user.id
    );
    if (!existing) {
      readLogs.push({
        id: `log-${Date.now()}`,
        contentId,
        userId: user.id,
        readAt: new Date().toISOString(),
      });
    }
    return ok({ success: true });
  }

  const { prisma } = await import("@/lib/prisma");
  if (!prisma) return ok({ success: true });

  await prisma.readLog.upsert({
    where: {
      userId_contentId: { userId: user.id, contentId },
    },
    update: {},
    create: {
      contentId,
      userId: user.id,
    },
  });

  return ok({ success: true });
}
