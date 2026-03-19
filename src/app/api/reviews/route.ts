import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { z } from "zod"

const schema = z.object({
  comment:       z.string().min(10, "Comment must be at least 10 characters").max(500, "Comment must be at most 500 characters"),
  rating:        z.number().int().min(1).max(5),
  project_url:   z.string().url("project_url must be a valid URL").optional().or(z.literal("").transform(() => undefined)),
  project_label: z.string().max(60, "project_label must be at most 60 characters").optional(),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("ever_paid")
    .eq("id", user.id)
    .single()

  if (!profile?.ever_paid) {
    return NextResponse.json({ error: "Paid account required to leave a review" }, { status: 403 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { comment, rating, project_url, project_label } = parsed.data

  if (project_label && !project_url) {
    return NextResponse.json({ error: "project_label requires project_url" }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from("reviews")
    .select("id")
    .eq("user_id", user.id)
    .single()

  const payload = {
    user_id:       user.id,
    comment,
    rating,
    project_url:   project_url ?? null,
    project_label: project_label ?? null,
    approved:      false,
    approved_at:   null,
  }

  const { error } = existing
    ? await supabase.from("reviews").update(payload).eq("user_id", user.id)
    : await supabase.from("reviews").insert(payload)

  if (error) return NextResponse.json({ error: "Failed to save review" }, { status: 500 })

  return NextResponse.json({ success: true, status: "pending" }, { status: existing ? 200 : 201 })
}
