import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;

  if (!code) {
    return NextResponse.redirect(new URL("/auth/login?error=expired", appUrl));
  }

  const client = await createClient();
  const { error } = await client.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/auth/login?error=expired", appUrl));
  }

  // Redirect to /dashboard — middleware routes admins to /manage-dashboard
  return NextResponse.redirect(new URL("/dashboard", appUrl));
}
