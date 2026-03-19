import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { z } from "zod"

const schema = z.object({
  display_name: z.string().max(80).nullable().optional(),
  title:        z.string().max(80).nullable().optional(),
  avatar_url:   z.union([
    z.string().url("avatar_url must be a valid URL"),
    z.literal("").transform(() => null),
    z.null(),
  ]).optional(),
})

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  // Only include keys that were explicitly sent
  const updates: Record<string, unknown> = {}
  if ("display_name" in parsed.data) updates.display_name = parsed.data.display_name ?? null
  if ("title"        in parsed.data) updates.title        = parsed.data.title        ?? null
  if ("avatar_url"   in parsed.data) updates.avatar_url   = parsed.data.avatar_url   ?? null

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields provided" }, { status: 400 })
  }

  const { error } = await supabase.from("profiles").update(updates).eq("id", user.id)
  if (error) return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })

  return NextResponse.json({ success: true })
}
