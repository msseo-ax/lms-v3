import { getCurrentUserFromMiddlewareHeader } from "@/lib/auth";
import {
  categories,
  contentFiles,
  contents,
  getMockCurrentUser,
  getTargetLabels,
  isContentRead,
  isContentTargetedForUser,
} from "@/lib/mock-db";
import { getTargetLabels as getTargetLabelsFromData, isTargetedForUser } from "@/lib/targeting";
import type { Category, ContentWithMeta } from "@/types/domain";
import { cache } from "react";

export interface HomeFeedData {
  contents: ContentWithMeta[];
  categories: Category[];
}

interface HomeFeedOptions {
  userOverride?: {
    id: string;
    name: string;
    divisionId: string | null;
    teamId?: string | null;
  };
}

async function getHomeFeedDataInternal(options?: HomeFeedOptions): Promise<HomeFeedData | null> {
  const isMockMode = process.env.USE_MOCK_DB === "true";

  if (isMockMode) {
    const currentUser = getMockCurrentUser();

    const feedData: ContentWithMeta[] = contents
      .map((content) => {
        const category = categories.find((item) => item.id === content.categoryId);
        const fileCount = contentFiles.filter((file) => file.contentId === content.id).length;
        const targetLabels = getTargetLabels(content.id);
        const isTargeted = isContentTargetedForUser(content.id, currentUser);
        const isRead = isContentRead(content.id, currentUser.id);

        return {
          ...content,
          isRead,
          isTargeted,
          fileCount,
          targetLabels,
          category,
        } satisfies ContentWithMeta;
      })
      .filter((content) => content.isTargeted)
      .sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

    return {
      contents: feedData,
      categories,
    };
  }

  const user = options?.userOverride ?? (await getCurrentUserFromMiddlewareHeader());
  if (!user) {
    return null;
  }

  const { prisma } = await import("@/lib/prisma");
  if (!prisma) {
    return null;
  }

  const effectiveDivisionId = user.divisionId;
  const effectiveTeamId = "teamId" in user && user.teamId ? user.teamId : null;

  const targetConditions: Array<
    | { targetType: "all" }
    | { targetType: "user"; targetId: string }
    | { targetType: "division"; targetId: string }
    | { targetType: "team"; targetId: string }
  > = [
    { targetType: "all" },
    { targetType: "user", targetId: user.id },
  ];

  if (effectiveDivisionId) {
    targetConditions.push({ targetType: "division", targetId: effectiveDivisionId });
  }

  if (effectiveTeamId) {
    targetConditions.push({ targetType: "team", targetId: effectiveTeamId });
  }

  const [dbContents, dbCategories] = await Promise.all([
    prisma.content.findMany({
      where: {
        targets: {
          some: {
            OR: targetConditions,
          },
        },
      },
      include: {
        targets: true,
        readLogs: {
          where: { userId: user.id },
          select: { userId: true },
        },
        _count: {
          select: { files: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  const userForTargeting = {
    id: user.id,
    name: user.name,
    divisionId: effectiveDivisionId,
    teamId: effectiveTeamId,
  };

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
      ? prisma.division.findMany({
          where: { id: { in: Array.from(divisionIds) } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    userIds.size
      ? prisma.user.findMany({
          where: { id: { in: Array.from(userIds) } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  const feedData: ContentWithMeta[] = dbContents
    .map((content) => {
      const category = dbCategories.find((item) => item.id === content.categoryId);
      const isRead = content.readLogs.length > 0;
      const isTargeted = isTargetedForUser(content.targets, userForTargeting);

      return {
        id: content.id,
        title: content.title,
        body: content.body,
        summary: content.summary,
        categoryId: content.categoryId,
        createdBy: content.createdBy,
        createdAt: content.createdAt.toISOString(),
        updatedAt: content.updatedAt.toISOString(),
        category: category
          ? {
              id: category.id,
              name: category.name,
              slug: category.slug,
              sortOrder: category.sortOrder,
            }
          : undefined,
        isRead,
        isTargeted,
        fileCount: content._count.files,
        targetLabels: getTargetLabelsFromData(content.targets, dbDivisions, dbUsers),
      } satisfies ContentWithMeta;
    })
    .sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return {
    contents: feedData,
    categories: dbCategories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      sortOrder: category.sortOrder,
    })),
  };
}

export const getHomeFeedData = cache(getHomeFeedDataInternal);
