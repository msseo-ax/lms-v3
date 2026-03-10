export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { badRequest, notFound, ok, unauthorized } from "@/lib/api";

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return notFound();
  }

  const configuredToken = process.env.PERF_TOKEN;
  if (!configuredToken) {
    return badRequest("PERF_TOKEN is not configured");
  }

  const token = request.nextUrl.searchParams.get("token");
  if (token !== configuredToken) {
    return unauthorized();
  }

  const { isPerfScenarioName, PERF_SCENARIO_NAMES, runPerfScenario } = await import("@/lib/perf/scenarios");

  const scenario = request.nextUrl.searchParams.get("scenario");
  if (!scenario) {
    return badRequest(`scenario is required (${PERF_SCENARIO_NAMES.join(", ")})`);
  }

  if (!isPerfScenarioName(scenario)) {
    return badRequest(`invalid scenario (${PERF_SCENARIO_NAMES.join(", ")})`);
  }

  try {
    const data = await runPerfScenario(scenario);
    return ok(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to run perf scenario";
    return badRequest(message);
  }
}
