import { NextResponse, type NextRequest } from "next/server";
import { refreshSession } from "@/lib/supabase/middleware";
import { isLocaleAdmin } from "@/lib/locale-admin";

export async function middleware(request: NextRequest) {
  const { response, userId } = await refreshSession(request);
  const { pathname } = request.nextUrl;

  // Public routes — allow through without auth checks
  if (
    pathname === "/" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/docs") ||
    pathname.startsWith("/pricing")
  ) {
    return response;
  }

  // No session → send to landing page
  if (!userId) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Session exists — route based on role
  const locale = isLocaleAdmin(userId);

  if (locale !== null && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/manage-dashboard", request.url));
  }

  if (locale === null && pathname.startsWith("/manage-dashboard")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
