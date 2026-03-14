#!/usr/bin/env tsx
/**
 * 중복 Division 정리 스크립트
 *
 * 같은 이름(대소문자 무시)의 Division이 여러 개 존재하면
 * 가장 오래된 것을 canonical로 두고 나머지의 관련 데이터를 이관 후 삭제한다.
 *
 * 실행:
 *   npx tsx scripts/cleanup-duplicate-divisions.ts           # dry-run (변경 없음)
 *   npx tsx scripts/cleanup-duplicate-divisions.ts --execute  # 실제 실행
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

const prisma = new PrismaClient();
const dryRun = !process.argv.includes("--execute");

// sync-slack-orgs.ts와 동일한 정규화 맵
const DIVISION_NORMALIZATION_MAP: Record<string, string> = {
  "스테이지밸리": "스테이지밸리",
  "스테이지벨리": "스테이지밸리",
  cxlab: "CXLab",
  "스테이수원": "스테이수원",
};

function normalizeKey(name: string): string {
  return name.replace(/\s+/g, "").toLowerCase();
}

function canonicalName(name: string): string {
  const key = normalizeKey(name);
  return DIVISION_NORMALIZATION_MAP[key] ?? name;
}

async function main() {
  if (dryRun) {
    console.log("=== DRY-RUN 모드 (변경 없음) ===");
    console.log("실제 실행하려면 --execute 플래그를 추가하세요.\n");
  } else {
    console.log("=== EXECUTE 모드 (실제 변경) ===\n");
  }

  const allDivisions = await prisma.division.findMany({
    orderBy: { createdAt: "asc" },
  });

  // 정규화 키 기준 그룹핑 (공백 제거 + lowercase + normalization map)
  const groups = new Map<string, typeof allDivisions>();
  for (const div of allDivisions) {
    const key = normalizeKey(canonicalName(div.name));
    const group = groups.get(key) ?? [];
    group.push(div);
    groups.set(key, group);
  }

  const duplicateGroups = Array.from(groups.entries()).filter(
    ([, group]) => group.length > 1
  );

  if (duplicateGroups.length === 0) {
    console.log("중복 Division이 없습니다.");
    await prisma.$disconnect();
    return;
  }

  console.log(`중복 그룹 ${duplicateGroups.length}개 발견:\n`);

  for (const [key, group] of duplicateGroups) {
    const canonical = group[0]; // 가장 오래된 것
    const duplicates = group.slice(1);

    console.log(`[${key}] canonical: "${canonical.name}" (${canonical.id})`);
    for (const dup of duplicates) {
      console.log(`  중복: "${dup.name}" (${dup.id})`);
    }

    const dupIds = duplicates.map((d) => d.id);

    // 이관 대상 카운트
    const userCount = await prisma.user.count({
      where: { divisionId: { in: dupIds } },
    });
    const teamCount = await prisma.team.count({
      where: { divisionId: { in: dupIds } },
    });
    const targetCount = await prisma.contentTarget.count({
      where: { targetType: "division", targetId: { in: dupIds } },
    });

    console.log(
      `  이관 대상: users=${userCount}, teams=${teamCount}, content_targets=${targetCount}`
    );

    if (!dryRun) {
      await prisma.$transaction(async (tx) => {
        if (userCount > 0) {
          await tx.user.updateMany({
            where: { divisionId: { in: dupIds } },
            data: { divisionId: canonical.id },
          });
        }
        if (teamCount > 0) {
          await tx.team.updateMany({
            where: { divisionId: { in: dupIds } },
            data: { divisionId: canonical.id },
          });
        }
        if (targetCount > 0) {
          await tx.contentTarget.updateMany({
            where: { targetType: "division", targetId: { in: dupIds } },
            data: { targetId: canonical.id },
          });
        }
        await tx.division.deleteMany({
          where: { id: { in: dupIds } },
        });
      });
      console.log(`  → 이관 및 삭제 완료\n`);
    } else {
      console.log("");
    }
  }

  console.log("완료.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
