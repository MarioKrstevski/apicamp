import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()
  if (profile?.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const status = req.nextUrl.searchParams.get("status") ?? "pending"

  let query = supabase
    .from("reviews")
    .select("id, comment, rating, project_url, project_label, approved, approved_at, created_at, user_id, profiles(display_name, title, avatar_url, ever_paid)")
    .order("created_at", { ascending: false })

  if (status === "pending")  query = query.eq("approved", false)
  if (status === "approved") query = query.eq("approved", true)
  // "all" — no filter

  const { data: reviews } = await query
  return NextResponse.json({ reviews: reviews ?? [] })
}
