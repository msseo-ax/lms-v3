import { formatDate } from "@/lib/utils";
import {
  categories as mockCategories,
  contents,
  getContentReadRate,
  getTargetLabels,
} from "@/lib/mock-db";
import { computeReadStatus } from "@/lib/read-status";
import { cache } from "react";

interface TargetShape {
  targetType: "all" | "division" | "team" | "user";
  targetId: string | null;
}

interface UserTargetSnapshot {
  id: string;
  divisionId: string | null;
  teamId: string | null;
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

function getTargetCountForContent(
  targets: TargetShape[],
  totalUserCount: number,
  allUserIds: Set<string>,
  divisionUserIdsMap: Map<string, Set<string>>,
  teamUserIdsMap: Map<string, Set<string>>
): number {
  if (targets.some((target) => target.targetType === "all")) {
    return totalUserCount;
  }

  const targetedUserIds = new Set<string>();

  for (const target of targets) {
    if (!target.targetId) continue;

    if (target.targetType === "division") {
      const divisionUsers = divisionUserIdsMap.get(target.targetId);
      if (divisionUsers) {
        divisionUsers.forEach((userId) => targetedUserIds.add(userId));
      }
      continue;
    }

    if (target.targetType === "team") {
      const teamUsers = teamUserIdsMap.get(target.targetId);
      if (teamUsers) {
        teamUsers.forEach((userId) => targetedUserIds.add(userId));
      }
      continue;
    }

    if (target.targetType === "user" && allUserIds.has(target.targetId)) {
      targetedUserIds.add(target.targetId);
    }
  }

  return targetedUserIds.size;
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
  const [dbReadLogs, dbFileAccessLogs, allUsersForTargetCount] = await Promise.all([
    db.readLog.findMany({
      where: { contentId: { in: contentIds } },
      select: { contentId: true, userId: true, durationSeconds: true },
    }),
    db.fileAccessLog.findMany({
      where: { contentFile: { contentId: { in: contentIds } } },
      select: { userId: true, contentFile: { select: { contentId: true } } },
    }),
    db.user.findMany({
      select: {
        id: true,
        divisionId: true,
        teamId: true,
      },
    }),
  ]);

  // ReadLog: contentId -> userId -> durationSeconds
  const readLogMap = new Map<string, Map<string, number>>();
  dbReadLogs.forEach((log) => {
    if (!readLogMap.has(log.contentId)) readLogMap.set(log.contentId, new Map());
    readLogMap.get(log.contentId)!.set(log.userId, log.durationSeconds);
  });

  // FileAccessLog: contentId -> Set<userId>
  const fileAccessMap = new Map<string, Set<string>>();
  dbFileAccessLogs.forEach((fa) => {
    const cid = fa.contentFile.contentId;
    if (!fileAccessMap.has(cid)) fileAccessMap.set(cid, new Set());
    fileAccessMap.get(cid)!.add(fa.userId);
  });
  const totalUserCount = allUsersForTargetCount.length;
  const allUserIds = new Set<string>();
  const divisionUserIdsMap = new Map<string, Set<string>>();
  const teamUserIdsMap = new Map<string, Set<string>>();

  allUsersForTargetCount.forEach((user: UserTargetSnapshot) => {
    allUserIds.add(user.id);

    if (user.divisionId) {
      const currentDivisionUsers = divisionUserIdsMap.get(user.divisionId) ?? new Set<string>();
      currentDivisionUsers.add(user.id);
      divisionUserIdsMap.set(user.divisionId, currentDivisionUsers);
    }

    if (user.teamId) {
      const currentTeamUsers = teamUserIdsMap.get(user.teamId) ?? new Set<string>();
      currentTeamUsers.add(user.id);
      teamUserIdsMap.set(user.teamId, currentTeamUsers);
    }
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

  const targetCounts = dbContents.map((content) =>
    getTargetCountForContent(
      content.targets,
      totalUserCount,
      allUserIds,
      divisionUserIdsMap,
      teamUserIdsMap
    )
  );

  return dbContents.map((content, index) => {
    const targetCount = targetCounts[index] ?? 0;
    const userReadLogs = readLogMap.get(content.id) ?? new Map<string, number>();
    const userFileAccess = fileAccessMap.get(content.id) ?? new Set<string>();

    // Count completed users among all target users
    let completedCount = 0;
    // We need actual target user IDs to check per-user status
    const allUserTargetIds = new Set<string>();
    const isAllTarget = content.targets.some((t) => t.targetType === "all");

    if (isAllTarget) {
      allUsersForTargetCount.forEach((u) => allUserTargetIds.add(u.id));
    } else {
      for (const target of content.targets) {
        if (!target.targetId) continue;
        if (target.targetType === "division") {
          const divUsers = divisionUserIdsMap.get(target.targetId);
          if (divUsers) divUsers.forEach((uid) => allUserTargetIds.add(uid));
        } else if (target.targetType === "team") {
          const teamUsers = teamUserIdsMap.get(target.targetId);
          if (teamUsers) teamUsers.forEach((uid) => allUserTargetIds.add(uid));
        } else if (target.targetType === "user") {
          if (allUserIds.has(target.targetId)) allUserTargetIds.add(target.targetId);
        }
      }
    }

    for (const uid of Array.from(allUserTargetIds)) {
      const status = computeReadStatus({
        hasReadLog: userReadLogs.has(uid),
        durationSeconds: userReadLogs.get(uid) ?? 0,
        minDurationSeconds: content.minDurationSeconds,
        requireFileAccess: content.requireFileAccess,
        hasFileAccess: userFileAccess.has(uid),
      });
      if (status === "completed") completedCount++;
    }

    const readRate = targetCount > 0 ? Math.round((completedCount / targetCount) * 100) : 0;

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
