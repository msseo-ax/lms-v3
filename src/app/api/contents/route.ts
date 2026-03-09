import { NextRequest } from "next/server";
import { ok, badRequest, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { contents, contentFiles, contentTargets, categories, getTargetLabels, getContentReadRate } from "@/lib/mock-db";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string) {
  return UUID_RE.test(value);
}

export async function GET() {
  const isMockMode = process.env.USE_MOCK_DB === "true";

  if (isMockMode) {
    const data = contents.map((c) => ({
      ...c,
      category: categories.find((cat) => cat.id === c.categoryId),
      files: contentFiles.filter((f) => f.contentId === c.id),
      targets: contentTargets.filter((t) => t.contentId === c.id),
      targetLabels: getTargetLabels(c.id),
      readRate: getContentReadRate(c.id),
      fileCount: contentFiles.filter((f) => f.contentId === c.id).length,
    }));
    return ok(data);
  }

  const { prisma } = await import("@/lib/prisma");
  if (!prisma) return ok([]);

  const data = await prisma.content.findMany({
    include: {
      category: true,
      author: true,
      files: true,
      targets: true,
      readLogs: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return ok(data);
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return unauthorized();

  const body = await request.json();
  const { title, categoryId, body: contentBody, summary, summaryType, targets } = body;

  if (!title || !categoryId) return badRequest("title and categoryId are required");

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
            targetType: t.targetType as "all" | "division" | "team" | "user",
            targetId: t.targetId ?? null,
          })) ?? [],
        },
      },
      include: { category: true, targets: true },
    });

    return ok(content);
  } catch {
    return badRequest("Failed to create content");
  }
}
