import { categories, divisions, teams, users } from "@/lib/mock-db";
import { ContentForm } from "@/components/admin/content-form";

export default async function AdminContentNewPage() {
  const isMockMode = process.env.USE_MOCK_DB === "true";

  if (!isMockMode) {
    const { prisma } = await import("@/lib/prisma");
    if (prisma) {
      const [dbCategories, dbDivisions, dbTeams, dbUsers] = await Promise.all([
        prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
        prisma.division.findMany({ orderBy: { name: "asc" } }),
        prisma.team.findMany({ orderBy: { name: "asc" } }),
        prisma.user.findMany({ orderBy: { name: "asc" } }),
      ]);

      return (
        <ContentForm
          categories={dbCategories}
          divisions={dbDivisions}
          teams={dbTeams}
          users={dbUsers}
        />
      );
    }
  }

  return (
    <ContentForm
      categories={categories}
      divisions={divisions}
      teams={teams}
      users={users}
    />
  );
}
