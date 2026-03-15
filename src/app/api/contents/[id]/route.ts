import { NextRequest } from "next/server";
import { badRequest, notFound, ok, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { computeMinDuration } from "@/lib/read-status";
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

function isAllowedHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
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
  const { title, categoryId, body: contentBody, summary, targets, files } = body;

  if (!title || !categoryId) {
    return badRequest("title and categoryId are required");
  }

  if (files && !Array.isArray(files)) {
    return badRequest("files must be an array");
  }

  if (Array.isArray(files)) {
    for (const file of files) {
      if (!file || typeof file !== "object") {
        return badRequest("Invalid files payload");
      }

      if (!file.fileUrl || !file.fileType || !file.fileName) {
        return badRequest("Invalid file item");
      }

      if (!["pdf", "docx", "mp4", "audio", "image", "link"].includes(file.fileType as string)) {
        return badRequest("Invalid file type");
      }

      if (!isAllowedHttpUrl(file.fileUrl)) {
        return badRequest("Invalid file URL");
      }

      if (file.fileType === "link" && !isAllowedHttpUrl(file.fileUrl)) {
        return badRequest("Invalid link URL");
      }
    }
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
      updatedAt: new Date().toISOString(),
      minDurationSeconds: computeMinDuration(contentBody),
      requireFileAccess: Array.isArray(files) && files.length > 0,
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

    if (Array.isArray(files)) {
      for (let i = contentFiles.length - 1; i >= 0; i -= 1) {
        if (contentFiles[i].contentId === id) {
          contentFiles.splice(i, 1);
        }
      }

      for (const file of files) {
        contentFiles.push({
          id: `file-${Date.now()}-${Math.random()}`,
          contentId: id,
          fileUrl: file.fileUrl,
          fileType: file.fileType,
          fileName: file.fileName,
          fileSize: file.fileSize ?? 0,
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
        !["all", "division", "user"].includes(
          target.targetType as string
        )
      ) {
        return badRequest("Invalid target type");
      }

      if (
        target.targetType !== "all" &&
        (typeof target.targetId !== "string" || !target.targetId.trim())
      ) {
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
              targetType: target.targetType as "all" | "division" | "user",
              targetId: target.targetId ?? null,
            })),
          },
        }
      : {};

    const fileData = Array.isArray(files)
      ? {
          files: {
            deleteMany: {},
            create: files.map(
              (file: {
                fileUrl: string;
                fileType: "pdf" | "docx" | "pptx" | "xlsx" | "mp4" | "audio" | "image" | "link";
                fileName: string;
                fileSize?: number;
              }) => ({
                fileUrl: file.fileUrl,
                fileType: file.fileType,
                fileName: file.fileName,
                fileSize: file.fileSize ?? 0,
              })
            ),
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
        minDurationSeconds: computeMinDuration(contentBody),
        requireFileAccess: Array.isArray(files) && files.length > 0,
        ...targetData,
        ...fileData,
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
