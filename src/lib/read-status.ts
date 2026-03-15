export type ReadStatus = "unread" | "reading" | "completed";

export function computeReadStatus(params: {
  hasReadLog: boolean;
  durationSeconds: number;
  minDurationSeconds: number;
  requireFileAccess: boolean;
  hasFileAccess: boolean;
}): ReadStatus {
  if (!params.hasReadLog) return "unread";

  const durationMet = params.durationSeconds >= params.minDurationSeconds;
  const fileAccessMet = !params.requireFileAccess || params.hasFileAccess;

  if (durationMet && fileAccessMet) return "completed";
  return "reading";
}

export function computeMinDuration(bodyHtml: string | null): number {
  if (!bodyHtml) return 10;
  const text = bodyHtml.replace(/<[^>]*>/g, "");
  const raw = Math.round((text.length / 100) * 10);
  return Math.min(300, Math.max(10, raw));
}
