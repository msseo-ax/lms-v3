#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const DEFAULT_SCENARIOS = [
  "home_feed",
  "mypage",
  "admin_contents",
  "admin_dashboard",
  "api_contents_get",
  "readlogs_upsert",
];

function parseArgs(argv) {
  const args = {
    mode: "baseline",
    scenarios: DEFAULT_SCENARIOS,
    samples: 15,
    token: process.env.PERF_TOKEN || "devtoken",
    host: "localhost",
    portStart: 3100,
    portEnd: 3199,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];

    if (value === "--mode") {
      args.mode = argv[i + 1] || args.mode;
      i += 1;
      continue;
    }

    if (value === "--scenarios") {
      args.scenarios = (argv[i + 1] || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      i += 1;
      continue;
    }

    if (value === "--samples") {
      const parsed = Number(argv[i + 1]);
      if (Number.isFinite(parsed) && parsed > 0) {
        args.samples = parsed;
      }
      i += 1;
      continue;
    }

    if (value === "--token") {
      args.token = argv[i + 1] || args.token;
      i += 1;
      continue;
    }

    if (value === "--target") {
      const target = argv[i + 1] || "";
      if (target) {
        const url = new URL(target);
        args.host = url.hostname;
      }
      i += 1;
      continue;
    }

    if (value === "--port-start") {
      args.portStart = Number(argv[i + 1]) || args.portStart;
      i += 1;
      continue;
    }

    if (value === "--port-end") {
      args.portEnd = Number(argv[i + 1]) || args.portEnd;
      i += 1;
    }
  }

  return args;
}

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return Number(sorted[index].toFixed(2));
}

function average(values) {
  if (values.length === 0) return 0;
  return Number((values.reduce((acc, value) => acc + value, 0) / values.length).toFixed(2));
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function isPortOpen(port, host) {
  return new Promise((resolve) => {
    const socket = createServer();
    socket.once("error", () => resolve(false));
    socket.once("listening", () => {
      socket.close(() => resolve(true));
    });
    socket.listen(port, host);
  });
}

async function findFreePort(start, end, host) {
  for (let port = start; port <= end; port += 1) {
    const available = await isPortOpen(port, host);
    if (available) {
      return port;
    }
  }

  throw new Error(`No free port found in range ${start}-${end}`);
}

async function waitUntilReady(baseUrl, timeoutMs) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/api/categories`);
      if (response.ok) {
        return;
      }
    } catch {
      // Wait and retry
    }

    await sleep(700);
  }

  throw new Error("Timed out waiting for dev server readiness");
}

async function runScenario(baseUrl, token, scenario, samples) {
  const totals = [];
  const requestMs = [];
  const payloads = [];

  for (let i = 0; i < samples; i += 1) {
    const started = performance.now();
    const response = await fetch(
      `${baseUrl}/api/perf?token=${encodeURIComponent(token)}&scenario=${encodeURIComponent(scenario)}`
    );
    const elapsed = Number((performance.now() - started).toFixed(2));

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Scenario ${scenario} failed (${response.status}): ${body}`);
    }

    const json = await response.json();
    totals.push(Number(json?.timingsMs?.total || 0));
    requestMs.push(elapsed);
    payloads.push(Number(json?.resultMeta?.payloadBytesApprox || 0));
  }

  return {
    samples,
    totalMs: {
      p50: percentile(totals, 50),
      p95: percentile(totals, 95),
      avg: average(totals),
    },
    requestMs: {
      p50: percentile(requestMs, 50),
      p95: percentile(requestMs, 95),
      avg: average(requestMs),
    },
    payloadBytesApprox: {
      p50: percentile(payloads, 50),
      p95: percentile(payloads, 95),
      avg: average(payloads),
    },
  };
}

async function readJsonIfExists(path) {
  try {
    const text = await readFile(path, "utf8");
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function buildDiff(baseline, after) {
  const diff = {};
  const scenarios = Object.keys(after.scenarios || {});
  for (const scenario of scenarios) {
    const before = baseline?.scenarios?.[scenario]?.totalMs?.p95;
    const now = after?.scenarios?.[scenario]?.totalMs?.p95;
    if (!Number.isFinite(before) || !Number.isFinite(now)) {
      continue;
    }
    const improvementPct = Number((((before - now) / before) * 100).toFixed(2));
    diff[scenario] = {
      baselineP95: before,
      afterP95: now,
      improvementPct,
      pass: now <= before * 0.6 || now <= 700,
    };
  }
  return diff;
}

function printSummary(result) {
  console.log(`Mode: ${result.mode}`);
  console.log(`Port: ${result.port}`);
  for (const [scenario, metrics] of Object.entries(result.scenarios)) {
    console.log(
      `${scenario} | total p95=${metrics.totalMs.p95}ms | request p95=${metrics.requestMs.p95}ms | payload p95=${metrics.payloadBytesApprox.p95}B`
    );
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.scenarios.length) {
    throw new Error("No scenarios specified");
  }

  const evidenceDir = join(process.cwd(), ".sisyphus", "evidence");
  await mkdir(evidenceDir, { recursive: true });

  const port = await findFreePort(args.portStart, args.portEnd, args.host);
  const baseUrl = `http://${args.host}:${port}`;

  const env = {
    ...process.env,
    USE_MOCK_DB: "false",
    PERF_TOKEN: args.token,
    NEXT_TELEMETRY_DISABLED: "1",
  };

  const child = spawn("npm", ["run", "dev", "--", "-p", String(port)], {
    cwd: process.cwd(),
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", (chunk) => {
    process.stdout.write(chunk);
  });
  child.stderr.on("data", (chunk) => {
    process.stderr.write(chunk);
  });

  try {
    await waitUntilReady(baseUrl, 120000);

    const scenarios = {};
    for (const scenario of args.scenarios) {
      scenarios[scenario] = await runScenario(baseUrl, args.token, scenario, args.samples);
    }

    const result = {
      mode: args.mode,
      host: args.host,
      port,
      samples: args.samples,
      scenarios,
      measuredAt: new Date().toISOString(),
    };

    const baselinePath = join(evidenceDir, "perf-baseline.json");
    const afterPath = join(evidenceDir, "perf-after.json");
    const diffPath = join(evidenceDir, "perf-diff.json");

    if (args.mode === "baseline") {
      await writeFile(baselinePath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    } else {
      await writeFile(afterPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
      const baseline = await readJsonIfExists(baselinePath);
      if (baseline) {
        const diff = {
          measuredAt: new Date().toISOString(),
          scenarios: buildDiff(baseline, result),
        };
        await writeFile(diffPath, `${JSON.stringify(diff, null, 2)}\n`, "utf8");

        const failures = Object.entries(diff.scenarios)
          .filter(([, scenarioDiff]) => !scenarioDiff.pass)
          .map(([name]) => name);

        if (failures.length > 0) {
          throw new Error(`Performance thresholds not met: ${failures.join(", ")}`);
        }
      }
    }

    printSummary(result);
  } finally {
    child.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
