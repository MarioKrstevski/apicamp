import { scrypt, randomBytes, timingSafeEqual, createHash } from "node:crypto"
import { promisify } from "node:util"
import { createClient } from "@/lib/supabase/server"

const scryptAsync = promisify(scrypt)

// ─── Pure utilities ───────────────────────────────────────────────────────────

/** Hash a password using scrypt. Returns "salt:hash" string. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex")
  const hash = (await scryptAsync(password, salt, 64)) as Buffer
  return `${salt}:${hash.toString("hex")}`
}

/** Verify a plaintext password against a stored "salt:hash" string. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(":")
  if (!salt || !hash) return false
  const stored64 = Buffer.from(hash, "hex")
  const supplied = (await scryptAsync(password, salt, 64)) as Buffer
  if (stored64.length !== supplied.length) return false
  return timingSafeEqual(stored64, supplied)
}

/** Generate a cryptographically random session token. Raw value returned to client. */
export function generateToken(): string {
  return "tok_" + randomBytes(32).toString("hex")
}

/** SHA-256 hash of a raw token — stored in DB, never the raw token. */
export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex")
}

/** Generate a short random token for email verification and password reset URLs. */
export function generateUrlToken(): string {
  return randomBytes(24).toString("hex")
}

/** Build the debug object returned instead of sending a real email. */
export function makeDebugUrl(
  baseUrl: string,
  path: string,
  token: string
): { note: string; url: string } {
  return {
    note: "This is a practice API — no real email is sent. Use the url below.",
    url: `${baseUrl}${path}?token=${token}`,
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────

export function validateEmail(email: string): string | null {
  if (!email || typeof email !== "string") return "email is required"
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "invalid email format"
  if (email.length > 254) return "email too long"
  return null
}

export function validatePassword(password: string): string | null {
  if (!password || typeof password !== "string") return "password is required"
  if (password.length < 8) return "password must be at least 8 characters"
  if (password.length > 72) return "password must be at most 72 characters"
  return null
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuthTier = "basic" | "token" | "profile"

export type PracticeAccount = {
  id: string
  email: string
  isVerified: boolean
  createdAt: string
}

export type PracticeProfile = {
  displayName: string | null
  bio: string | null
  avatarUrl: string | null
  location: string | null
  website: string | null
  updatedAt: string
}

export type SignupResult =
  | { ok: true;  account: PracticeAccount; token?: string; verificationToken: string }
  | { ok: false; status: 409 | 400; error: string }

export type SigninResult =
  | { ok: true;  account: PracticeAccount; token?: string }
  | { ok: false; status: 401 | 403; error: string }

export type TokenLookupResult =
  | { ok: true;  account: PracticeAccount; accountId: string }
  | { ok: false; status: 401; error: string }

// ─── Table name helpers ───────────────────────────────────────────────────────

function accountsTable(tier: AuthTier) {
  return tier === "basic"   ? "auth_accounts_basic"
       : tier === "token"   ? "auth_accounts_token"
       : "auth_accounts_profile"
}

function sessionsTable(tier: "token" | "profile") {
  return tier === "token" ? "auth_sessions_token" : "auth_sessions_profile"
}

// ─── DB operations ────────────────────────────────────────────────────────────

/**
 * Register a new practice account.
 * Returns SignupResult — callers handle the debug URL.
 */
export async function signupAccount(
  tier: AuthTier,
  userId: string,
  email: string,
  password: string
): Promise<SignupResult> {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from(accountsTable(tier))
    .select("id")
    .eq("user_id", userId)
    .eq("email", email)
    .maybeSingle()

  if (existing) return { ok: false, status: 409, error: "Email already registered" }

  const passwordHash      = await hashPassword(password)
  const verificationToken = generateUrlToken()

  const { data, error } = await supabase
    .from(accountsTable(tier))
    .insert({
      user_id:             userId,
      email,
      password_hash:       passwordHash,
      is_verified:         false,
      verification_token:  verificationToken,
      ...(tier !== "basic" ? {
        verification_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      } : {}),
    })
    .select("id, email, is_verified, created_at")
    .single()

  if (error || !data) throw new Error(error?.message ?? "Failed to create account")

  return {
    ok: true,
    account: rowToAccount(data),
    verificationToken,
  }
}

/**
 * Verify an account by its verification token.
 */
export async function verifyEmail(
  tier: AuthTier,
  userId: string,
  token: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from(accountsTable(tier))
    .update({ is_verified: true, verification_token: null })
    .eq("user_id", userId)
    .eq("verification_token", token)
    .select("id")
    .single()

  if (error || !data) return { ok: false, error: "Invalid or expired verification token" }
  return { ok: true }
}

/**
 * Sign in a practice account. Validates email + password.
 * For token/profile tiers, also creates and returns a session token.
 */
export async function signinAccount(
  tier: AuthTier,
  userId: string,
  email: string,
  password: string
): Promise<SigninResult> {
  const supabase = await createClient()

  const { data: account } = await supabase
    .from(accountsTable(tier))
    .select("id, email, password_hash, is_verified, created_at")
    .eq("user_id", userId)
    .eq("email", email)
    .maybeSingle()

  if (!account) return { ok: false, status: 401, error: "Invalid email or password" }

  const passwordOk = await verifyPassword(password, account.password_hash)
  if (!passwordOk) return { ok: false, status: 401, error: "Invalid email or password" }

  const practiceAccount = rowToAccount(account)

  if (tier === "basic") {
    return { ok: true, account: practiceAccount }
  }

  const raw = generateToken()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  const { error: sessionError } = await supabase
    .from(sessionsTable(tier as "token" | "profile"))
    .insert({ account_id: account.id, token_hash: hashToken(raw), expires_at: expiresAt })

  if (sessionError) throw new Error(sessionError.message)

  return { ok: true, account: practiceAccount, token: raw }
}

/**
 * Validate a Bearer token and return the practice account.
 */
export async function validatePracticeToken(
  tier: "token" | "profile",
  userId: string,
  raw: string
): Promise<TokenLookupResult> {
  const supabase = await createClient()

  const { data: session } = await supabase
    .from(sessionsTable(tier))
    .select("account_id, expires_at")
    .eq("token_hash", hashToken(raw))
    .maybeSingle()

  if (!session) return { ok: false, status: 401, error: "Invalid or expired token" }
  if (new Date(session.expires_at) < new Date()) {
    return { ok: false, status: 401, error: "Token expired" }
  }

  const { data: account } = await supabase
    .from(accountsTable(tier))
    .select("id, email, is_verified, created_at")
    .eq("id", session.account_id)
    .eq("user_id", userId)
    .maybeSingle()

  if (!account) return { ok: false, status: 401, error: "Account not found" }

  return { ok: true, account: rowToAccount(account), accountId: account.id }
}

/**
 * Delete a session token (signout).
 */
export async function signoutToken(
  tier: "token" | "profile",
  raw: string
): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from(sessionsTable(tier))
    .delete()
    .eq("token_hash", hashToken(raw))
}

/**
 * Initiate password reset. Returns the reset token (shown in debug).
 * Returns null silently if email not found (no enumeration).
 */
export async function initPasswordReset(
  tier: "token" | "profile",
  userId: string,
  email: string
): Promise<string | null> {
  const supabase = await createClient()
  const resetToken = generateUrlToken()
  const expiresAt  = new Date(Date.now() + 60 * 60 * 1000).toISOString()

  const { data } = await supabase
    .from(accountsTable(tier))
    .update({ reset_token: resetToken, reset_token_expires_at: expiresAt })
    .eq("user_id", userId)
    .eq("email", email)
    .select("id")
    .maybeSingle()

  return data ? resetToken : null
}

/**
 * Complete password reset. Invalidates all sessions for the account.
 */
export async function resetPassword(
  tier: "token" | "profile",
  userId: string,
  resetToken: string,
  newPassword: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()

  const { data: account } = await supabase
    .from(accountsTable(tier))
    .select("id, reset_token_expires_at")
    .eq("user_id", userId)
    .eq("reset_token", resetToken)
    .maybeSingle()

  if (!account) return { ok: false, error: "Invalid or expired reset token" }
  if (new Date(account.reset_token_expires_at) < new Date()) {
    return { ok: false, error: "Reset token has expired" }
  }

  const passwordHash = await hashPassword(newPassword)

  await supabase
    .from(accountsTable(tier))
    .update({ password_hash: passwordHash, reset_token: null, reset_token_expires_at: null })
    .eq("id", account.id)

  await supabase
    .from(sessionsTable(tier))
    .delete()
    .eq("account_id", account.id)

  return { ok: true }
}

/**
 * Get the profile for a tier-3 account. Auto-creates if missing.
 */
export async function getOrCreateProfile(accountId: string): Promise<PracticeProfile> {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from("auth_user_profiles")
    .select("display_name, bio, avatar_url, location, website, updated_at")
    .eq("account_id", accountId)
    .maybeSingle()

  if (existing) return rowToProfile(existing)

  const { data: created } = await supabase
    .from("auth_user_profiles")
    .insert({ account_id: accountId })
    .select("display_name, bio, avatar_url, location, website, updated_at")
    .single()

  return rowToProfile(created!)
}

/**
 * Update a tier-3 profile.
 */
export async function updateProfile(
  accountId: string,
  fields: Partial<{ displayName: string; bio: string; avatarUrl: string; location: string; website: string }>
): Promise<PracticeProfile> {
  const supabase = await createClient()

  const { data } = await supabase
    .from("auth_user_profiles")
    .update({
      ...(fields.displayName !== undefined ? { display_name: fields.displayName } : {}),
      ...(fields.bio         !== undefined ? { bio:          fields.bio }         : {}),
      ...(fields.avatarUrl   !== undefined ? { avatar_url:   fields.avatarUrl }   : {}),
      ...(fields.location    !== undefined ? { location:     fields.location }    : {}),
      ...(fields.website     !== undefined ? { website:      fields.website }     : {}),
    })
    .eq("account_id", accountId)
    .select("display_name, bio, avatar_url, location, website, updated_at")
    .single()

  return rowToProfile(data!)
}

/**
 * Delete a practice account (cascades to sessions and profile).
 */
export async function deleteAccount(
  tier: "token" | "profile",
  accountId: string
): Promise<void> {
  const supabase = await createClient()
  await supabase.from(accountsTable(tier)).delete().eq("id", accountId)
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function rowToAccount(row: Record<string, unknown>): PracticeAccount {
  return {
    id:         String(row.id),
    email:      String(row.email),
    isVerified: Boolean(row.is_verified),
    createdAt:  String(row.created_at),
  }
}

function rowToProfile(row: Record<string, unknown>): PracticeProfile {
  return {
    displayName: row.display_name as string | null,
    bio:         row.bio as string | null,
    avatarUrl:   row.avatar_url as string | null,
    location:    row.location as string | null,
    website:     row.website as string | null,
    updatedAt:   String(row.updated_at),
  }
}
