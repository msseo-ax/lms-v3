import { notFound } from "next/navigation";
import { ContentForm } from "@/components/admin/content-form";
import {
  categories,
  contents,
  contentTargets,
  divisions,
  users,
  quizzes,
  questions,
} from "@/lib/mock-db";
import type { TargetType } from "@/types/domain";

function isValidTargetType(value: string): value is TargetType {
  return value === "all" || value === "division" || value === "user";
}

interface AdminContentEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminContentEditPage({
  params,
}: AdminContentEditPageProps) {
  const { id } = await params;
  const isMockMode = process.env.USE_MOCK_DB === "true";

  if (isMockMode) {
    const content = contents.find((item) => item.id === id);
    if (!content) notFound();

    const targets = contentTargets
      .filter((item) => item.contentId === id)
      .filter((item) => isValidTargetType(item.targetType))
      .map((item) => ({
        targetType: item.targetType as TargetType,
        targetId: item.targetId,
      }));

    const mockQuiz = quizzes.find((q) => q.contentId === id);
    const mockQuizData = mockQuiz
      ? {
          quizId: mockQuiz.id,
          enabled: true,
          passingScore: mockQuiz.passingScore,
          questions: questions
            .filter((q) => q.quizId === mockQuiz.id)
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((q) => ({
              id: q.id,
              type: q.type as "multiple_choice" | "short_answer",
              text: q.text,
              options: q.options ?? ["", "", "", ""],
              correctAnswer: q.correctAnswer,
              keywords: q.keywords ?? [],
            })),
        }
      : undefined;

    return (
        <ContentForm
          categories={categories}
          divisions={divisions}
          users={users}
          mode="edit"
        contentId={content.id}
        initialValues={{
          title: content.title,
          categoryId: content.categoryId,
          body: content.body ?? "",
          targets,
        }}
        initialQuiz={mockQuizData}
      />
    );
  }

  const { prisma } = await import("@/lib/prisma");
  if (!prisma) notFound();

  const [content, dbCategories, dbDivisions, dbUsers] = await Promise.all([
    prisma.content.findUnique({
      where: { id },
      include: {
        targets: true,
        quiz: { include: { questions: { orderBy: { sortOrder: "asc" } } } },
      },
    }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.division.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!content) notFound();

  const quizData = content.quiz
    ? {
        quizId: content.quiz.id,
        enabled: true,
        passingScore: content.quiz.passingScore,
        questions: content.quiz.questions.map((q) => ({
          id: q.id,
          type: q.type as "multiple_choice" | "short_answer",
          text: q.text,
          options: (q.options as string[] | null) ?? ["", "", "", ""],
          correctAnswer: q.correctAnswer,
          keywords: q.keywords ?? [],
        })),
      }
    : undefined;

  return (
    <ContentForm
      categories={dbCategories}
      divisions={dbDivisions}
      users={dbUsers}
      mode="edit"
      contentId={content.id}
      initialValues={{
        title: content.title,
        categoryId: content.categoryId,
        body: content.body ?? "",
        targets: content.targets
          .filter((item) => isValidTargetType(item.targetType))
          .map((item) => ({
            targetType: item.targetType as TargetType,
            targetId: item.targetId,
          })),
      }}
      initialQuiz={quizData}
    />
  );
}
