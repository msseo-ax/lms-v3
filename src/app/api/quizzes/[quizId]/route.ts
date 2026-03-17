import { NextRequest } from "next/server";
import { ok, badRequest, notFound, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { quizzes, questions } from "@/lib/mock-db";

interface RouteContext {
  params: { quizId: string };
}

export async function GET(_: NextRequest, context: RouteContext) {
  const { quizId } = context.params;
  const isMockMode = process.env.USE_MOCK_DB === "true";

  if (isMockMode) {
    const quiz = quizzes.find((q) => q.id === quizId);
    if (!quiz) return notFound("Quiz not found");
    return ok({
      ...quiz,
      questions: questions.filter((q) => q.quizId === quizId).sort((a, b) => a.sortOrder - b.sortOrder),
    });
  }

  const { prisma } = await import("@/lib/prisma");
  if (!prisma) return notFound("Quiz not found");

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: { orderBy: { sortOrder: "asc" } } },
  });

  if (!quiz) return notFound("Quiz not found");
  return ok(quiz);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return unauthorized();

  const { quizId } = context.params;
  const body = await request.json();
  const { passingScore, questions: questionData } = body;

  const isMockMode = process.env.USE_MOCK_DB === "true";

  if (isMockMode) {
    const quiz = quizzes.find((q) => q.id === quizId);
    if (!quiz) return notFound("Quiz not found");

    if (passingScore !== undefined) quiz.passingScore = passingScore;

    if (Array.isArray(questionData)) {
      // Remove existing questions
      for (let i = questions.length - 1; i >= 0; i--) {
        if (questions[i].quizId === quizId) questions.splice(i, 1);
      }
      // Add new ones
      for (let i = 0; i < questionData.length; i++) {
        const q = questionData[i];
        questions.push({
          id: q.id ?? `q-${Date.now()}-${i}`,
          quizId,
          type: q.type,
          text: q.text,
          options: q.options ?? null,
          correctAnswer: q.correctAnswer,
          keywords: q.keywords ?? [],
          sortOrder: i,
        });
      }
    }

    return ok({
      ...quiz,
      questions: questions.filter((q) => q.quizId === quizId),
    });
  }

  const { prisma } = await import("@/lib/prisma");
  if (!prisma) return notFound("Quiz not found");

  try {
    const updateData: Record<string, unknown> = {};
    if (passingScore !== undefined) updateData.passingScore = passingScore;

    if (Array.isArray(questionData)) {
      updateData.questions = {
        deleteMany: {},
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
      };
    }

    const quiz = await prisma.quiz.update({
      where: { id: quizId },
      data: updateData,
      include: { questions: { orderBy: { sortOrder: "asc" } } },
    });

    return ok(quiz);
  } catch (e) {
    console.error("Failed to update quiz", e);
    return badRequest("Failed to update quiz");
  }
}

export async function DELETE(_: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return unauthorized();

  const { quizId } = context.params;
  const isMockMode = process.env.USE_MOCK_DB === "true";

  if (isMockMode) {
    const idx = quizzes.findIndex((q) => q.id === quizId);
    if (idx < 0) return notFound("Quiz not found");
    quizzes.splice(idx, 1);

    for (let i = questions.length - 1; i >= 0; i--) {
      if (questions[i].quizId === quizId) questions.splice(i, 1);
    }

    return ok({ success: true });
  }

  const { prisma } = await import("@/lib/prisma");
  if (!prisma) return notFound("Quiz not found");

  try {
    await prisma.quiz.delete({ where: { id: quizId } });
    return ok({ success: true });
  } catch (e) {
    console.error("Failed to delete quiz", e);
    return badRequest("Failed to delete quiz");
  }
}
