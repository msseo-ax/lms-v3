import { NextRequest } from "next/server";
import { badRequest, notFound, ok, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { categories } from "@/lib/mock-db";

interface RouteContext {
  params: { id: string };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string) {
  return UUID_RE.test(value);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return unauthorized();

  const { id } = context.params;
  const body = await request.json();
  const { name, slug, sortOrder } = body;

  if (!name || !slug) {
    return badRequest("name and slug are required");
  }

  const isMockMode = process.env.USE_MOCK_DB === "true";

  if (isMockMode) {
    const index = categories.findIndex((category) => category.id === id);
    if (index < 0) return notFound("Category not found");

    categories[index] = {
      ...categories[index],
      name,
      slug,
      sortOrder: typeof sortOrder === "number" ? sortOrder : categories[index].sortOrder,
    };

    return ok(categories[index]);
  }

  if (!isUuid(id)) return badRequest("Invalid category id");

  const { prisma } = await import("@/lib/prisma");
  if (!prisma) return notFound("Category not found");

  try {
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) return notFound("Category not found");

    const category = await prisma.category.update({
      where: { id },
      data: {
        name,
        slug,
        sortOrder: typeof sortOrder === "number" ? sortOrder : existing.sortOrder,
      },
    });

    return ok(category);
  } catch (e) {
    console.error("Failed to update category", e);
    return badRequest("Failed to update category");
  }
}

export async function DELETE(_: NextRequest, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return unauthorized();

  const { id } = context.params;
  const isMockMode = process.env.USE_MOCK_DB === "true";

  if (isMockMode) {
    const index = categories.findIndex((category) => category.id === id);
    if (index < 0) return notFound("Category not found");
    categories.splice(index, 1);
    return ok({ success: true });
  }

  if (!isUuid(id)) return badRequest("Invalid category id");

  const { prisma } = await import("@/lib/prisma");
  if (!prisma) return notFound("Category not found");

  try {
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) return notFound("Category not found");

    await prisma.category.delete({ where: { id } });
    return ok({ success: true });
  } catch (e) {
    console.error("Failed to delete category", e);
    return badRequest("Failed to delete category");
  }
}
