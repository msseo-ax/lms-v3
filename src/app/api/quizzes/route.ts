import { NextRequest } from "next/server";
import { ok, badRequest, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { quizzes, questions } from "@/lib/mock-db";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return unauthorized();

  const body = await request.json();
  const { contentId, passingScore = 100, questions: questionData } = body;

  if (!contentId) return badRequest("contentId is required");
  if (!Array.isArray(questionData) || questionData.length === 0) {
    return badRequest("questions array is required");
  }

  const isMockMode = process.env.USE_MOCK_DB === "true";

  if (isMockMode) {
    const existing = quizzes.find((q) => q.contentId === contentId);
    if (existing) return badRequest("Quiz already exists for this content");

    const quizId = `quiz-${Date.now()}`;
    const newQuiz = { id: quizId, contentId, passingScore };
    quizzes.push(newQuiz);

    for (let i = 0; i < questionData.length; i++) {
      const q = questionData[i];
      questions.push({
        id: `q-${Date.now()}-${i}`,
        quizId,
        type: q.type,
        text: q.text,
        options: q.options ?? null,
        correctAnswer: q.correctAnswer,
        keywords: q.keywords ?? [],
        sortOrder: i,
      });
    }

    return ok({ ...newQuiz, questions: questions.filter((q) => q.quizId === quizId) });
  }

  const { prisma } = await import("@/lib/prisma");
  if (!prisma) return ok(null);

  try {
    const quiz = await prisma.quiz.create({
      data: {
        contentId,
        passingScore,
        questions: {
          create: questionData.map(
            (q: { type: string; text: string; options?: string[]; correctAnswer: string; keywords?: string[] }, i: number) => ({
              type: q.type as "multiple_choice" | "short_answer",
              text: q.text,
              options: q.options ?? undefined,
              correctAnswer: q.correctAnswer,
              keywords: q.keywords ?? [],
              sortOrder: i,
            })
          ),
        },
      },
      include: { questions: { orderBy: { sortOrder: "asc" } } },
    });

    return ok(quiz);
  } catch (e) {
    console.error("Failed to create quiz", e);
    return badRequest("Failed to create quiz");
  }
}
