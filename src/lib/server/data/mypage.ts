import {
  categories,
  contentFiles,
  contents,
  divisions,
  getMockCurrentUser,
  getTargetLabels,
  isContentRead,
  isContentTargetedForUser,
  readLogs,
} from "@/lib/mock-db";
import { getCurrentUser } from "@/lib/auth";
import { getTargetLabels as getTargetLabelsFromData } from "@/lib/targeting";
import { cache } from "react";

export interface MyPageData {
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: "admin" | "user";
    avatarUrl: string | null;
    divisionName?: string;
  };
  targetedContents: Array<{ id: string }>;
  readContents: Array<{ id: string }>;
  unreadContents: Array<{
    id: string;
    title: string;
    categoryId: string;
    summary: string | null;
    createdAt: string;
    targetLabels: string[];
    fileCount: number;
  }>;
  categories: Array<{ id: string; name: string }>;
  userReadLogsCount: number;
}

interface MyPageOptions {
  userIdOverride?: string;
}

async function getMyPageDataInternal(options?: MyPageOptions): Promise<MyPageData | null> {
  const isMockMode = process.env.USE_MOCK_DB === "true";

  if (isMockMode) {
    const currentUser = getMockCurrentUser();
    const division = divisions.find((item) => item.id === currentUser.divisionId);

    const targetedContents = contents.filter((content) => isContentTargetedForUser(content.id, currentUser));
    const readContents = targetedContents.filter((content) => isContentRead(content.id, currentUser.id));
    const unreadContents = targetedContents
      .filter((content) => !isContentRead(content.id, currentUser.id))
      .map((content) => ({
        id: content.id,
        title: content.title,
        categoryId: content.categoryId,
        summary: content.summary,
        createdAt: content.createdAt,
        targetLabels: getTargetLabels(content.id),
        fileCount: contentFiles.filter((file) => file.contentId === content.id).length,
      }));

    return {
      currentUser: {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
        avatarUrl: currentUser.avatarUrl,
        divisionName: division?.name,
      },
      targetedContents: targetedContents.map((content) => ({ id: content.id })),
      readContents: readContents.map((content) => ({ id: content.id })),
      unreadContents,
      categories: categories.map((category) => ({ id: category.id, name: category.name })),
      userReadLogsCount: readLogs.filter((log) => log.userId === currentUser.id).length,
    };
  }

  const { prisma } = await import("@/lib/prisma");
  if (!prisma) return null;

  const authUser = await getCurrentUser();
  const currentUserId = options?.userIdOverride ?? authUser?.id;
  if (!currentUserId) return null;

  const [dbUser, dbCategories] = await Promise.all([
    prisma.user.findUnique({
      where: { id: currentUserId },
      include: { division: true },
    }),
    prisma.category.findMany({ select: { id: true, name: true } }),
  ]);

  if (!dbUser) return null;

  const targetConditions: Array<{ targetType: "all" | "division" | "team" | "user"; targetId?: string }> = [
    { targetType: "all" },
    { targetType: "user", targetId: dbUser.id },
  ];

  if (dbUser.divisionId) {
    targetConditions.push({ targetType: "division", targetId: dbUser.divisionId });
  }
  if (dbUser.teamId) {
    targetConditions.push({ targetType: "team", targetId: dbUser.teamId });
  }
  const [targetedContents, userReadLogsCount] = await Promise.all([
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
        files: true,
        readLogs: {
          where: { userId: currentUserId },
          select: { userId: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.readLog.count({ where: { userId: currentUserId } }),
  ]);

  const divisionIds = new Set<string>();
  const userIds = new Set<string>();

  targetedContents.forEach((content) => {
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

  const readContents = targetedContents.filter((content) => content.readLogs.length > 0);

  const unreadContents = targetedContents
    .filter((content) => content.readLogs.length === 0)
    .map((content) => ({
      id: content.id,
      title: content.title,
      categoryId: content.categoryId,
      summary: content.summary,
      createdAt: content.createdAt.toISOString(),
      targetLabels: getTargetLabelsFromData(content.targets, dbDivisions, dbUsers),
      fileCount: content.files.length,
    }));

  return {
    currentUser: {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
      avatarUrl: dbUser.avatarUrl,
      divisionName: dbUser.division?.name,
    },
    targetedContents: targetedContents.map((content) => ({ id: content.id })),
    readContents: readContents.map((content) => ({ id: content.id })),
    unreadContents,
    categories: dbCategories,
    userReadLogsCount,
  };
}

export const getMyPageData = cache(getMyPageDataInternal);
