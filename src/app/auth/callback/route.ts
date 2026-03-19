import { createClient } from "@/lib/supabase/server"
import { NextResponse, type NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin

  if (!code) {
    return NextResponse.redirect(new URL("/auth/login?error=expired", appUrl))
  }

  const client = await createClient()
  const { data: sessionData, error } = await client.auth.exchangeCodeForSession(code)

  if (error || !sessionData.user) {
    return NextResponse.redirect(new URL("/auth/login?error=expired", appUrl))
  }

  const userId = sessionData.user.id
  const email  = sessionData.user.email ?? ""
  const isAdmin = email === process.env.ADMIN_EMAIL

  // Upsert profile — trigger may have already created it
  await client.from("profiles").upsert(
    {
      id:   userId,
      role: isAdmin ? "superadmin" : "user",
    },
    { onConflict: "id", ignoreDuplicates: true }
  )

  return NextResponse.redirect(new URL("/dashboard", appUrl))
}
