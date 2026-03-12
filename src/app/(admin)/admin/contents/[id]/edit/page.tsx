import { notFound } from "next/navigation";
import { ContentForm } from "@/components/admin/content-form";
import {
  categories,
  contents,
  contentTargets,
  divisions,
  users,
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
          summary: content.summary ?? "",
          targets,
        }}
      />
    );
  }

  const { prisma } = await import("@/lib/prisma");
  if (!prisma) notFound();

  const [content, dbCategories, dbDivisions, dbUsers] = await Promise.all([
    prisma.content.findUnique({
      where: { id },
      include: { targets: true },
    }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.division.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!content) notFound();

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
        summary: content.summary ?? "",
        targets: content.targets
          .filter((item) => isValidTargetType(item.targetType))
          .map((item) => ({
            targetType: item.targetType as TargetType,
            targetId: item.targetId,
          })),
      }}
    />
  );
}
