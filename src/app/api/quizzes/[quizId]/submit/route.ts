import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { ok, badRequest, notFound, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { gradeMultipleChoice, gradeShortAnswer } from "@/lib/grading";
import { quizzes, questions, quizAttempts } from "@/lib/mock-db";

interface RouteContext {
  params: { quizId: string };
}

export async function POST(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { quizId } = context.params;
  const body = await request.json();
  const { answers } = body;

  if (!Array.isArray(answers)) {
    return badRequest("answers array is required");
  }

  const isMockMode = process.env.USE_MOCK_DB === "true";

  if (isMockMode) {
    const quiz = quizzes.find((q) => q.id === quizId);
    if (!quiz) return notFound("Quiz not found");

    const quizQuestions = questions
      .filter((q) => q.quizId === quizId)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    let correctCount = 0;
    const gradedAnswers = quizQuestions.map((q) => {
      const userAnswer = answers.find((a: { questionId: string }) => a.questionId === q.id);
      const answerText = userAnswer?.answer ?? "";
      let isCorrect = false;

      if (q.type === "multiple_choice") {
        isCorrect = gradeMultipleChoice(answerText, q.correctAnswer);
      } else {
        isCorrect = gradeShortAnswer(answerText, q.keywords, q.correctAnswer);
      }

      if (isCorrect) correctCount++;

      return {
        questionId: q.id,
        answer: answerText,
        isCorrect,
      };
    });

    const score = Math.round((correctCount / quizQuestions.length) * 100);
    const passed = score >= quiz.passingScore;

    const attempt = {
      id: `attempt-${Date.now()}`,
      quizId,
      userId: user.id,
      score,
      passed,
      completedAt: new Date().toISOString(),
    };
    quizAttempts.push(attempt);

    revalidatePath("/");
    revalidatePath("/mypage");

    return ok({
      ...attempt,
      answers: gradedAnswers,
      totalQuestions: quizQuestions.length,
      correctCount,
    });
  }

  const { prisma } = await import("@/lib/prisma");
  if (!prisma) return notFound("Quiz not found");

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: { orderBy: { sortOrder: "asc" } } },
  });

  if (!quiz) return notFound("Quiz not found");

  let correctCount = 0;
  const gradedAnswers = quiz.questions.map((q) => {
    const userAnswer = answers.find((a: { questionId: string }) => a.questionId === q.id);
    const answerText = userAnswer?.answer ?? "";
    let isCorrect = false;

    if (q.type === "multiple_choice") {
      isCorrect = gradeMultipleChoice(answerText, q.correctAnswer);
    } else {
      isCorrect = gradeShortAnswer(answerText, q.keywords, q.correctAnswer);
    }

    if (isCorrect) correctCount++;

    return {
      questionId: q.id,
      answer: answerText,
      isCorrect,
    };
  });

  const score = Math.round((correctCount / quiz.questions.length) * 100);
  const passed = score >= quiz.passingScore;

  const attempt = await prisma.quizAttempt.create({
    data: {
      quizId,
      userId: user.id,
      score,
      passed,
      answers: {
        create: gradedAnswers,
      },
    },
  });

  revalidatePath("/");
  revalidatePath("/mypage");

  return ok({
    ...attempt,
    answers: gradedAnswers,
    totalQuestions: quiz.questions.length,
    correctCount,
  });
}
