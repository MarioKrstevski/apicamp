import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const { email } = body as { email?: string }
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 })

  // Look up user by email via admin API (service role required)
  const { data: { users }, error: lookupError } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (lookupError) return NextResponse.json({ error: "Failed to look up users" }, { status: 500 })

  const targetUser = users.find(u => u.email === email)
  if (!targetUser) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const targetId = targetUser.id
  const expiresAt = addMonths(new Date(), 12)

  const { error: subError } = await supabase.from("subscriptions").insert({
    user_id:          targetId,
    amount_paid:      0,
    base_price:       2100,
    gift_keys_earned: 2,
    gift_keys_used:   0,
    expires_at:       expiresAt.toISOString(),
    payment_ref:      "admin-grant",
  })

  if (subError) {
    console.error("grant insert error:", subError)
    return NextResponse.json({ error: "Failed to insert subscription" }, { status: 500 })
  }

  await supabase.from("profiles").update({ ever_paid: true }).eq("id", targetId)

  return NextResponse.json({ success: true, email })
}
