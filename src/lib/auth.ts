import type { User } from "@/types/domain";
import { getMockCurrentUser } from "@/lib/mock-db";
import { cache } from "react";
import { headers } from "next/headers";

const isMockMode = process.env.USE_MOCK_DB === "true";

async function getCurrentUserInternal(): Promise<User | null> {
  if (isMockMode) {
    return getMockCurrentUser();
  }

  const { createClient, warmSupabaseJwks } = await import("@/lib/supabase/server");
  const { warmPrismaConnection } = await import("@/lib/prisma");

  const warmupPromise = Promise.all([warmSupabaseJwks(), warmPrismaConnection()]);
  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || !claimsData?.claims) return null;

  const claimEmail = claimsData.claims.email;
  if (typeof claimEmail !== "string" || !claimEmail) return null;

  await warmupPromise;

  const { prisma } = await import("@/lib/prisma");
  if (!prisma) return null;

  const dbUser = await prisma.user.findUnique({
    where: { email: claimEmail },
    include: { division: true },
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
  };
}

export const getCurrentUser = cache(getCurrentUserInternal);

async function getCurrentUserFromMiddlewareHeaderInternal(): Promise<User | null> {
  if (isMockMode) {
    return getMockCurrentUser();
  }

  const headerStore = await headers();
  const userId = headerStore.get("x-auth-user-id");
  const email = headerStore.get("x-auth-user-email");

  if (!userId || !email) {
    return getCurrentUser();
  }

  const { prisma, warmPrismaConnection } = await import("@/lib/prisma");
  await warmPrismaConnection();
  if (!prisma) return null;

  const dbUser = await prisma.user.findUnique({
    where: { email },
    include: { division: true },
  });

  if (!dbUser || dbUser.id !== userId) {
    return getCurrentUser();
  }

  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role,
    divisionId: dbUser.divisionId,
    teamId: dbUser.teamId,
    avatarUrl: dbUser.avatarUrl,
    division: dbUser.division ? { id: dbUser.division.id, name: dbUser.division.name } : null,
  };
}

export const getCurrentUserFromMiddlewareHeader = cache(getCurrentUserFromMiddlewareHeaderInternal);

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
