import {
  categories,
  contentTargets,
  contents,
  getContentReadRate,
  getTargetLabels,
  readLogs,
  users,
} from "@/lib/mock-db";
import { getTargetLabels as getTargetLabelsFromData, getTargetUserIds } from "@/lib/targeting";
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
  readCount: number;
  totalCount: number;
  unreadUsers: User[];
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
      const readRate = getContentReadRate(content.id);
      const targetLabels = getTargetLabels(content.id);
      const category = categories.find((categoryItem) => categoryItem.id === content.categoryId);
      const targetUserIds = getTargetUserIdsFromMock(content.id);
      const readUserIds = readLogs.filter((log) => log.contentId === content.id).map((log) => log.userId);
      const unreadUserIds = targetUserIds.filter((id) => !readUserIds.includes(id));
      const unreadUsers = users.filter((user) => unreadUserIds.includes(user.id));

      return {
        id: content.id,
        title: content.title,
        readRate,
        targetLabels,
        categoryName: category?.name ?? "미분류",
        readCount: targetUserIds.length - unreadUserIds.length,
        totalCount: targetUserIds.length,
        unreadUsers,
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
  const [readCounts, dbReadLogs] = await Promise.all([
    prisma.readLog.groupBy({
      by: ["contentId"],
      where: { contentId: { in: contentIds } },
      _count: { userId: true },
    }),
    prisma.readLog.findMany({
      where: { contentId: { in: contentIds } },
      select: { contentId: true, userId: true },
    }),
  ]);
  const readCountMap = new Map(readCounts.map((item) => [item.contentId, item._count.userId]));
  const readLogMap = new Map<string, Set<string>>();

  dbReadLogs.forEach((log) => {
    const current = readLogMap.get(log.contentId);
    if (current) {
      current.add(log.userId);
      return;
    }
    readLogMap.set(log.contentId, new Set([log.userId]));
  });

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
    const readUserIds = readLogMap.get(content.id) ?? new Set<string>();
    const unreadUsers = dbUsers
      .filter((user) => targetUserIds.includes(user.id) && !readUserIds.has(user.id));
    const readCount = readCountMap.get(content.id) ?? 0;
    const totalCount = targetUserIds.length;

    return {
      id: content.id,
      title: content.title,
      readRate: totalCount > 0 ? Math.round((readCount / totalCount) * 100) : 0,
      targetLabels: getTargetLabelsFromData(content.targets, dbDivisions, labelUsers),
      categoryName: content.category?.name ?? "미분류",
      readCount,
      totalCount,
      unreadUsers,
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
