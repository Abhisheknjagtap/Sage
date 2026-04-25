import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database, Profile } from "@/types/database";

// Routes that require auth
const PROTECTED_ROUTES = ["/dashboard", "/conversations", "/chat", "/profile", "/patterns", "/onboarding"];
// Auth routes that logged-in users shouldn't see
const AUTH_ROUTES = ["/login", "/signup"];
// Routes that don't require onboarding to be complete
const ONBOARDING_EXEMPT = ["/onboarding", "/api"];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write cookies to the request (for downstream middleware)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Build a fresh response that carries the updated cookies
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: always call getUser() — never getSession() in middleware.
  // getUser() validates the token server-side; getSession() trusts the cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r));
  const isOnboardingExempt = ONBOARDING_EXEMPT.some((r) =>
    pathname.startsWith(r)
  );

  // ── No session → send to login ──────────────────────────────
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // ── Logged in, on auth screen → send to app ─────────────────
  if (isAuthRoute && user) {
    const url = request.nextUrl.clone();

    // Check onboarding before deciding where to send them
    const { data: profile } = (await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()) as { data: Profile | null; error: unknown };

    url.pathname = profile?.onboarding_complete ? "/dashboard" : "/onboarding";
    return NextResponse.redirect(url);
  }

  // ── Logged in, onboarding incomplete → gate to /onboarding ──
  if (user && isProtected && !isOnboardingExempt) {
    const { data: profile } = (await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()) as { data: Profile | null; error: unknown };

    if (profile && !profile.onboarding_complete) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
