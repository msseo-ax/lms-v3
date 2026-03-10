import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const isMockMode = process.env.USE_MOCK_DB === "true";

export async function middleware(request: NextRequest) {
  const withPerfTiming = process.env.PERF_TIMING === "1";
  const startedAt = withPerfTiming ? performance.now() : 0;

  function applyPerfTiming(response: NextResponse) {
    if (!withPerfTiming) {
      return response;
    }

    const duration = Number((performance.now() - startedAt).toFixed(2));
    const currentValue = response.headers.get("Server-Timing");
    const nextValue = `mw;dur=${duration}`;
    response.headers.set("Server-Timing", currentValue ? `${currentValue}, ${nextValue}` : nextValue);
    response.headers.set("X-Middleware-Timing", String(duration));
    return response;
  }

  if (isMockMode) {
    if (request.nextUrl.pathname === "/login") {
      return applyPerfTiming(NextResponse.redirect(new URL("/", request.url)));
    }
    return applyPerfTiming(NextResponse.next());
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginPage = request.nextUrl.pathname === "/login";
  const isAuthCallback = request.nextUrl.pathname.startsWith("/auth/");

  if (!user && !isLoginPage && !isAuthCallback) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return applyPerfTiming(NextResponse.redirect(url));
  }

  if (user && isLoginPage) {
    return applyPerfTiming(NextResponse.redirect(new URL("/", request.url)));
  }

  return applyPerfTiming(supabaseResponse);
}

export const config = {
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon.ico|mock/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
