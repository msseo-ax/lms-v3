import { NextRequest } from "next/server";
import { badRequest, notFound, ok, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import {
  contents,
  contentFiles,
  contentTargets,
  fileAccessLogs,
  readLogs,
} from "@/lib/mock-db";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string) {
  return UUID_RE.test(value);
}

interface RouteContext {
  params: { id: string };
}

export async function GET(_: NextRequest, context: RouteContext) {
  const { id } = context.params;
  const isMockMode = process.env.USE_MOCK_DB === "true";

  if (isMockMode) {
    const content = contents.find((item) => item.id === id);
    if (!content) return notFound("Content not found");

    return ok({
      ...content,
      files: contentFiles.filter((item) => item.contentId === id),
      targets: contentTargets.filter((item) => item.contentId === id),
    });
  }

  if (!isUuid(id)) return badRequest("Invalid content id");

  const { prisma } = await import("@/lib/prisma");
  if (!prisma) return notFound("Content not found");

  const content = await prisma.content.findUnique({
    where: { id },
    include: {
      files: true,
      targets: true,
    },
  });

  if (!content) return notFound("Content not found");
  return ok(content);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return unauthorized();

  const { id } = context.params;
  const body = await request.json();
  const { title, categoryId, body: contentBody, summary, summaryType, targets } = body;

  if (!title || !categoryId) {
    return badRequest("title and categoryId are required");
  }

  const isMockMode = process.env.USE_MOCK_DB === "true";

  if (isMockMode) {
    const contentIndex = contents.findIndex((item) => item.id === id);
    if (contentIndex < 0) return notFound("Content not found");

    const current = contents[contentIndex];
    const updated = {
      ...current,
      title,
      categoryId,
      body: contentBody ?? null,
      summary: summary ?? null,
      summaryType: summaryType ?? "manual",
      updatedAt: new Date().toISOString(),
    };

    contents[contentIndex] = updated;

    if (Array.isArray(targets)) {
      for (let i = contentTargets.length - 1; i >= 0; i -= 1) {
        if (contentTargets[i].contentId === id) {
          contentTargets.splice(i, 1);
        }
      }

      for (const target of targets) {
        contentTargets.push({
          id: `target-${Date.now()}-${Math.random()}`,
          contentId: id,
          targetType: target.targetType,
          targetId: target.targetId ?? null,
        });
      }
    }

    return ok(updated);
  }

  if (!isUuid(id)) return badRequest("Invalid content id");
  if (!isUuid(categoryId)) return badRequest("Invalid category id");

  if (Array.isArray(targets)) {
    for (const target of targets) {
      if (!target || typeof target !== "object") {
        return badRequest("Invalid targets payload");
      }

      if (
        !["all", "division", "team", "user"].includes(
          target.targetType as string
        )
      ) {
        return badRequest("Invalid target type");
      }

      if (target.targetType !== "all" && target.targetId && !isUuid(target.targetId)) {
        return badRequest("Invalid target id");
      }
    }
  }

  const { prisma } = await import("@/lib/prisma");
  if (!prisma) return notFound("Content not found");

  try {
    const existing = await prisma.content.findUnique({ where: { id } });
    if (!existing) return notFound("Content not found");

    const targetData = Array.isArray(targets)
      ? {
          targets: {
            deleteMany: {},
            create: targets.map((target: { targetType: string; targetId?: string | null }) => ({
              targetType: target.targetType as "all" | "division" | "team" | "user",
              targetId: target.targetId ?? null,
            })),
          },
        }
      : {};

    const content = await prisma.content.update({
      where: { id },
      data: {
        title,
        categoryId,
        body: contentBody ?? null,
        summary: summary ?? null,
        summaryType: summaryType ?? "manual",
        ...targetData,
      },
      include: {
        targets: true,
        files: true,
      },
    });

    return ok(content);
  } catch {
    return badRequest("Failed to update content");
  }
}

export async function DELETE(_: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return unauthorized();

  const { id } = context.params;
  const isMockMode = process.env.USE_MOCK_DB === "true";

  if (isMockMode) {
    const contentIndex = contents.findIndex((item) => item.id === id);
    if (contentIndex < 0) return notFound("Content not found");

    contents.splice(contentIndex, 1);

    for (let i = contentTargets.length - 1; i >= 0; i -= 1) {
      if (contentTargets[i].contentId === id) {
        contentTargets.splice(i, 1);
      }
    }

    const removedFileIds = new Set<string>();
    for (let i = contentFiles.length - 1; i >= 0; i -= 1) {
      if (contentFiles[i].contentId === id) {
        removedFileIds.add(contentFiles[i].id);
        contentFiles.splice(i, 1);
      }
    }

    for (let i = readLogs.length - 1; i >= 0; i -= 1) {
      if (readLogs[i].contentId === id) {
        readLogs.splice(i, 1);
      }
    }

    for (let i = fileAccessLogs.length - 1; i >= 0; i -= 1) {
      if (removedFileIds.has(fileAccessLogs[i].contentFileId)) {
        fileAccessLogs.splice(i, 1);
      }
    }

    return ok({ success: true });
  }

  if (!isUuid(id)) return badRequest("Invalid content id");

  const { prisma } = await import("@/lib/prisma");
  if (!prisma) return notFound("Content not found");

  try {
    const existing = await prisma.content.findUnique({ where: { id } });
    if (!existing) return notFound("Content not found");

    await prisma.content.delete({ where: { id } });
    return ok({ success: true });
  } catch {
    return badRequest("Failed to delete content");
  }
}
