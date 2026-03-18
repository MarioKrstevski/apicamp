import { createClient } from "@/lib/supabase/server"
import type { Account } from "@/lib/auth"

// ─── Limits ───────────────────────────────────────────────────────────────────

const LIMITS = {
  free: { daily: 350,  minute: 70  },
  paid: { daily: 1750, minute: 350 },
} as const

/** Hard cap — blocked regardless of tier. High count in DB makes abuse visible. */
const ABUSE_DAILY = 10_000

// ─── Types ────────────────────────────────────────────────────────────────────

export type RateLimitResult = {
  reason: "daily" | "burst" | "abuse"
  resetAt: string      // ISO timestamp of when the blocking window resets
  retryAfter: number   // seconds until reset
  limit: number        // the limit that was exceeded
} | null

// ─── Implementation ───────────────────────────────────────────────────────────

export async function checkRateLimit(account: Account): Promise<RateLimitResult> {
  const supabase = await createClient()
  const now = new Date()

  // Daily window (UTC date string, e.g. "2025-03-18")
  const windowDate = now.toISOString().slice(0, 10)

  // Minute window (truncated to the minute boundary)
  const windowMinute = new Date(Math.floor(now.getTime() / 60_000) * 60_000).toISOString()

  // When the daily window resets (UTC midnight tonight)
  const midnight = new Date(windowDate)
  midnight.setUTCDate(midnight.getUTCDate() + 1)
  const resetAt = midnight.toISOString()
  const secsToMidnight = Math.ceil((midnight.getTime() - now.getTime()) / 1_000)

  // When the burst window resets (start of next minute)
  const nextMinute = new Date((Math.floor(now.getTime() / 60_000) + 1) * 60_000)
  const secsToNextMinute = Math.ceil((nextMinute.getTime() - now.getTime()) / 1_000)

  // Atomic increment — one DB round-trip for both counters
  const { data, error } = await supabase.rpc("increment_rate_limit", {
    p_account_id:  account.id,
    p_window_date: windowDate,
    p_window_min:  windowMinute,
  })

  if (error || !Array.isArray(data) || data.length === 0) {
    // Fail open: if we can't check the limit, let the request through.
    // Avoids blocking all traffic on a transient DB hiccup.
    console.error("[rateLimit] increment_rate_limit error:", error?.message)
    return null
  }

  const { daily_count, minute_count } = data[0] as { daily_count: number; minute_count: number }
  const limits = LIMITS[account.tier]

  // Abuse check first — hard cap regardless of tier
  if (daily_count > ABUSE_DAILY) {
    return { reason: "abuse", resetAt, retryAfter: secsToMidnight, limit: ABUSE_DAILY }
  }

  // Daily limit
  if (daily_count > limits.daily) {
    return { reason: "daily", resetAt, retryAfter: secsToMidnight, limit: limits.daily }
  }

  // Burst limit
  if (minute_count > limits.minute) {
    return { reason: "burst", resetAt: nextMinute.toISOString(), retryAfter: secsToNextMinute, limit: limits.minute }
  }

  return null
}
