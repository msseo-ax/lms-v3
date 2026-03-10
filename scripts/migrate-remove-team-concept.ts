#!/usr/bin/env tsx
import { PrismaClient, TargetType } from "@prisma/client";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

const prisma = new PrismaClient();

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

async function main() {
  const apply = hasFlag("--apply");
  const keepTeams = hasFlag("--keep-teams");

  console.log("팀 개념 제거 데이터 마이그레이션 시작");
  console.log(`모드: ${apply ? "APPLY" : "DRY-RUN"}`);
  console.log(`teams 테이블 보존: ${keepTeams ? "예" : "아니오"}`);
  console.log("");

  const [teamTargets, teams, existingDivisionTargets, usersWithTeam] = await Promise.all([
    prisma.contentTarget.findMany({
      where: { targetType: TargetType.team },
      select: { id: true, contentId: true, targetId: true },
    }),
    prisma.team.findMany({ select: { id: true, divisionId: true } }),
    prisma.contentTarget.findMany({
      where: { targetType: TargetType.division },
      select: { contentId: true, targetId: true },
    }),
    prisma.user.findMany({
      where: { teamId: { not: null } },
      select: { id: true, teamId: true },
    }),
  ]);

  const teamToDivisionMap = new Map(teams.map((team) => [team.id, team.divisionId]));
  const existingDivisionSet = new Set(
    existingDivisionTargets
      .filter((target) => Boolean(target.targetId))
      .map((target) => `${target.contentId}::${target.targetId}`)
  );

  let convertCount = 0;
  let deleteAsDuplicateCount = 0;
  let deleteAsInvalidTeamCount = 0;

  for (const target of teamTargets) {
    if (!target.targetId) {
      deleteAsInvalidTeamCount += 1;
      continue;
    }

    const divisionId = teamToDivisionMap.get(target.targetId);
    if (!divisionId) {
      deleteAsInvalidTeamCount += 1;
      continue;
    }

    const divisionKey = `${target.contentId}::${divisionId}`;
    if (existingDivisionSet.has(divisionKey)) {
      deleteAsDuplicateCount += 1;
      continue;
    }

    existingDivisionSet.add(divisionKey);
    convertCount += 1;
  }

  console.log(`team 타겟 전체: ${teamTargets.length}`);
  console.log(`division으로 전환 예정: ${convertCount}`);
  console.log(`중복으로 삭제 예정: ${deleteAsDuplicateCount}`);
  console.log(`유효 team 미매핑 삭제 예정: ${deleteAsInvalidTeamCount}`);
  console.log(`teamId 보유 유저 null 처리 예정: ${usersWithTeam.length}`);
  console.log(`team row 삭제 예정: ${keepTeams ? 0 : teams.length}`);

  if (!apply) {
    console.log("");
    console.log("DRY-RUN 완료. 실제 반영은 --apply 옵션으로 실행하세요.");
    await prisma.$disconnect();
    return;
  }

  const conversionResult = await prisma.$transaction(async (tx) => {
    const localDivisionSet = new Set(
      existingDivisionTargets
        .filter((target) => Boolean(target.targetId))
        .map((target) => `${target.contentId}::${target.targetId}`)
    );

    let converted = 0;
    let deletedDuplicate = 0;
    let deletedInvalidTeam = 0;

    for (const target of teamTargets) {
      if (!target.targetId) {
        await tx.contentTarget.delete({ where: { id: target.id } });
        deletedInvalidTeam += 1;
        continue;
      }

      const divisionId = teamToDivisionMap.get(target.targetId);
      if (!divisionId) {
        await tx.contentTarget.delete({ where: { id: target.id } });
        deletedInvalidTeam += 1;
        continue;
      }

      const divisionKey = `${target.contentId}::${divisionId}`;
      if (localDivisionSet.has(divisionKey)) {
        await tx.contentTarget.delete({ where: { id: target.id } });
        deletedDuplicate += 1;
        continue;
      }

      await tx.contentTarget.update({
        where: { id: target.id },
        data: {
          targetType: TargetType.division,
          targetId: divisionId,
        },
      });
      localDivisionSet.add(divisionKey);
      converted += 1;
    }

    const userUpdate = await tx.user.updateMany({
      where: { teamId: { not: null } },
      data: { teamId: null },
    });

    const teamDelete = keepTeams ? { count: 0 } : await tx.team.deleteMany({});

    return {
      converted,
      deletedDuplicate,
      deletedInvalidTeam,
      usersCleared: userUpdate.count,
      teamsDeleted: teamDelete.count,
    };
  });

  console.log("");
  console.log("APPLY 완료");
  console.log(`division으로 전환: ${conversionResult.converted}`);
  console.log(`중복으로 삭제: ${conversionResult.deletedDuplicate}`);
  console.log(`유효 team 미매핑 삭제: ${conversionResult.deletedInvalidTeam}`);
  console.log(`user.teamId null 처리: ${conversionResult.usersCleared}`);
  console.log(`teams 삭제: ${conversionResult.teamsDeleted}`);

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : String(error));
  await prisma.$disconnect();
  process.exit(1);
});
