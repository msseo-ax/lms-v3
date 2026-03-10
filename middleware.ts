import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const isMockMode = process.env.USE_MOCK_DB === "true";

export async function middleware(request: NextRequest) {
  const withPerfTiming = process.env.PERF_TIMING === "1";
  const startedAt = withPerfTiming ? performance.now() : 0;
  const requestHeaders = new Headers(request.headers);

  requestHeaders.delete("x-auth-user-id");
  requestHeaders.delete("x-auth-user-email");

  function createNextResponse() {
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  const responseCookies: Array<{
    name: string;
    value: string;
    options?: Parameters<NextResponse["cookies"]["set"]>[2];
  }> = [];

  function queueResponseCookies(
    cookiesToSet: Array<{
      name: string;
      value: string;
      options?: Parameters<NextResponse["cookies"]["set"]>[2];
    }>
  ) {
    cookiesToSet.forEach(({ name, value, options }) => {
      const currentIndex = responseCookies.findIndex((cookie) => cookie.name === name);
      if (currentIndex >= 0) {
        responseCookies[currentIndex] = { name, value, options };
      } else {
        responseCookies.push({ name, value, options });
      }
    });
  }

  function applyQueuedCookies(response: NextResponse) {
    responseCookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });
    return response;
  }

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
    return applyPerfTiming(createNextResponse());
  }

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
          queueResponseCookies(cookiesToSet);
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.id) {
    requestHeaders.set("x-auth-user-id", user.id);
  }
  if (user?.email) {
    requestHeaders.set("x-auth-user-email", user.email);
  }

  const isLoginPage = request.nextUrl.pathname === "/login";
  const isAuthCallback = request.nextUrl.pathname.startsWith("/auth/");

  if (!user && !isLoginPage && !isAuthCallback) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return applyPerfTiming(applyQueuedCookies(NextResponse.redirect(url)));
  }

  if (user && isLoginPage) {
    return applyPerfTiming(applyQueuedCookies(NextResponse.redirect(new URL("/", request.url))));
  }

  return applyPerfTiming(applyQueuedCookies(createNextResponse()));
}

export const config = {
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon.ico|mock/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
