import { NextRequest } from "next/server";
import { ok, badRequest, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { contents, contentFiles, contentTargets, categories, getTargetLabels, getContentReadRate, readLogs } from "@/lib/mock-db";

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

export async function GET(request: NextRequest) {
  const isMockMode = process.env.USE_MOCK_DB === "true";
  const takeParam = request.nextUrl.searchParams.get("take");
  const cursor = request.nextUrl.searchParams.get("cursor");
  const parsedTake = takeParam ? Number(takeParam) : 50;
  const take = Number.isFinite(parsedTake) ? Math.min(Math.max(parsedTake, 1), 200) : 50;

  if (isMockMode) {
    const data = contents.map((c) => ({
      ...c,
      category: categories.find((cat) => cat.id === c.categoryId),
      fileCount: contentFiles.filter((f) => f.contentId === c.id).length,
      targetCount: contentTargets.filter((t) => t.contentId === c.id).length,
      readLogCount: readLogs.filter((log: { contentId: string }) => log.contentId === c.id).length,
      targetLabels: getTargetLabels(c.id),
      readRate: getContentReadRate(c.id),
    }));
    const startIndex = cursor ? Math.max(data.findIndex((item) => item.id === cursor) + 1, 0) : 0;
    return ok(data.slice(startIndex, startIndex + take));
  }

  const { prisma } = await import("@/lib/prisma");
  if (!prisma) return ok([]);

  const data = await prisma.content.findMany({
    ...(cursor && isUuid(cursor)
      ? {
          cursor: { id: cursor },
          skip: 1,
        }
      : {}),
    take,
    select: {
      id: true,
      title: true,
      body: true,
      summary: true,
      summaryType: true,
      categoryId: true,
      createdBy: true,
      createdAt: true,
      updatedAt: true,
      category: {
        select: { id: true, name: true, slug: true, sortOrder: true },
      },
      author: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          divisionId: true,
          avatarUrl: true,
        },
      },
      _count: {
        select: {
          files: true,
          targets: true,
          readLogs: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return ok(
    data.map((content) => ({
      id: content.id,
      title: content.title,
      body: content.body,
      summary: content.summary,
      summaryType: content.summaryType,
      categoryId: content.categoryId,
      createdBy: content.createdBy,
      createdAt: content.createdAt,
      updatedAt: content.updatedAt,
      category: content.category,
      author: content.author,
      fileCount: content._count.files,
      targetCount: content._count.targets,
      readLogCount: content._count.readLogs,
    }))
  );
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return unauthorized();

  const body = await request.json();
  const { title, categoryId, body: contentBody, summary, summaryType, targets, files } = body;

  if (!title || !categoryId) return badRequest("title and categoryId are required");

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

      if (!["pdf", "docx", "mp4", "image", "link"].includes(file.fileType as string)) {
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
    const newContent = {
      id: `content-${Date.now()}`,
      title,
      body: contentBody ?? null,
      summary: summary ?? null,
      summaryType: summaryType ?? "manual",
      categoryId,
      createdBy: user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    contents.push(newContent);

    if (targets && Array.isArray(targets)) {
      for (const t of targets) {
        contentTargets.push({
          id: `target-${Date.now()}-${Math.random()}`,
          contentId: newContent.id,
          targetType: t.targetType,
          targetId: t.targetId ?? null,
        });
      }
    }

    if (Array.isArray(files)) {
      for (const file of files) {
        contentFiles.push({
          id: `file-${Date.now()}-${Math.random()}`,
          contentId: newContent.id,
          fileUrl: file.fileUrl,
          fileType: file.fileType,
          fileName: file.fileName,
          fileSize: file.fileSize ?? 0,
        });
      }
    }

    return ok(newContent);
  }

  const { prisma } = await import("@/lib/prisma");
  if (!prisma) return ok(null);

  if (!isUuid(categoryId)) {
    return badRequest("Invalid category id");
  }

  if (Array.isArray(targets)) {
    for (const target of targets) {
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

  try {
    const content = await prisma.content.create({
      data: {
        title,
        body: contentBody,
        summary,
        summaryType: summaryType ?? "manual",
        categoryId,
        createdBy: user.id,
        targets: {
          create: targets?.map((t: { targetType: string; targetId?: string }) => ({
            targetType: t.targetType as "all" | "division" | "user",
            targetId: t.targetId ?? null,
          })) ?? [],
        },
        files: {
          create:
            files?.map(
              (file: {
                fileUrl: string;
                fileType: "pdf" | "docx" | "mp4" | "image" | "link";
                fileName: string;
                fileSize?: number;
              }) => ({
                fileUrl: file.fileUrl,
                fileType: file.fileType,
                fileName: file.fileName,
                fileSize: file.fileSize ?? 0,
              })
            ) ?? [],
        },
      },
      include: { category: true, targets: true, files: true },
    });

    return ok(content);
  } catch {
    return badRequest("Failed to create content");
  }
}
