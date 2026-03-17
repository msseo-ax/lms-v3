import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  contents,
  contentFiles,
  categories,
  users,
  getTargetLabels,
  getQuizForContent,
  quizAttempts,
  getMockCurrentUser,
} from "@/lib/mock-db";
import { ContentViewer } from "@/components/content/content-viewer";
import { getTargetLabels as getTargetLabelsFromData } from "@/lib/targeting";
import { getCurrentUserFromMiddlewareHeader } from "@/lib/auth";

interface ContentDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: ContentDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const isMockMode = process.env.USE_MOCK_DB === "true";

  if (isMockMode) {
    const content = contents.find((c) => c.id === id);
    if (!content) return {};
    return {
      title: content.title,
      description: content.summary ?? undefined,
    };
  }

  const { prisma } = await import("@/lib/prisma");
  if (!prisma) return {};

  const content = await prisma.content.findUnique({
    where: { id },
    select: { title: true, summary: true },
  });

  if (!content) return {};
  return {
    title: content.title,
    description: content.summary ?? undefined,
  };
}

export default async function ContentDetailPage({
  params,
}: ContentDetailPageProps) {
  const { id } = await params;

  const isMockMode = process.env.USE_MOCK_DB === "true";

  if (isMockMode) {
    const content = contents.find((c) => c.id === id);
    if (!content) redirect("/");

    const category = categories.find((c) => c.id === content.categoryId)!;
    const author = users.find((u) => u.id === content.createdBy)!;
    const files = contentFiles.filter((f) => f.contentId === content.id);
    const targetLabels = getTargetLabels(content.id);

    const currentUser = getMockCurrentUser();
    const quiz = getQuizForContent(content.id);
    const quizProp = quiz
      ? {
          id: quiz.id,
          passingScore: quiz.passingScore,
          lastAttempt: (() => {
            const attempts = quizAttempts
              .filter((a) => a.quizId === quiz.id && a.userId === currentUser.id)
              .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
            return attempts.length > 0 ? { score: attempts[0].score, passed: attempts[0].passed } : null;
          })(),
        }
      : null;

    return (
      <ContentViewer
        content={content}
        category={category}
        author={author}
        files={files}
        targetLabels={targetLabels}
        quiz={quizProp}
      />
    );
  }

  const { prisma } = await import("@/lib/prisma");
  if (!prisma) redirect("/");

  const authUser = await getCurrentUserFromMiddlewareHeader();

  const content = await prisma.content.findUnique({
    where: { id },
    include: {
      category: true,
      author: true,
      files: true,
      targets: true,
      quiz: {
        include: {
          attempts: authUser
            ? {
                where: { userId: authUser.id },
                orderBy: { completedAt: "desc" as const },
                take: 1,
                select: { score: true, passed: true },
              }
            : false,
        },
      },
    },
  });

  if (!content || !content.category || !content.author) {
    redirect("/");
  }

  const [dbDivisions, dbUsers] = await Promise.all([
    prisma.division.findMany({ select: { id: true, name: true } }),
    prisma.user.findMany({ select: { id: true, name: true } }),
  ]);

  const targetLabels = getTargetLabelsFromData(
    content.targets,
    dbDivisions,
    dbUsers
  );

  const quizProp = content.quiz
    ? {
        id: content.quiz.id,
        passingScore: content.quiz.passingScore,
        lastAttempt: content.quiz.attempts?.[0]
          ? { score: content.quiz.attempts[0].score, passed: content.quiz.attempts[0].passed }
          : null,
      }
    : null;

  return (
    <ContentViewer
      content={{
        id: content.id,
        title: content.title,
        body: content.body,
        summary: content.summary,
        categoryId: content.categoryId,
        createdBy: content.createdBy,
        createdAt: content.createdAt.toISOString(),
        updatedAt: content.updatedAt.toISOString(),
      }}
      category={{
        id: content.category.id,
        name: content.category.name,
        slug: content.category.slug,
        sortOrder: content.category.sortOrder,
      }}
      author={{
        id: content.author.id,
        email: content.author.email,
        name: content.author.name,
        role: content.author.role,
        divisionId: content.author.divisionId,
        teamId: content.author.teamId,
        avatarUrl: content.author.avatarUrl,
      }}
      files={content.files.map((file) => ({
        id: file.id,
        contentId: file.contentId,
        fileUrl: file.fileUrl,
        fileType: file.fileType,
        fileName: file.fileName,
        fileSize: file.fileSize,
      }))}
      targetLabels={targetLabels}
      quiz={quizProp}
    />
  );
}
