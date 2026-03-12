import { redirect } from "next/navigation";
import {
  contents,
  contentFiles,
  categories,
  users,
  getTargetLabels,
} from "@/lib/mock-db";
import { ContentViewer } from "@/components/content/content-viewer";
import { getTargetLabels as getTargetLabelsFromData } from "@/lib/targeting";

interface ContentDetailPageProps {
  params: Promise<{ id: string }>;
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

    return (
      <ContentViewer
        content={content}
        category={category}
        author={author}
        files={files}
        targetLabels={targetLabels}
      />
    );
  }

  const { prisma } = await import("@/lib/prisma");
  if (!prisma) redirect("/");

  const content = await prisma.content.findUnique({
    where: { id },
    include: {
      category: true,
      author: true,
      files: true,
      targets: true,
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
    />
  );
}
