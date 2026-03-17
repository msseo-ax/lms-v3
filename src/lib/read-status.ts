export type ReadStatus = "unread" | "reading" | "completed";

export function computeReadStatus(params: {
  hasReadLog: boolean;
  hasQuiz: boolean;
  hasPassedQuiz: boolean;
}): ReadStatus {
  if (!params.hasReadLog) return "unread";
  if (!params.hasQuiz) return "completed";
  if (params.hasPassedQuiz) return "completed";
  return "reading";
}
