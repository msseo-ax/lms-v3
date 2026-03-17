import { NextRequest } from "next/server";
import { ok, notFound, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { quizzes, questions } from "@/lib/mock-db";

interface RouteContext {
  params: { quizId: string };
}

export async function GET(_: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { quizId } = context.params;
  const isMockMode = process.env.USE_MOCK_DB === "true";

  if (isMockMode) {
    const quiz = quizzes.find((q) => q.id === quizId);
    if (!quiz) return notFound("Quiz not found");

    const quizQuestions = questions
      .filter((q) => q.quizId === quizId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((q) => ({
        id: q.id,
        type: q.type,
        text: q.text,
        options: q.options,
        sortOrder: q.sortOrder,
      }));

    return ok({
      id: quiz.id,
      contentId: quiz.contentId,
      passingScore: quiz.passingScore,
      questions: quizQuestions,
    });
  }

  const { prisma } = await import("@/lib/prisma");
  if (!prisma) return notFound("Quiz not found");

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          type: true,
          text: true,
          options: true,
          sortOrder: true,
        },
      },
    },
  });

  if (!quiz) return notFound("Quiz not found");

  return ok({
    id: quiz.id,
    contentId: quiz.contentId,
    passingScore: quiz.passingScore,
    questions: quiz.questions,
  });
}
