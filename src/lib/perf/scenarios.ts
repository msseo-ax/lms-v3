import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { timeAsync } from "@/lib/perf/timer";
import { getHomeFeedData } from "@/lib/server/data/home-feed";
import { getMyPageData } from "@/lib/server/data/mypage";
import { getAdminContentsData } from "@/lib/server/data/admin-contents";
import { getAdminDashboardData } from "@/lib/server/data/admin-dashboard";

type ScenarioName =
  | "home_feed"
  | "mypage"
  | "admin_contents"
  | "admin_dashboard"
  | "api_contents_get"
  | "readlogs_upsert";

interface ScenarioResult {
  scenario: ScenarioName;
  timingsMs: {
    total: number;
    steps: Record<string, number>;
  };
  resultMeta: Record<string, unknown>;
}

function ensurePrisma() {
  if (!prisma) {
    throw new Error("Prisma client is not available");
  }
  return prisma;
}

function payloadBytesApprox(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

async function resolvePerfUser() {
  const current = await getCurrentUser();
  if (current) {
    return current;
  }

  const db = ensurePrisma();
  const firstUser = await db.user.findFirst({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      divisionId: true,
      avatarUrl: true,
    },
    orderBy: { createdAt: "asc" },
  });

  if (!firstUser) {
    throw new Error("No users found for performance scenario");
  }

  return firstUser;
}

async function runHomeFeedScenario(): Promise<Omit<ScenarioResult, "scenario">> {
  const steps: Record<string, number> = {};

  const { result: user, ms: userMs } = await timeAsync(async () => resolvePerfUser());
  steps.user = userMs;

  const { result: feedData, ms: dataMs } = await timeAsync(async () =>
    getHomeFeedData({
      userOverride: {
        id: user.id,
        name: user.name,
        divisionId: user.divisionId,
      },
    })
  );
  steps.data = dataMs;

  if (!feedData) {
    throw new Error("Home feed data is not available");
  }

  const total = Number((Object.values(steps).reduce((acc, value) => acc + value, 0)).toFixed(2));

  return {
    timingsMs: { total, steps },
    resultMeta: {
      items: feedData.contents.length,
      payloadBytesApprox: payloadBytesApprox(feedData),
    },
  };
}

async function runMyPageScenario(): Promise<Omit<ScenarioResult, "scenario">> {
  const steps: Record<string, number> = {};

  const { result: user, ms: userMs } = await timeAsync(async () => resolvePerfUser());
  steps.user = userMs;

  const { result: data, ms: dataMs } = await timeAsync(async () =>
    getMyPageData({ userIdOverride: user.id })
  );
  steps.data = dataMs;

  if (!data) {
    throw new Error("My page data is not available");
  }

  const total = Number((Object.values(steps).reduce((acc, value) => acc + value, 0)).toFixed(2));

  return {
    timingsMs: { total, steps },
    resultMeta: {
      incompleteContents: data.incompleteContents.length,
      payloadBytesApprox: payloadBytesApprox(data),
    },
  };
}

async function runAdminContentsScenario(): Promise<Omit<ScenarioResult, "scenario">> {
  const steps: Record<string, number> = {};

  const { result: contentList, ms: totalMs } = await timeAsync(async () => getAdminContentsData());
  steps.total = totalMs;

  const total = Number(totalMs.toFixed(2));

  return {
    timingsMs: { total, steps },
    resultMeta: {
      items: contentList.length,
      payloadBytesApprox: payloadBytesApprox(contentList),
    },
  };
}

async function runAdminDashboardScenario(): Promise<Omit<ScenarioResult, "scenario">> {
  const steps: Record<string, number> = {};

  const { result: data, ms: totalMs } = await timeAsync(async () => getAdminDashboardData());
  steps.total = totalMs;

  if (!data) {
    throw new Error("Admin dashboard data is not available");
  }

  const total = Number(totalMs.toFixed(2));

  return {
    timingsMs: { total, steps },
    resultMeta: {
      items: data.contentData.length,
      payloadBytesApprox: payloadBytesApprox(data),
    },
  };
}

async function runApiContentsGetScenario(): Promise<Omit<ScenarioResult, "scenario">> {
  const db = ensurePrisma();
  const steps: Record<string, number> = {};

  const { result: data, ms: queryMs } = await timeAsync(async () =>
    db.content.findMany({
      take: 50,
      select: {
        id: true,
        title: true,
        body: true,
        summary: true,
        categoryId: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
        category: {
          select: { id: true, name: true, slug: true, sortOrder: true },
        },
        author: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            divisionId: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            files: true,
            targets: true,
            readLogs: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })
  );
  steps.query = queryMs;

  const total = Number((Object.values(steps).reduce((acc, value) => acc + value, 0)).toFixed(2));

  return {
    timingsMs: { total, steps },
    resultMeta: {
      items: data.length,
      payloadBytesApprox: payloadBytesApprox(data),
    },
  };
}

async function runReadLogsUpsertScenario(): Promise<Omit<ScenarioResult, "scenario">> {
  const db = ensurePrisma();
  const steps: Record<string, number> = {};

  const { result: user, ms: userMs } = await timeAsync(async () => resolvePerfUser());
  steps.user = userMs;

  const { result: content, ms: contentMs } = await timeAsync(async () =>
    db.content.findFirst({
      select: { id: true },
      orderBy: { createdAt: "desc" },
    })
  );
  steps.contentLookup = contentMs;

  if (!content) {
    return {
      timingsMs: {
        total: Number((Object.values(steps).reduce((acc, value) => acc + value, 0)).toFixed(2)),
        steps,
      },
      resultMeta: {
        skipped: true,
        reason: "No content rows available",
      },
    };
  }

  const { ms: upsertMs } = await timeAsync(async () =>
    db.readLog.upsert({
      where: {
        userId_contentId: {
          userId: user.id,
          contentId: content.id,
        },
      },
      update: {
        durationSeconds: { increment: 1 },
      },
      create: {
        userId: user.id,
        contentId: content.id,
        durationSeconds: 1,
      },
    })
  );
  steps.upsert = upsertMs;

  const total = Number((Object.values(steps).reduce((acc, value) => acc + value, 0)).toFixed(2));
  return {
    timingsMs: { total, steps },
    resultMeta: {
      skipped: false,
      userId: user.id,
      contentId: content.id,
    },
  };
}

export const PERF_SCENARIOS: Record<ScenarioName, () => Promise<Omit<ScenarioResult, "scenario">>> = {
  home_feed: runHomeFeedScenario,
  mypage: runMyPageScenario,
  admin_contents: runAdminContentsScenario,
  admin_dashboard: runAdminDashboardScenario,
  api_contents_get: runApiContentsGetScenario,
  readlogs_upsert: runReadLogsUpsertScenario,
};

export function isPerfScenarioName(value: string): value is ScenarioName {
  return value in PERF_SCENARIOS;
}

export async function runPerfScenario(scenario: ScenarioName): Promise<ScenarioResult> {
  const runner = PERF_SCENARIOS[scenario];
  const result = await runner();
  return {
    scenario,
    timingsMs: result.timingsMs,
    resultMeta: result.resultMeta,
  };
}

export const PERF_SCENARIO_NAMES = Object.keys(PERF_SCENARIOS) as ScenarioName[];
