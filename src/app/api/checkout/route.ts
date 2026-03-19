import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

// TODO: replace with Paddle webhook handler once payments are live.
// Flow will be: client redirects to Paddle checkout → Paddle POSTs webhook here
// on payment.completed → we insert subscription + set ever_paid.
// For now: direct insert, no payment validation.

const PLAN_CONFIG = {
  monthly:  { months: 1,  amountCents: 250,  basePriceCents: 250,  giftKeys: 0 },
  biannual: { months: 6,  amountCents: 1200, basePriceCents: 1200, giftKeys: 1 },
  yearly:   { months: 12, amountCents: 2100, basePriceCents: 2100, giftKeys: 2 },
} as const

type PlanId = keyof typeof PLAN_CONFIG

function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { plan, amount } = body as { plan?: string; amount?: number }

  let amountCents: number
  let basePriceCents: number
  let giftKeys: number
  let months: number

  if (plan === "patron") {
    if (!amount || typeof amount !== "number" || amount < 8) {
      return NextResponse.json({ error: "Minimum patron amount is $8" }, { status: 400 })
    }
    const seats = Math.floor(amount / 8)
    amountCents    = amount * 100
    basePriceCents = 800
    giftKeys       = Math.max(0, seats - 1)
    months         = 12
  } else if (plan && plan in PLAN_CONFIG) {
    const cfg      = PLAN_CONFIG[plan as PlanId]
    amountCents    = cfg.amountCents
    basePriceCents = cfg.basePriceCents
    giftKeys       = cfg.giftKeys
    months         = cfg.months
  } else {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 })
  }

  const expiresAt = addMonths(new Date(), months)
  const admin = createAdminClient()

  const { error: subError } = await admin.from("subscriptions").insert({
    user_id:          user.id,
    amount_paid:      amountCents,
    base_price:       basePriceCents,
    gift_keys_earned: giftKeys,
    gift_keys_used:   0,
    expires_at:       expiresAt.toISOString(),
    payment_ref:      "dev-direct", // TODO: Paddle transaction ID
  })

  if (subError) {
    console.error("checkout insert error:", subError)
    return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 })
  }

  await admin.from("profiles").update({ ever_paid: true }).eq("id", user.id)

  return NextResponse.json({ success: true })
}
