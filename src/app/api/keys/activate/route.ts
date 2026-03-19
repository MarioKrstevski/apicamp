import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { claimKey } from "@/lib/keys"

const ERROR_MESSAGES: Record<string, string> = {
  not_found:       "Key not found or invalid",
  already_claimed: "This key has already been activated by someone else",
  expired:         "This key has expired",
  self_claim:      "You cannot activate a gift key you created",
  already_paid:    "You already have or had a paid account — this key is for new users only",
}

// POST /api/keys/activate  { key: "ak_..." }
// Claims a gift or pool key for the authenticated user.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const rawKey = typeof body.key === "string" ? body.key.trim() : null
  if (!rawKey) return NextResponse.json({ error: "key is required" }, { status: 400 })

  const result = await claimKey(rawKey, user.id)

  if (!result.success) {
    return NextResponse.json(
      { error: ERROR_MESSAGES[result.error] ?? "Activation failed" },
      { status: 400 }
    )
  }

  return NextResponse.json({ success: true, expiresAt: result.key.expiresAt })
}
