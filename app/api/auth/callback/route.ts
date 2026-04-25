import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import type { Database, Profile } from "@/types/database";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const errorParam = searchParams.get("error");

  // Surface OAuth errors back to the login page
  if (errorParam) {
    const errorDescription = searchParams.get("error_description") ?? "Authentication failed.";
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorDescription)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const cookieStore = await cookies();

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    console.error("[auth/callback] exchangeCodeForSession error:", error?.message);
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // Determine where to send the user post-auth
  const { data: profile } = (await supabase
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .single()) as { data: Profile | null; error: unknown };

  const destination = profile?.onboarding_complete ? next : "/onboarding";

  // Use absolute URL to ensure cookies are set before redirect
  return NextResponse.redirect(`${origin}${destination}`);
}
