import { createHash, randomBytes } from "node:crypto"
import { createClient } from "@/lib/supabase/server"

// ─── Pure utilities (no DB, fully testable) ───────────────────────────────────

/** Generates a cryptographically random API key, prefixed with "ak_" */
export function generateRawKey(): string {
  return "ak_" + randomBytes(32).toString("hex")
}

/** SHA-256 hash of the raw key — stored in DB, never the raw key */
export function hashKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex")
}

/** First 11 chars of the raw key (ak_ + 8 hex chars) — shown in UI, e.g. ak_4f9a2c1b */
export function getPrefix(raw: string): string {
  return raw.slice(0, 11)
}

/** Calculates expires_at from activated_at based on key type */
export function calcExpiresAt(
  type: "personal" | "gift" | "pool",
  activatedAt: Date,
  poolExpiresDays?: number
): Date {
  const days =
    type === "personal" ? 14 :
    type === "gift"     ? 30 :
    (poolExpiresDays ?? 30)
  return new Date(activatedAt.getTime() + days * 24 * 60 * 60 * 1000)
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type ApiKeyRow = {
  id: string
  prefix: string
  type: "personal" | "gift" | "pool"
  status: "active" | "unclaimed" | "donated" | "expired" | "revoked"
  expiresAt: string | null
  activatedAt: string | null
  createdAt: string
  lastUsedAt: string | null
}

export type ClaimResult =
  | { success: true; key: ApiKeyRow }
  | { success: false; error: "not_found" | "already_claimed" | "self_claim" | "already_paid" }

// ─── DB operations ────────────────────────────────────────────────────────────

/**
 * Creates a personal API key for the user and activates it immediately.
 * Returns the raw key (shown once) + the DB row.
 * Caller must have an active subscription.
 */
export async function createPersonalKey(
  userId: string
): Promise<{ raw: string; row: ApiKeyRow }> {
  const supabase = await createClient()
  const raw = generateRawKey()
  const now = new Date()

  const { data, error } = await supabase
    .from("api_keys")
    .insert({
      key_hash:     hashKey(raw),
      prefix:       getPrefix(raw),
      owner_id:     userId,
      creator_id:   userId,
      type:         "personal",
      status:       "active",
      activated_at: now.toISOString(),
      expires_at:   calcExpiresAt("personal", now).toISOString(),
    })
    .select()
    .single()

  if (error || !data) throw new Error(error?.message ?? "Failed to create key")
  return { raw, row: dbRowToApiKeyRow(data) }
}

/**
 * Revokes the user's current personal key and creates a fresh one.
 * Returns the new raw key (shown once).
 */
export async function regeneratePersonalKey(
  userId: string
): Promise<{ raw: string; row: ApiKeyRow }> {
  const supabase = await createClient()

  // Revoke all existing personal keys for this user
  await supabase
    .from("api_keys")
    .update({ status: "revoked" })
    .eq("owner_id", userId)
    .eq("type", "personal")
    .in("status", ["active", "expired"])

  return createPersonalKey(userId)
}

/**
 * Creates a gift key (unclaimed, not yet activated).
 * Increments gift_keys_used on the active subscription.
 * Returns the raw key — shown ONCE to the creator.
 */
export async function createGiftKey(
  userId: string,
  subscriptionId: string
): Promise<{ raw: string; row: ApiKeyRow }> {
  const supabase = await createClient()
  const raw = generateRawKey()

  const { data, error } = await supabase
    .from("api_keys")
    .insert({
      key_hash:   hashKey(raw),
      prefix:     getPrefix(raw),
      owner_id:   null,
      creator_id: userId,
      type:       "gift",
      status:     "unclaimed",
    })
    .select()
    .single()

  if (error || !data) throw new Error(error?.message ?? "Failed to create gift key")

  // Increment gift_keys_used
  await supabase.rpc("increment_gift_keys_used", { p_subscription_id: subscriptionId })

  return { raw, row: dbRowToApiKeyRow(data) }
}

/**
 * Claims a gift or pool key for the given user.
 * Uses a conditional update to prevent race conditions.
 */
export async function claimKey(
  rawKey: string,
  claimantId: string
): Promise<ClaimResult> {
  const supabase = await createClient()
  const hash = hashKey(rawKey)

  // Look up key
  const { data: key } = await supabase
    .from("api_keys")
    .select("*")
    .eq("key_hash", hash)
    .single()

  if (!key) return { success: false, error: "not_found" }
  if (key.status !== "unclaimed" && key.status !== "donated") {
    return { success: false, error: "already_claimed" }
  }
  if (key.creator_id === claimantId && key.type === "gift") {
    return { success: false, error: "self_claim" }
  }

  // Check claimant ever_paid
  const { data: profile } = await supabase
    .from("profiles")
    .select("ever_paid")
    .eq("id", claimantId)
    .single()

  if (profile?.ever_paid) return { success: false, error: "already_paid" }

  const now = new Date()
  const expiresAt = calcExpiresAt(
    key.type as "personal" | "gift" | "pool",
    now,
    key.pool_expires_days ?? undefined
  )

  // Conditional update — race-safe: only succeeds if still unclaimed/donated
  const { data: updated, error } = await supabase
    .from("api_keys")
    .update({
      owner_id:     claimantId,
      status:       "active",
      activated_at: now.toISOString(),
      expires_at:   expiresAt.toISOString(),
    })
    .eq("id", key.id)
    .in("status", ["unclaimed", "donated"])
    .select()
    .single()

  if (error || !updated) return { success: false, error: "already_claimed" }

  // Mark ever_paid on claimant profile
  await supabase
    .from("profiles")
    .update({ ever_paid: true })
    .eq("id", claimantId)

  return { success: true, key: dbRowToApiKeyRow(updated) }
}

/** Fetch the active personal key for a user (null if none / expired) */
export async function getActiveKey(userId: string): Promise<ApiKeyRow | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("api_keys")
    .select("*")
    .eq("owner_id", userId)
    .eq("type", "personal")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  return data ? dbRowToApiKeyRow(data) : null
}

/** Fetch all gift keys created by a user */
export async function getGiftKeys(userId: string): Promise<ApiKeyRow[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("api_keys")
    .select("*")
    .eq("creator_id", userId)
    .eq("type", "gift")
    .order("created_at", { ascending: false })

  return (data ?? []).map(dbRowToApiKeyRow)
}

/** Fetch the most recent expired personal key (for the "expired" banner) */
export async function getExpiredKey(userId: string): Promise<ApiKeyRow | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("api_keys")
    .select("*")
    .eq("owner_id", userId)
    .eq("type", "personal")
    .in("status", ["expired", "active"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  return data ? dbRowToApiKeyRow(data) : null
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function dbRowToApiKeyRow(row: Record<string, unknown>): ApiKeyRow {
  return {
    id:          String(row.id),
    prefix:      String(row.prefix),
    type:        row.type as ApiKeyRow["type"],
    status:      row.status as ApiKeyRow["status"],
    expiresAt:   row.expires_at as string | null,
    activatedAt: row.activated_at as string | null,
    createdAt:   String(row.created_at),
    lastUsedAt:  row.last_used_at as string | null,
  }
}
