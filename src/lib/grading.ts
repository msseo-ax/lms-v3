export function gradeMultipleChoice(answer: string, correctAnswer: string): boolean {
  return answer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
}

export function gradeShortAnswer(
  answer: string,
  keywords: string[],
  correctAnswer?: string,
): boolean {
  const normalized = answer.trim().toLowerCase();
  if (!normalized) return false;

  // Exact match with correctAnswer
  if (correctAnswer && normalized === correctAnswer.trim().toLowerCase()) {
    return true;
  }

  // Keyword matching
  if (keywords.length > 0) {
    return keywords.some((kw) => normalized.includes(kw.trim().toLowerCase()));
  }

  return false;
}
