import {
  contents,
  categories,
  contentFiles,
  getTargetLabels,
  isContentTargetedForUser,
  isContentRead,
  getMockCurrentUser,
} from "@/lib/mock-db";
import type { ContentWithMeta } from "@/types/domain";
import { FeedFilters } from "@/components/content/feed-filters";
import { getCurrentUser } from "@/lib/auth";
import {
  getTargetLabels as getTargetLabelsFromData,
  isTargetedForUser,
} from "@/lib/targeting";

export default async function HomePage() {
  const isMockMode = process.env.USE_MOCK_DB === "true";

  if (isMockMode) {
    const currentUser = getMockCurrentUser();

    const feedData: ContentWithMeta[] = contents
      .map((c) => {
        const category = categories.find((cat) => cat.id === c.categoryId);
        const fileCount = contentFiles.filter(
          (f) => f.contentId === c.id
        ).length;
        const targetLabels = getTargetLabels(c.id);
        const isTargeted = isContentTargetedForUser(c.id, currentUser);
        const isRead = isContentRead(c.id, currentUser.id);

        return {
          ...c,
          isRead,
          isTargeted,
          fileCount,
          targetLabels,
          category,
        } satisfies ContentWithMeta;
      })
      .sort((a, b) => {
        if (a.isTargeted !== b.isTargeted) return a.isTargeted ? -1 : 1;
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });

    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold tracking-tight">학습 피드</h1>
        <FeedFilters contents={feedData} categories={categories} />
      </div>
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const { prisma } = await import("@/lib/prisma");
  if (!prisma) {
    return null;
  }

  const [dbContents, dbCategories, dbDivisions, dbTeams, dbUsers] = await Promise.all([
    prisma.content.findMany({
      include: {
        files: true,
        targets: true,
        readLogs: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.division.findMany({ select: { id: true, name: true } }),
    prisma.team.findMany({ select: { id: true, name: true } }),
    prisma.user.findMany({
      select: { id: true, name: true, divisionId: true, teamId: true },
    }),
  ]);

  const feedData: ContentWithMeta[] = dbContents
    .map((content) => {
      const category = dbCategories.find((item) => item.id === content.categoryId);
      const isRead = content.readLogs.some((log) => log.userId === user.id);
      const isTargeted = isTargetedForUser(content.targets, user);

      return {
        id: content.id,
        title: content.title,
        body: content.body,
        summary: content.summary,
        summaryType: content.summaryType,
        categoryId: content.categoryId,
        createdBy: content.createdBy,
        createdAt: content.createdAt.toISOString(),
        updatedAt: content.updatedAt.toISOString(),
        category: category
          ? {
              id: category.id,
              name: category.name,
              slug: category.slug,
              sortOrder: category.sortOrder,
            }
          : undefined,
        isRead,
        isTargeted,
        fileCount: content.files.length,
        targetLabels: getTargetLabelsFromData(
          content.targets,
          dbDivisions,
          dbTeams,
          dbUsers
        ),
      } satisfies ContentWithMeta;
    })
    .sort((a, b) => {
      if (a.isTargeted !== b.isTargeted) return a.isTargeted ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">학습 피드</h1>
      <FeedFilters
        contents={feedData}
        categories={dbCategories.map((category) => ({
          id: category.id,
          name: category.name,
          slug: category.slug,
          sortOrder: category.sortOrder,
        }))}
      />
    </div>
  );
}
