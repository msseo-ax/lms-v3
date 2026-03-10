import { formatDate } from "@/lib/utils";
import {
  categories as mockCategories,
  contents,
  getContentReadRate,
  getTargetLabels,
} from "@/lib/mock-db";
import { cache } from "react";

interface TargetShape {
  targetType: "all" | "division" | "team" | "user";
  targetId: string | null;
}

function resolveTargetLabels(
  targets: TargetShape[],
  divisions: Array<{ id: string; name: string }>,
  users: Array<{ id: string; name: string }>
) {
  return targets.map((target) => {
    if (target.targetType === "all") return "전체";
    if (target.targetType === "division") {
      return divisions.find((item) => item.id === target.targetId)?.name ?? "본부";
    }
    if (target.targetType === "team") {
      return "팀(legacy)";
    }
    return users.find((item) => item.id === target.targetId)?.name ?? "개인";
  });
}

export interface AdminContentsRow {
  id: string;
  title: string;
  categoryName: string;
  targetLabels: string[];
  readRate: number;
  createdAt: string;
}

async function getAdminContentsDataInternal(take = 50, cursor?: string): Promise<AdminContentsRow[]> {
  const isMockMode = process.env.USE_MOCK_DB === "true";

  if (isMockMode) {
    return contents.map((content) => ({
      id: content.id,
      title: content.title,
      categoryName: mockCategories.find((category) => category.id === content.categoryId)?.name ?? "미분류",
      targetLabels: getTargetLabels(content.id),
      readRate: getContentReadRate(content.id),
      createdAt: formatDate(content.createdAt),
    }));
  }

  const { prisma } = await import("@/lib/prisma");
  if (!prisma) return [];
  const db = prisma;

  const dbContents = await db.content.findMany({
    ...(cursor
      ? {
          cursor: { id: cursor },
          skip: 1,
        }
      : {}),
    take,
    include: {
      category: true,
      targets: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (dbContents.length === 0) {
    return [];
  }

  const contentIds = dbContents.map((content) => content.id);
  const [readCounts, totalUserCount] = await Promise.all([
    db.readLog.groupBy({
      by: ["contentId"],
      where: { contentId: { in: contentIds } },
      _count: { userId: true },
    }),
    db.user.count(),
  ]);

  const readCountMap = new Map(readCounts.map((item) => [item.contentId, item._count.userId]));

  const divisionIds = new Set<string>();
  const userIds = new Set<string>();

  dbContents.forEach((content) => {
    content.targets.forEach((target) => {
      if (target.targetType === "division" && target.targetId) {
        divisionIds.add(target.targetId);
      }
      if (target.targetType === "user" && target.targetId) {
        userIds.add(target.targetId);
      }
    });
  });

  const [dbDivisions, dbUsers] = await Promise.all([
    divisionIds.size
      ? db.division.findMany({
          where: { id: { in: Array.from(divisionIds) } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    userIds.size
      ? db.user.findMany({
          where: { id: { in: Array.from(userIds) } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  async function getTargetCountForContent(targets: TargetShape[]): Promise<number> {
    if (targets.some((target) => target.targetType === "all")) {
      return totalUserCount;
    }

    const orClauses: Array<{ divisionId?: string; teamId?: string; id?: string }> = [];
    for (const target of targets) {
      if (!target.targetId) continue;
      if (target.targetType === "division") {
        orClauses.push({ divisionId: target.targetId });
      }
      if (target.targetType === "team") {
        orClauses.push({ teamId: target.targetId });
      }
      if (target.targetType === "user") {
        orClauses.push({ id: target.targetId });
      }
    }

    if (orClauses.length === 0) {
      return 0;
    }

    return db.user.count({ where: { OR: orClauses } });
  }

  const targetCounts = await Promise.all(dbContents.map((content) => getTargetCountForContent(content.targets)));

  return dbContents.map((content, index) => {
    const readCount = readCountMap.get(content.id) ?? 0;
    const targetCount = targetCounts[index] ?? 0;
    const readRate = targetCount > 0 ? Math.round((readCount / targetCount) * 100) : 0;

    return {
      id: content.id,
      title: content.title,
      categoryName: content.category?.name ?? "미분류",
      targetLabels: resolveTargetLabels(content.targets, dbDivisions, dbUsers),
      readRate,
      createdAt: formatDate(content.createdAt.toISOString()),
    };
  });
}

export const getAdminContentsData = cache(getAdminContentsDataInternal);
