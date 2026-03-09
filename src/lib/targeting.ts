import type { TargetType } from "@/types/domain";

interface TargetLike {
  targetType: TargetType;
  targetId: string | null;
}

interface UserLike {
  id: string;
  name: string;
  divisionId: string | null;
  teamId: string | null;
}

interface ReadLogLike {
  userId: string;
}

interface OrgUnitLike {
  id: string;
  name: string;
}

export function getTargetUserIds(targets: TargetLike[], users: UserLike[]): string[] {
  if (targets.some((target) => target.targetType === "all")) {
    return users.map((user) => user.id);
  }

  const targetUserIds = new Set<string>();

  for (const target of targets) {
    if (target.targetType === "division") {
      users
        .filter((user) => user.divisionId === target.targetId)
        .forEach((user) => targetUserIds.add(user.id));
      continue;
    }

    if (target.targetType === "team") {
      users
        .filter((user) => user.teamId === target.targetId)
        .forEach((user) => targetUserIds.add(user.id));
      continue;
    }

    if (target.targetType === "user" && target.targetId) {
      targetUserIds.add(target.targetId);
    }
  }

  return Array.from(targetUserIds);
}

export function getTargetLabels(
  targets: TargetLike[],
  divisions: OrgUnitLike[],
  teams: OrgUnitLike[],
  users: Pick<UserLike, "id" | "name">[]
): string[] {
  return targets.map((target) => {
    if (target.targetType === "all") return "전체";
    if (target.targetType === "division") {
      return divisions.find((item) => item.id === target.targetId)?.name ?? "본부";
    }
    if (target.targetType === "team") {
      return teams.find((item) => item.id === target.targetId)?.name ?? "팀";
    }
    return users.find((item) => item.id === target.targetId)?.name ?? "개인";
  });
}

export function getReadRate(
  targets: TargetLike[],
  readLogs: ReadLogLike[],
  users: UserLike[]
): number {
  const targetUserIds = getTargetUserIds(targets, users);
  if (targetUserIds.length === 0) return 0;

  const readUserIds = new Set(readLogs.map((log) => log.userId));
  const readCount = targetUserIds.filter((userId) => readUserIds.has(userId)).length;

  return Math.round((readCount / targetUserIds.length) * 100);
}

export function isTargetedForUser(targets: TargetLike[], user: UserLike): boolean {
  if (targets.some((target) => target.targetType === "all")) return true;
  if (
    user.divisionId &&
    targets.some(
      (target) => target.targetType === "division" && target.targetId === user.divisionId
    )
  ) {
    return true;
  }
  if (
    user.teamId &&
    targets.some((target) => target.targetType === "team" && target.targetId === user.teamId)
  ) {
    return true;
  }
  return targets.some((target) => target.targetType === "user" && target.targetId === user.id);
}
