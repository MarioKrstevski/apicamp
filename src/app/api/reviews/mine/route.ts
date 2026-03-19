import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: review } = await supabase
    .from("reviews")
    .select("id, comment, rating, project_url, project_label, approved, approved_at, created_at, updated_at")
    .eq("user_id", user.id)
    .single()

  return NextResponse.json({ review: review ?? null })
}
