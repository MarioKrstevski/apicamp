import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase session via cookies and returns the userId from claims.
 * No redirect logic — the root middleware (src/middleware.ts) owns all routing.
 *
 * IMPORTANT: Do not add any code between createServerClient and getClaims().
 * See: https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export async function refreshSession(request: NextRequest): Promise<{
  response: NextResponse;
  userId: string | null;
}> {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Must mutate request cookies and re-assign supabaseResponse so that
          // the refreshed session cookies are forwarded to the browser.
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

  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub ?? null;

  return { response: supabaseResponse, userId };
}
