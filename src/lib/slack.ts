const isDryRun = () => process.env.SLACK_DRY_RUN === "true";
const botToken = () => process.env.SLACK_BOT_TOKEN;

interface SlackDmParams {
  slackUserId: string;
  text: string;
}

/**
 * Slack DM 전송 (chat.postMessage)
 * SLACK_DRY_RUN=true 일 때는 콘솔 로그만 출력
 */
export async function sendSlackDm({
  slackUserId,
  text,
}: SlackDmParams): Promise<{ ok: boolean; error?: string }> {
  if (isDryRun()) {
    console.log(`[Slack DryRun] DM to ${slackUserId}: ${text}`);
    return { ok: true };
  }

  const token = botToken();
  if (!token) {
    return { ok: false, error: "SLACK_BOT_TOKEN이 설정되지 않았습니다." };
  }

  try {
    const res = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ channel: slackUserId, text }),
    });

    const data = (await res.json()) as { ok: boolean; error?: string };
    return data;
  } catch {
    return { ok: false, error: "Slack 연결에 실패했습니다." };
  }
}

/**
 * 여러 사용자에게 Slack DM 일괄 전송
 * 결과를 집계하여 반환
 */
export async function sendSlackDmBulk(
  users: { slackUserId: string; text: string }[]
): Promise<{ sent: number; failed: number; dryRun: boolean }> {
  const dryRun = isDryRun();

  if (users.length === 0) {
    return { sent: 0, failed: 0, dryRun };
  }

  const results = await Promise.allSettled(
    users.map(({ slackUserId, text }) => sendSlackDm({ slackUserId, text }))
  );

  let sent = 0;
  let failed = 0;
  for (const result of results) {
    if (result.status === "fulfilled" && result.value.ok) {
      sent++;
    } else {
      failed++;
    }
  }

  return { sent, failed, dryRun };
}
