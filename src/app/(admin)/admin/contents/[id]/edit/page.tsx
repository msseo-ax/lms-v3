import { notFound } from "next/navigation";
import { ContentForm } from "@/components/admin/content-form";
import {
  categories,
  contents,
  contentTargets,
  divisions,
  teams,
  users,
} from "@/lib/mock-db";
import type { SummaryType, TargetType } from "@/types/domain";

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
      .map((item) => ({
        targetType: item.targetType as TargetType,
        targetId: item.targetId,
      }));

    return (
      <ContentForm
        categories={categories}
        divisions={divisions}
        teams={teams}
        users={users}
        mode="edit"
        contentId={content.id}
        initialValues={{
          title: content.title,
          categoryId: content.categoryId,
          body: content.body ?? "",
          summary: content.summary ?? "",
          summaryType: content.summaryType as SummaryType,
          targets,
        }}
      />
    );
  }

  const { prisma } = await import("@/lib/prisma");
  if (!prisma) notFound();

  const [content, dbCategories, dbDivisions, dbTeams, dbUsers] = await Promise.all([
    prisma.content.findUnique({
      where: { id },
      include: { targets: true },
    }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.division.findMany({ orderBy: { name: "asc" } }),
    prisma.team.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!content) notFound();

  return (
    <ContentForm
      categories={dbCategories}
      divisions={dbDivisions}
      teams={dbTeams}
      users={dbUsers}
      mode="edit"
      contentId={content.id}
      initialValues={{
        title: content.title,
        categoryId: content.categoryId,
        body: content.body ?? "",
        summary: content.summary ?? "",
        summaryType: content.summaryType as SummaryType,
        targets: content.targets.map((item) => ({
          targetType: item.targetType as TargetType,
          targetId: item.targetId,
        })),
      }}
    />
  );
}
