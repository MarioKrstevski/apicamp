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

  let result
  try {
    result = existingKey
      ? await regeneratePersonalKey(user.id)
      : await createPersonalKey(user.id)
  } catch {
    return NextResponse.json({ error: "Failed to generate key" }, { status: 500 })
  }

  // Update ever_paid on profile (best-effort — failure is logged but not fatal)
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ ever_paid: true })
    .eq("id", user.id)
  if (profileError) {
    console.error("[keys/generate] Failed to set ever_paid:", profileError.message)
  }

  return NextResponse.json({
    raw:      result.raw,
    prefix:   result.row.prefix,
    expiresAt: result.row.expiresAt,
  })
}
