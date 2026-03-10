import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

let jwksWarmupPromise: Promise<void> | null = null;

export async function warmSupabaseJwks(): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) {
    return;
  }

  if (!jwksWarmupPromise) {
    const jwksUrl = `${baseUrl.replace(/\/$/, "")}/auth/v1/.well-known/jwks.json`;
    jwksWarmupPromise = fetch(jwksUrl, {
      cache: "force-cache",
    })
      .then(() => undefined)
      .catch(() => {
        jwksWarmupPromise = null;
      });
  }

  await jwksWarmupPromise;
}

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from Server Component — ignore
          }
        },
      },
    }
  );
}
