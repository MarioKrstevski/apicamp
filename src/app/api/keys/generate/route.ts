import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createPersonalKey, regeneratePersonalKey, getExpiredKey } from "@/lib/keys"

// POST /api/keys/generate
// Generates a new personal key (first time) or regenerates (revoke + new).
// Requires: authenticated session + active subscription.
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Check active subscription
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .gt("expires_at", new Date().toISOString())
    .limit(1)
    .single()

  if (!sub) {
    return NextResponse.json({ error: "Active subscription required" }, { status: 403 })
  }

  // Regenerate if they already have a key, otherwise create fresh
  const existingKey = await getExpiredKey(user.id)
  const result = existingKey
    ? await regeneratePersonalKey(user.id)
    : await createPersonalKey(user.id)

  // Update ever_paid on profile
  await supabase.from("profiles").update({ ever_paid: true }).eq("id", user.id)

  return NextResponse.json({
    raw:    result.raw,
    prefix: result.row.prefix,
    expiresAt: result.row.expiresAt,
  })
}
