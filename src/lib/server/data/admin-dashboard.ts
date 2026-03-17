import {
  categories,
  contentTargets,
  contents,
  getContentReadRate,
  getContentReadStatus,
  getTargetLabels,
  users,
} from "@/lib/mock-db";
import { getTargetLabels as getTargetLabelsFromData, getTargetUserIds } from "@/lib/targeting";
import { computeReadStatus } from "@/lib/read-status";
import type { User } from "@/types/domain";
import { cache } from "react";

function getTargetUserIdsFromMock(contentId: string): string[] {
  const targets = contentTargets.filter((target) => target.contentId === contentId);
  return getTargetUserIds(targets, users);
}

export interface AdminDashboardStats {
  totalContents: number;
  totalUsers: number;
  avgReadRate: number;
  unreadAlerts: number;
}

export interface AdminDashboardContentRow {
  id: string;
  title: string;
  readRate: number;
  targetLabels: string[];
  categoryName: string;
  completedCount: number;
  readingCount: number;
  totalCount: number;
  incompleteUsers: User[];
}

export interface AdminDashboardData {
  stats: AdminDashboardStats;
  contentData: AdminDashboardContentRow[];
}

async function getAdminDashboardDataInternal(): Promise<AdminDashboardData | null> {
  const isMockMode = process.env.USE_MOCK_DB === "true";

  if (isMockMode) {
    const totalContents = contents.length;
    const totalUsers = users.length;
    const readRates = contents.map((content) => getContentReadRate(content.id));
    const avgReadRate = Math.round(readRates.reduce((acc, value) => acc + value, 0) / readRates.length);
    const unreadAlerts = readRates.filter((rate) => rate < 50).length;

    const contentData = contents.map((content) => {
      const targetLabels = getTargetLabels(content.id);
      const category = categories.find((categoryItem) => categoryItem.id === content.categoryId);
      const targetUserIds = getTargetUserIdsFromMock(content.id);

      // Compute per-user read status
      let completedCount = 0;
      let readingCount = 0;
      const incompleteUserIds: string[] = [];

      for (const uid of targetUserIds) {
        const status = getContentReadStatus(content.id, uid);
        if (status === "completed") {
          completedCount++;
        } else {
          incompleteUserIds.push(uid);
          if (status === "reading") readingCount++;
        }
      }

      const incompleteUsers = users.filter((user) => incompleteUserIds.includes(user.id));
      const readRate = targetUserIds.length > 0
        ? Math.round((completedCount / targetUserIds.length) * 100)
        : 0;

      return {
        id: content.id,
        title: content.title,
        readRate,
        targetLabels,
        categoryName: category?.name ?? "미분류",
        completedCount,
        readingCount,
        totalCount: targetUserIds.length,
        incompleteUsers,
      };
    });

    return {
      stats: { totalContents, totalUsers, avgReadRate, unreadAlerts },
      contentData,
    };
  }

  const { prisma } = await import("@/lib/prisma");
  if (!prisma) return null;

  const [dbContents, dbUsers, dbDivisions] = await Promise.all([
    prisma.content.findMany({
      take: 50,
      include: {
        category: true,
        targets: true,
        quiz: { select: { id: true, contentId: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        divisionId: true,
        teamId: true,
        avatarUrl: true,
      },
    }),
    prisma.division.findMany({ select: { id: true, name: true } }),
  ]);

  const contentIds = dbContents.map((content) => content.id);
  const [dbReadLogs, dbQuizAttempts] = await Promise.all([
    prisma.readLog.findMany({
      where: { contentId: { in: contentIds } },
      select: { contentId: true, userId: true },
    }),
    prisma.quizAttempt.findMany({
      where: { quiz: { contentId: { in: contentIds } }, passed: true },
      select: { userId: true, quiz: { select: { contentId: true } } },
    }),
  ]);

  // ReadLog: contentId -> Set<userId>
  const readLogMap = new Map<string, Set<string>>();
  dbReadLogs.forEach((log) => {
    if (!readLogMap.has(log.contentId)) readLogMap.set(log.contentId, new Set());
    readLogMap.get(log.contentId)!.add(log.userId);
  });

  // Quiz pass: contentId -> Set<userId>
  const quizPassMap = new Map<string, Set<string>>();
  dbQuizAttempts.forEach((a) => {
    const cid = a.quiz.contentId;
    if (!quizPassMap.has(cid)) quizPassMap.set(cid, new Set());
    quizPassMap.get(cid)!.add(a.userId);
  });

  // contentId -> has quiz?
  const quizContentIds = new Set(
    dbContents.filter((c) => c.quiz).map((c) => c.id)
  );

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

  const labelUsers = userIds.size
    ? await prisma.user.findMany({
        where: { id: { in: Array.from(userIds) } },
        select: { id: true, name: true },
      })
    : [];

  const contentData: AdminDashboardContentRow[] = dbContents.map((content) => {
    const targetUserIds = getTargetUserIds(content.targets, dbUsers);
    const userReadLogs = readLogMap.get(content.id) ?? new Set<string>();
    const userQuizPasses = quizPassMap.get(content.id) ?? new Set<string>();
    const hasQuiz = quizContentIds.has(content.id);
    const totalCount = targetUserIds.length;

    let completedCount = 0;
    let readingCount = 0;
    const incompleteUserIds: string[] = [];

    for (const uid of targetUserIds) {
      const status = computeReadStatus({
        hasReadLog: userReadLogs.has(uid),
        hasQuiz,
        hasPassedQuiz: userQuizPasses.has(uid),
      });
      if (status === "completed") {
        completedCount++;
      } else {
        incompleteUserIds.push(uid);
        if (status === "reading") readingCount++;
      }
    }

    const incompleteUsers = dbUsers.filter((user) => incompleteUserIds.includes(user.id));

    return {
      id: content.id,
      title: content.title,
      readRate: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
      targetLabels: getTargetLabelsFromData(content.targets, dbDivisions, labelUsers),
      categoryName: content.category?.name ?? "미분류",
      completedCount,
      readingCount,
      totalCount,
      incompleteUsers,
    };
  });

  const readRates = contentData.map((content) => content.readRate);
  const avgReadRate = readRates.length
    ? Math.round(readRates.reduce((acc, value) => acc + value, 0) / readRates.length)
    : 0;
  const unreadAlerts = readRates.filter((rate) => rate < 50).length;

  return {
    stats: {
      totalContents: contentData.length,
      totalUsers: dbUsers.length,
      avgReadRate,
      unreadAlerts,
    },
    contentData,
  };
}

export const getAdminDashboardData = cache(getAdminDashboardDataInternal);
