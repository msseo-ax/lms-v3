#!/usr/bin/env tsx
/**
 * 슬랙 워크스페이스 멤버를 DB users 테이블에 동기화
 *
 * 실행:
 *   npx tsx scripts/sync-slack-users.ts
 *
 * 필요 환경변수:
 *   SLACK_BOT_TOKEN="xoxb-..."  (users:read, users:read.email 스코프 필요)
 *
 * 동작:
 *   - 봇/비활성 멤버 제외
 *   - homes.global 도메인 이메일만 처리 (GOOGLE_ALLOWED_DOMAIN 기준)
 *   - 이미 있는 유저는 name/avatarUrl만 업데이트 (role, division 유지)
 *   - 없는 유저는 신규 생성 (role: user)
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

interface SlackMember {
  id: string;
  name: string;
  deleted: boolean;
  is_bot: boolean;
  is_app_user: boolean;
  profile: {
    real_name?: string;
    display_name?: string;
    email?: string;
    image_192?: string;
  };
}

async function fetchSlackMembers(): Promise<SlackMember[]> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    throw new Error("SLACK_BOT_TOKEN이 없습니다. .env에 추가해주세요.");
  }

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

    if (!data.ok) {
      throw new Error(`Slack API 오류: ${data.error}`);
    }

    members.push(...data.members);
    cursor = data.response_metadata?.next_cursor || undefined;
  } while (cursor);

  return members;
}

async function main() {
  const allowedDomain = process.env.GOOGLE_ALLOWED_DOMAIN || "homes.global";

  console.log("슬랙 멤버 목록 가져오는 중...");
  const allMembers = await fetchSlackMembers();

  // 봇, 비활성, 이메일 없음, 허용 도메인 외 제외
  const validMembers = allMembers.filter((m) => {
    if (m.deleted || m.is_bot || m.is_app_user) return false;
    const email = m.profile.email;
    if (!email) return false;
    if (!email.endsWith(`@${allowedDomain}`)) return false;
    return true;
  });

  console.log(
    `전체 ${allMembers.length}명 중 유효 멤버: ${validMembers.length}명 (@${allowedDomain})`
  );
  console.log("");

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const member of validMembers) {
    const email = member.profile.email!;
    const name =
      member.profile.real_name ||
      member.profile.display_name ||
      member.name ||
      email.split("@")[0];
    const avatarUrl = member.profile.image_192 || null;

    const slackUserId = member.id;
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      if (
        existing.name === name &&
        existing.avatarUrl === avatarUrl &&
        existing.slackUserId === slackUserId
      ) {
        console.log(`  건너뜀: ${email} (변경 없음)`);
        skipped++;
      } else {
        // 이름/아바타/slackUserId 업데이트 (role, division 건드리지 않음)
        await prisma.user.update({
          where: { email },
          data: { name, avatarUrl, slackUserId },
        });
        console.log(`  업데이트: ${email} (${name}, slack: ${slackUserId})`);
        updated++;
      }
    } else {
      await prisma.user.create({
        data: { email, name, avatarUrl, slackUserId, role: "user" },
      });
      console.log(`  생성: ${email} (${name}, slack: ${slackUserId})`);
      created++;
    }
  }

  console.log("");
  console.log(`완료: 생성 ${created}명 / 업데이트 ${updated}명 / 건너뜀 ${skipped}명`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
