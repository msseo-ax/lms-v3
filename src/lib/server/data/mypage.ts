import {
  categories,
  contentFiles,
  contents,
  divisions,
  getMockCurrentUser,
  getTargetLabels,
  getContentReadStatus,
  isContentTargetedForUser,
  readLogs,
} from "@/lib/mock-db";
import { getCurrentUserFromMiddlewareHeader } from "@/lib/auth";
import { getTargetLabels as getTargetLabelsFromData } from "@/lib/targeting";
import { computeReadStatus, type ReadStatus } from "@/lib/read-status";
import { cache } from "react";

interface IncompleteContent {
  id: string;
  title: string;
  categoryId: string;
  summary: string | null;
  createdAt: string;
  targetLabels: string[];
  fileCount: number;
  readStatus: ReadStatus;
}

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
  completedContents: Array<{ id: string }>;
  readingContents: Array<{ id: string }>;
  incompleteContents: IncompleteContent[];
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
    const contentsWithStatus = targetedContents.map((content) => ({
      ...content,
      readStatus: getContentReadStatus(content.id, currentUser.id),
      fileCount: contentFiles.filter((file) => file.contentId === content.id).length,
    }));
    const completedContents = contentsWithStatus.filter((c) => c.readStatus === "completed");
    const readingContents = contentsWithStatus.filter((c) => c.readStatus === "reading");
    const incompleteContents: IncompleteContent[] = contentsWithStatus
      .filter((c) => c.readStatus !== "completed")
      .map((content) => ({
        id: content.id,
        title: content.title,
        categoryId: content.categoryId,
        summary: content.summary,
        createdAt: content.createdAt,
        targetLabels: getTargetLabels(content.id),
        fileCount: content.fileCount,
        readStatus: content.readStatus,
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
      completedContents: completedContents.map((content) => ({ id: content.id })),
      readingContents: readingContents.map((content) => ({ id: content.id })),
      incompleteContents,
      categories: categories.map((category) => ({ id: category.id, name: category.name })),
      userReadLogsCount: readLogs.filter((log) => log.userId === currentUser.id).length,
    };
  }

  // Auth user is cached per request — no redundant Supabase/DB calls
  const authUser = await getCurrentUserFromMiddlewareHeader();
  if (!authUser) return null;

  const { prisma } = await import("@/lib/prisma");
  if (!prisma) return null;

  const currentUserId = options?.userIdOverride ?? authUser.id;

  // Own page: use auth user directly (zero DB queries for user)
  // Admin viewing other user: single DB lookup
  type PageUser = {
    id: string; name: string; email: string; role: "admin" | "user";
    divisionId: string | null; teamId: string | null;
    avatarUrl: string | null; divisionName?: string;
  };

  let pageUser: PageUser;

  if (currentUserId === authUser.id) {
    pageUser = {
      id: authUser.id, name: authUser.name, email: authUser.email,
      role: authUser.role, divisionId: authUser.divisionId,
      teamId: authUser.teamId, avatarUrl: authUser.avatarUrl,
      divisionName: authUser.division?.name,
    };
  } else {
    const dbUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      include: { division: true },
    });
    if (!dbUser) return null;
    pageUser = {
      id: dbUser.id, name: dbUser.name, email: dbUser.email,
      role: dbUser.role, divisionId: dbUser.divisionId,
      teamId: dbUser.teamId, avatarUrl: dbUser.avatarUrl,
      divisionName: dbUser.division?.name,
    };
  }

  const targetConditions: Array<{ targetType: "all" | "division" | "team" | "user"; targetId?: string }> = [
    { targetType: "all" },
    { targetType: "user", targetId: pageUser.id },
  ];

  if (pageUser.divisionId) {
    targetConditions.push({ targetType: "division", targetId: pageUser.divisionId });
  }
  if (pageUser.teamId) {
    targetConditions.push({ targetType: "team", targetId: pageUser.teamId });
  }

  const [dbCategories, targetedContents, userReadLogsCount] = await Promise.all([
    prisma.category.findMany({ select: { id: true, name: true } }),
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
          select: { userId: true, durationSeconds: true },
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

  // Batch FileAccessLog check
  const contentIdsRequiringFileAccess = targetedContents
    .filter((c) => c.requireFileAccess)
    .map((c) => c.id);

  const fileAccessSet = new Set<string>();
  if (contentIdsRequiringFileAccess.length > 0) {
    const accessLogs = await prisma.fileAccessLog.findMany({
      where: {
        userId: currentUserId,
        contentFile: { contentId: { in: contentIdsRequiringFileAccess } },
      },
      select: { contentFile: { select: { contentId: true } } },
      distinct: ["contentFileId"],
    });
    accessLogs.forEach((fa) => fileAccessSet.add(fa.contentFile.contentId));
  }

  const contentsWithStatus = targetedContents.map((content) => {
    const readLog = content.readLogs[0];
    const status = computeReadStatus({
      hasReadLog: content.readLogs.length > 0,
      durationSeconds: readLog?.durationSeconds ?? 0,
      minDurationSeconds: content.minDurationSeconds,
      requireFileAccess: content.requireFileAccess,
      hasFileAccess: fileAccessSet.has(content.id),
    });
    return { ...content, readStatus: status };
  });

  const completedContents = contentsWithStatus.filter((c) => c.readStatus === "completed");
  const readingContents = contentsWithStatus.filter((c) => c.readStatus === "reading");
  const incompleteContents: IncompleteContent[] = contentsWithStatus
    .filter((c) => c.readStatus !== "completed")
    .map((content) => ({
      id: content.id,
      title: content.title,
      categoryId: content.categoryId,
      summary: content.summary,
      createdAt: content.createdAt.toISOString(),
      targetLabels: getTargetLabelsFromData(content.targets, dbDivisions, dbUsers),
      fileCount: content.files.length,
      readStatus: content.readStatus,
    }));

  return {
    currentUser: {
      id: pageUser.id,
      name: pageUser.name,
      email: pageUser.email,
      role: pageUser.role,
      avatarUrl: pageUser.avatarUrl,
      divisionName: pageUser.divisionName,
    },
    targetedContents: targetedContents.map((content) => ({ id: content.id })),
    completedContents: completedContents.map((content) => ({ id: content.id })),
    readingContents: readingContents.map((content) => ({ id: content.id })),
    incompleteContents,
    categories: dbCategories,
    userReadLogsCount,
  };
}

export const getMyPageData = cache(getMyPageDataInternal);
