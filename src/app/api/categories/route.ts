import { NextRequest } from "next/server";
import { ok, badRequest, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { categories } from "@/lib/mock-db";

export async function GET() {
  const isMockMode = process.env.USE_MOCK_DB === "true";

  if (isMockMode) {
    return ok(categories);
  }

  const { prisma } = await import("@/lib/prisma");
  if (!prisma) return ok([]);

  const data = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return ok(data);
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return unauthorized();

  const body = await request.json();
  const { name, slug } = body;

  if (!name || !slug) return badRequest("name and slug are required");

  const isMockMode = process.env.USE_MOCK_DB === "true";

  if (isMockMode) {
    const newCategory = {
      id: `cat-${Date.now()}`,
      name,
      slug,
      sortOrder: categories.length + 1,
    };
    categories.push(newCategory);
    return ok(newCategory);
  }

  const { prisma } = await import("@/lib/prisma");
  if (!prisma) return ok(null);

  const category = await prisma.category.create({
    data: {
      name,
      slug,
      sortOrder: (await prisma.category.count()) + 1,
    },
  });

  return ok(category);
}
