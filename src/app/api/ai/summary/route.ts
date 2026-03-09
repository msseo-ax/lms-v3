import { NextRequest } from "next/server";
import { ok, badRequest, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";

const MOCK_SUMMARIES = [
  "이 문서는 핵심 전략과 실행 계획을 요약한 자료입니다. 주요 변경사항과 향후 방향성을 포함하고 있으며, 전 직원이 숙지해야 할 내용을 담고 있습니다.",
  "본 콘텐츠는 업무 프로세스 개선 사항을 정리한 가이드입니다. 새로운 절차와 도구 활용법을 단계별로 설명하며, 효율적인 업무 수행을 위한 핵심 포인트를 제시합니다.",
  "이 자료는 최신 시장 동향과 인사이트를 분석한 리포트입니다. 산업 트렌드, 경쟁사 동향, 그리고 우리 회사에 미치는 영향을 종합적으로 다루고 있습니다.",
];

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return unauthorized();

  const body = await request.json();
  const { text } = body;

  if (!text || typeof text !== "string") {
    return badRequest("text is required");
  }

  const isMockMode = process.env.USE_MOCK_DB === "true";
  const hasApiKey = Boolean(process.env.OPENAI_API_KEY);

  if (isMockMode || !hasApiKey) {
    await new Promise((r) => setTimeout(r, 1200));
    const summary = MOCK_SUMMARIES[Math.floor(Math.random() * MOCK_SUMMARIES.length)];
    return ok({ summary, provider: "mock" });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "당신은 사내 학습 콘텐츠를 요약하는 AI입니다. 주어진 텍스트를 2-3문장으로 간결하게 요약해주세요. 핵심 내용과 대상 독자에게 유용한 정보를 중심으로 요약합니다. 한국어로 답변하세요.",
          },
          {
            role: "user",
            content: `다음 콘텐츠를 요약해주세요:\n\n${text.slice(0, 4000)}`,
          },
        ],
        max_tokens: 200,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      return ok({ summary: MOCK_SUMMARIES[0], provider: "fallback" });
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content?.trim() ?? MOCK_SUMMARIES[0];

    return ok({ summary, provider: "openai" });
  } catch {
    return ok({ summary: MOCK_SUMMARIES[0], provider: "fallback" });
  }
}
