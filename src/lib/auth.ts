import type { User } from "@/types/domain";
import { getMockCurrentUser } from "@/lib/mock-db";

const isMockMode = process.env.USE_MOCK_DB === "true";

export async function getCurrentUser(): Promise<User | null> {
  if (isMockMode) {
    return getMockCurrentUser();
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser?.email) return null;

  const { prisma } = await import("@/lib/prisma");
  if (!prisma) return null;

  const dbUser = await prisma.user.findUnique({
    where: { email: authUser.email },
    include: { division: true, team: true },
  });

  if (!dbUser) return null;

  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role,
    divisionId: dbUser.divisionId,
    teamId: dbUser.teamId,
    avatarUrl: dbUser.avatarUrl,
    division: dbUser.division ? { id: dbUser.division.id, name: dbUser.division.name } : null,
    team: dbUser.team ? { id: dbUser.team.id, name: dbUser.team.name, divisionId: dbUser.team.divisionId } : null,
  };
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "admin") throw new Error("FORBIDDEN");
  return user;
}

export function resolveRole(email: string): "admin" | "user" {
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase()) ? "admin" : "user";
}
