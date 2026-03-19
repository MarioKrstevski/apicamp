import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createGiftKey } from "@/lib/keys"

// POST /api/keys/gift
// Generates a gift key for the authenticated user.
// Requires: active subscription with gift_keys_used < gift_keys_earned.
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id, gift_keys_earned, gift_keys_used")
    .eq("user_id", user.id)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (!sub) {
    return NextResponse.json({ error: "Active subscription required" }, { status: 403 })
  }
  if (sub.gift_keys_used >= sub.gift_keys_earned) {
    return NextResponse.json({ error: "Gift key quota exhausted" }, { status: 403 })
  }

  const result = await createGiftKey(user.id, sub.id)

  return NextResponse.json({
    raw:       result.raw,
    prefix:    result.row.prefix,
    createdAt: result.row.createdAt,
  })
}
