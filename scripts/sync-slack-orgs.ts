#!/usr/bin/env tsx
/**
 * 슬랙 display_name 괄호값으로 조직 구조를 동기화
 *
 * 실행:
 *   npx tsx scripts/sync-slack-orgs.ts
 *
 * 필요 환경변수:
 *   SLACK_BOT_TOKEN="xoxb-..."  (users:read, users:read.email 스코프 필요)
 *
 * 동작:
 *   1. users.list 로 전체 유효 멤버 수집
 *   2. display_name의 괄호값 파싱
 *   3. 괄호값 내 "부문"/"본부" 토큰 추출
 *   4. Division upsert
 *   5. User.divisionId 업데이트
 *
 * 순서:
 *   sync-slack-orgs.ts 실행 후 sync-slack-users.ts 실행 권장
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

interface SlackMember {
  id: string;
  deleted: boolean;
  is_bot: boolean;
  is_app_user: boolean;
  profile: {
    email?: string;
    display_name?: string;
    real_name?: string;
  };
}

const DIVISION_NORMALIZATION_MAP: Record<string, string> = {
  "스테이지밸리": "스테이지밸리",
  "스테이지벨리": "스테이지밸리",
  cxlab: "CXLab",
  "스테이수원": "스테이수원",
};

function normalizeDivisionName(rawDivision?: string): string | undefined {
  if (!rawDivision) return undefined;

  const trimmedDivision = rawDivision.trim();
  if (!trimmedDivision) return undefined;

  const normalizedKey = trimmedDivision.replace(/\s+/g, "").toLowerCase();
  return DIVISION_NORMALIZATION_MAP[normalizedKey] ?? trimmedDivision;
}

async function fetchAllMembers(): Promise<SlackMember[]> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) throw new Error("SLACK_BOT_TOKEN이 없습니다.");

  const members: SlackMember[] = [];
  let cursor: string | undefined;

  do {
    const params = new URLSearchParams({ limit: "200" });
    if (cursor) params.set("cursor", cursor);

    const res = await fetch(`https://slack.com/api/users.list?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = (await res.json()) as {
      ok: boolean;
      error?: string;
      members: SlackMember[];
      response_metadata?: { next_cursor?: string };
    };

    if (!data.ok) throw new Error(`users.list 오류: ${data.error}`);

    members.push(...data.members);
    cursor = data.response_metadata?.next_cursor || undefined;

  } while (cursor);

  return members;
}

function parseOrgFromDisplayName(displayName?: string): {
  division?: string;
} {
  if (!displayName) return {};

  const match = displayName.match(/\(([^()]*)\)\s*$/);
  if (!match?.[1]) return {};

  const groupText = match[1].trim();
  if (!groupText) return {};

  const tokens = groupText
    .split(/[,/|·>]/)
    .map((token) => token.trim())
    .filter(Boolean);

  const extractedDivision =
    tokens.find((token) => token.includes("부문") || token.includes("본부")) ??
    (tokens.length > 0 ? tokens[0] : undefined);
  const division = normalizeDivisionName(extractedDivision);

  return { division };
}

function resolveDisplayName(member: SlackMember): string {
  const displayName = member.profile.display_name?.trim();
  if (displayName) return displayName;
  const realName = member.profile.real_name?.trim();
  if (realName) return realName;
  return "";
}

async function ensureDivisionIds(
  divisionNames: string[],
  divisionMap: Map<string, string>
): Promise<void> {
  for (const divisionName of divisionNames) {
    const key = divisionName.toLowerCase();
    if (divisionMap.has(key)) continue;

    let division = await prisma.division.findFirst({
      where: { name: { equals: divisionName, mode: "insensitive" } },
    });
    if (!division) {
      division = await prisma.division.create({ data: { name: divisionName } });
      console.log(`  생성: ${divisionName}`);
    } else {
      console.log(`  기존: ${division.name}`);
    }

    divisionMap.set(key, division.id);
  }
}

async function main() {
  const allowedDomain = process.env.GOOGLE_ALLOWED_DOMAIN ?? "homes.global";

  console.log("슬랙 멤버 목록 가져오는 중...");
  const allMembers = await fetchAllMembers();

  const validMembers = allMembers.filter((m) => {
    if (m.deleted || m.is_bot || m.is_app_user) return false;
    const email = m.profile.email;
    return email && email.endsWith(`@${allowedDomain}`);
  });

  console.log(`유효 멤버 ${validMembers.length}명 display_name 파싱 중...`);
  console.log("");

  const divisionMap = new Map<string, string>();

  type OrgInfo = { divisionName?: string };
  const userOrgMap = new Map<string, OrgInfo>();

  for (const member of validMembers) {
    const displayName = resolveDisplayName(member);
    const { division } = parseOrgFromDisplayName(displayName);
    if (division) {
      userOrgMap.set(member.profile.email!, { divisionName: division });
      console.log(
        `  ${member.profile.email} → display_name: ${displayName} | 부문/본부: ${division}`
      );
    }
  }

  if (userOrgMap.size === 0) {
    console.log("");
    console.log("display_name 괄호값에서 조직 정보를 찾지 못했습니다.");
    console.log("예: 홍길동 (경영본부), 홍길동 (플랫폼본부)");
    await prisma.$disconnect();
    return;
  }

  console.log("");
  console.log("Division 동기화 중...");

  const divisionNames = Array.from(
    new Set(
      Array.from(userOrgMap.values())
        .map((item) => item.divisionName)
        .filter((name): name is string => Boolean(name))
    )
  );
  await ensureDivisionIds(divisionNames, divisionMap);

  console.log("");
  console.log("유저 소속 업데이트 중...");

  let updated = 0;
  let skipped = 0;

  for (const [email, { divisionName }] of Array.from(userOrgMap.entries())) {
    const divisionId = divisionName ? divisionMap.get(divisionName.toLowerCase()) : undefined;

    if (!divisionId) {
      skipped++;
      continue;
    }

    await prisma.user.updateMany({
      where: { email },
      data: {
        divisionId: divisionId ?? null,
      },
    });
    updated++;
  }

  console.log("");
  console.log(
    `완료: Division ${divisionMap.size}개 / 유저 ${updated}명 업데이트 / ${skipped}명 건너뜀`
  );

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
