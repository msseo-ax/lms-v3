import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { resolveRole } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.email) {
        const allowedDomain = process.env.GOOGLE_ALLOWED_DOMAIN?.trim().toLowerCase();
        const emailDomain = user.email.split("@")[1]?.toLowerCase();

        if (allowedDomain && emailDomain !== allowedDomain) {
          await supabase.auth.signOut();
          return NextResponse.redirect(
            `${origin}/login?error=domain&message=회사 계정으로 로그인해주세요`
          );
        }

        try {
          const { prisma } = await import("@/lib/prisma");
          if (prisma) {
            await prisma.user.upsert({
              where: { email: user.email },
              update: {
                name: user.user_metadata?.full_name ?? user.email.split("@")[0],
                role: resolveRole(user.email),
                avatarUrl: user.user_metadata?.avatar_url ?? null,
              },
              create: {
                email: user.email,
                name: user.user_metadata?.full_name ?? user.email.split("@")[0],
                role: resolveRole(user.email),
                avatarUrl: user.user_metadata?.avatar_url ?? null,
              },
            });
          }
        } catch {
          /* DB sync is best-effort */
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
