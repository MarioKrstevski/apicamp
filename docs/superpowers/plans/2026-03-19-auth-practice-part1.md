# Auth Practice System — Implementation Plan (Part 1)

> **Spec:** `docs/superpowers/specs/2026-03-19-auth-practice-design.md`
> **Part 2 covers:** Refresh tokens, roles & permissions (separate plan)

**Goal:** Three tiers of practice auth tables (`basic`, `token`, `profile`) with all flows — signup, signin, signout, verify-email, forgot/reset password, /me, profile CRUD. Fake email links in `debug` field. `/auth-explained` knowledge page. Auth section in sidebar.

**Architecture decision:** Auth is detected in the existing catch-all route (`[...segments]/route.ts`) by checking `resource === "auth"`, then dispatched to `src/lib/auth-practice-handlers.ts`. No new route file needed. All modifier support (slow, chaos, stale) is inherited automatically. `empty` and `random` modifiers are ignored for auth (not meaningful for action endpoints).

---

## File Map

**New files:**
- `docs/sql/auth-practice.sql` — DB migration (6 tables)
- `src/lib/auth-practice.ts` — pure utils + DB ops for all 3 tiers
- `src/lib/__tests__/auth-practice.test.ts` — unit tests for pure functions
- `src/lib/auth-practice-handlers.ts` — request handlers for all tiers/actions
- `src/app/docs/auth/basic/page.tsx` — docs for tier 1
- `src/app/docs/auth/token/page.tsx` — docs for tier 2
- `src/app/docs/auth/profile/page.tsx` — docs for tier 3
- `src/app/(main)/auth-explained/page.tsx` — knowledge page

**Modified files:**
- `src/app/api/[...segments]/route.ts` — add `tail` to ParsedSegments, detect auth resource, dispatch
- `src/app/docs/layout.tsx` — add Auth Practice section to sidebar

---

## Task 1: SQL migration

**Files:** Create `docs/sql/auth-practice.sql`

Run in Supabase SQL Editor. No automated test — verify in Tables view.

- [ ] **Step 1: Create `docs/sql/auth-practice.sql`**

```sql
-- ─────────────────────────────────────────────────────────────────────────────
-- auth-practice.sql
-- Practice auth tables — no relation to platform accounts (profiles, api_keys).
-- Every row is scoped to a platform user_id (the API key owner).
-- Run in Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── TIER 1: BASIC ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS auth_accounts_basic (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  num_id              BIGSERIAL   UNIQUE,
  user_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email               TEXT        NOT NULL,
  password_hash       TEXT        NOT NULL,
  is_verified         BOOLEAN     NOT NULL DEFAULT false,
  verification_token  TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Each apicamp user gets their own email namespace
CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_basic_user_email
  ON auth_accounts_basic (user_id, email);

CREATE INDEX IF NOT EXISTS idx_auth_basic_verification_token
  ON auth_accounts_basic (verification_token)
  WHERE verification_token IS NOT NULL;

-- ─── TIER 2: TOKEN ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS auth_accounts_token (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  num_id                  BIGSERIAL   UNIQUE,
  user_id                 UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email                   TEXT        NOT NULL,
  password_hash           TEXT        NOT NULL,
  is_verified             BOOLEAN     NOT NULL DEFAULT false,
  verification_token      TEXT,
  verification_expires_at TIMESTAMPTZ,
  reset_token             TEXT,
  reset_token_expires_at  TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_token_user_email
  ON auth_accounts_token (user_id, email);

CREATE INDEX IF NOT EXISTS idx_auth_token_verification_token
  ON auth_accounts_token (verification_token)
  WHERE verification_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_auth_token_reset_token
  ON auth_accounts_token (reset_token)
  WHERE reset_token IS NOT NULL;

CREATE TABLE IF NOT EXISTS auth_sessions_token (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  UUID        NOT NULL REFERENCES auth_accounts_token(id) ON DELETE CASCADE,
  token_hash  TEXT        UNIQUE NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_token_account
  ON auth_sessions_token (account_id);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_token_hash
  ON auth_sessions_token (token_hash);

-- ─── TIER 3: PROFILE ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS auth_accounts_profile (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  num_id                  BIGSERIAL   UNIQUE,
  user_id                 UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email                   TEXT        NOT NULL,
  password_hash           TEXT        NOT NULL,
  is_verified             BOOLEAN     NOT NULL DEFAULT false,
  verification_token      TEXT,
  verification_expires_at TIMESTAMPTZ,
  reset_token             TEXT,
  reset_token_expires_at  TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_profile_user_email
  ON auth_accounts_profile (user_id, email);

CREATE INDEX IF NOT EXISTS idx_auth_profile_verification_token
  ON auth_accounts_profile (verification_token)
  WHERE verification_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_auth_profile_reset_token
  ON auth_accounts_profile (reset_token)
  WHERE reset_token IS NOT NULL;

CREATE TABLE IF NOT EXISTS auth_sessions_profile (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  UUID        NOT NULL REFERENCES auth_accounts_profile(id) ON DELETE CASCADE,
  token_hash  TEXT        UNIQUE NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_profile_account
  ON auth_sessions_profile (account_id);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_profile_hash
  ON auth_sessions_profile (token_hash);

CREATE TABLE IF NOT EXISTS auth_user_profiles (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    UUID        UNIQUE NOT NULL REFERENCES auth_accounts_profile(id) ON DELETE CASCADE,
  display_name  TEXT        CHECK (char_length(display_name) <= 80),
  bio           TEXT        CHECK (char_length(bio) <= 500),
  avatar_url    TEXT,
  location      TEXT,
  website       TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_user_profiles_account
  ON auth_user_profiles (account_id);

-- Auto-update updated_at on auth_user_profiles
CREATE OR REPLACE TRIGGER auth_user_profiles_updated_at
  BEFORE UPDATE ON auth_user_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────────────────────
-- Service role (server-side) bypasses RLS.
-- Direct client access is blocked — all access goes through the API route.

ALTER TABLE auth_accounts_basic    ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_accounts_token    ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_sessions_token    ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_accounts_profile  ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_sessions_profile  ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_user_profiles     ENABLE ROW LEVEL SECURITY;

-- No client-facing policies — service role only
```

- [ ] **Step 2: Paste into Supabase SQL Editor and run**

Expected: No errors. Check Tables sidebar shows all 6 new tables.

Note: `set_updated_at()` function was created in `profiles-and-keys.sql`. If running this file alone, add the function first:
```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;
```

- [ ] **Step 3: Commit**
```bash
git add docs/sql/auth-practice.sql
git commit -m "feat: add auth practice SQL migration — 6 tables across 3 tiers"
```

---

## Task 2: `src/lib/auth-practice.ts`

**Files:** Create `src/lib/auth-practice.ts`

Pure utilities at the top (testable), DB operations below. All three tiers use functions from this file.

- [ ] **Step 1: Create `src/lib/auth-practice.ts`**

```ts
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

  // Check for duplicate email within this user's namespace
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

  // Create session token for token/profile tiers
  const raw  = generateToken()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  const { error: sessionError } = await supabase
    .from(sessionsTable(tier as "token" | "profile"))
    .insert({ account_id: account.id, token_hash: hashToken(raw), expires_at: expiresAt })

  if (sessionError) throw new Error(sessionError.message)

  return { ok: true, account: practiceAccount, token: raw }
}

/**
 * Validate a Bearer token and return the practice account.
 * Used by /me, /signout, and profile CRUD.
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
    .eq("user_id", userId)  // ownership check
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
  const resetToken   = generateUrlToken()
  const expiresAt    = new Date(Date.now() + 60 * 60 * 1000).toISOString()

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

  // Invalidate all sessions
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

  // Auto-create empty profile
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
      ...(fields.displayName !== undefined ? { display_name:  fields.displayName } : {}),
      ...(fields.bio         !== undefined ? { bio:           fields.bio }         : {}),
      ...(fields.avatarUrl   !== undefined ? { avatar_url:    fields.avatarUrl }   : {}),
      ...(fields.location    !== undefined ? { location:      fields.location }    : {}),
      ...(fields.website     !== undefined ? { website:       fields.website }     : {}),
    })
    .eq("account_id", accountId)
    .select("display_name, bio, avatar_url, location, website, updated_at")
    .single()

  return rowToProfile(data!)
}

/**
 * Delete a tier-3 account (cascades to sessions and profile).
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
```

- [ ] **Step 2: Commit**
```bash
git add src/lib/auth-practice.ts
git commit -m "feat: add auth-practice.ts — password hashing, token utils, DB ops for all 3 tiers"
```

---

## Task 3: Unit tests for pure functions

**Files:** Create `src/lib/__tests__/auth-practice.test.ts`

Only pure functions are tested (no DB).

- [ ] **Step 1: Create `src/lib/__tests__/auth-practice.test.ts`**

```ts
import { describe, it, expect } from "vitest"
import {
  hashPassword,
  verifyPassword,
  generateToken,
  hashToken,
  generateUrlToken,
  makeDebugUrl,
  validateEmail,
  validatePassword,
} from "@/lib/auth-practice"

describe("hashPassword / verifyPassword", () => {
  it("produces a salt:hash string", async () => {
    const hash = await hashPassword("hunter2!")
    expect(hash).toMatch(/^[a-f0-9]+:[a-f0-9]+$/)
  })

  it("verifies a correct password", async () => {
    const hash = await hashPassword("hunter2!")
    expect(await verifyPassword("hunter2!", hash)).toBe(true)
  })

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("hunter2!")
    expect(await verifyPassword("wrong", hash)).toBe(false)
  })

  it("two hashes of the same password are different (salt)", async () => {
    const a = await hashPassword("hunter2!")
    const b = await hashPassword("hunter2!")
    expect(a).not.toBe(b)
  })

  it("returns false for a malformed stored value", async () => {
    expect(await verifyPassword("anything", "notahash")).toBe(false)
  })
})

describe("generateToken", () => {
  it("starts with tok_", () => {
    expect(generateToken()).toMatch(/^tok_/)
  })

  it("is 68 characters long (tok_ + 64 hex)", () => {
    expect(generateToken()).toHaveLength(68)
  })

  it("is unique across 100 calls", () => {
    const tokens = new Set(Array.from({ length: 100 }, generateToken))
    expect(tokens.size).toBe(100)
  })
})

describe("hashToken", () => {
  it("returns a 64-char hex SHA-256", () => {
    expect(hashToken("tok_abc")).toMatch(/^[a-f0-9]{64}$/)
  })

  it("is deterministic", () => {
    expect(hashToken("tok_abc")).toBe(hashToken("tok_abc"))
  })
})

describe("generateUrlToken", () => {
  it("is a 48-char hex string", () => {
    expect(generateUrlToken()).toMatch(/^[a-f0-9]{48}$/)
  })
})

describe("makeDebugUrl", () => {
  it("includes the token in the url", () => {
    const d = makeDebugUrl("https://apicamp.dev", "/api/en/v1/auth/basic/verify-email", "abc")
    expect(d.url).toBe("https://apicamp.dev/api/en/v1/auth/basic/verify-email?token=abc")
    expect(d.note).toBeTruthy()
  })
})

describe("validateEmail", () => {
  it("accepts valid emails", () => {
    expect(validateEmail("alice@example.com")).toBeNull()
  })

  it("rejects missing @", () => {
    expect(validateEmail("notanemail")).not.toBeNull()
  })

  it("rejects empty string", () => {
    expect(validateEmail("")).not.toBeNull()
  })
})

describe("validatePassword", () => {
  it("accepts 8+ char password", () => {
    expect(validatePassword("hunter2!")).toBeNull()
  })

  it("rejects under 8 chars", () => {
    expect(validatePassword("short")).not.toBeNull()
  })

  it("rejects over 72 chars", () => {
    expect(validatePassword("a".repeat(73))).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run tests — all must pass**
```bash
pnpm test
```
Expected: all new tests pass (pure functions, no DB needed).

- [ ] **Step 3: Commit**
```bash
git add src/lib/__tests__/auth-practice.test.ts
git commit -m "test: add unit tests for auth-practice pure functions"
```

---

## Task 4: Route dispatch — detect auth resource in route.ts

**Files:** Modify `src/app/api/[...segments]/route.ts`

Three changes:
1. Add `tail: string[]` to `ParsedSegments` (all segments at and after the resource)
2. In `GET/POST/PUT/DELETE` handlers: detect `resource === "auth"` and dispatch to auth handler
3. Auth handler does its own API key validation + rate limiting (reuses the same bootstrap, skips table config lookup)

- [ ] **Step 1: Add `tail` to `ParsedSegments` and `parseSegments()`**

Find the `ParsedSegments` type:
```ts
type ParsedSegments = {
  locale: string
  version: string
  behaviors: string[]
  resource: string | null
  id: string | null
}
```
Replace with:
```ts
type ParsedSegments = {
  locale: string
  version: string
  behaviors: string[]
  resource: string | null
  id: string | null
  tail: string[]   // all segments from resource onwards — used by auth handler
}
```

Find the `parseSegments` function's return statement:
```ts
  return { locale, version, behaviors, resource, id }
```
Replace with:
```ts
  return { locale, version, behaviors, resource, id, tail: resource ? segments.slice(segments.indexOf(resource)) : [] }
```

Wait — `segments.indexOf(resource)` could match the wrong index if a locale happens to equal the resource name. Use the loop index instead. Modify the loop to capture `resourceIndex`:

Replace the entire `parseSegments` function:
```ts
function parseSegments(segments: string[]): ParsedSegments {
  let locale   = "en"
  let version  = "v1"
  const behaviors: string[] = []
  let resource: string | null = null
  let id: string | null = null
  let tail: string[] = []

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    if (LOCALES.has(seg))   { locale = seg; continue }
    if (VERSIONS.has(seg))  { version = seg; continue }
    if (BEHAVIORS.has(seg)) { behaviors.push(seg); continue }
    resource = seg
    id       = segments[i + 1] ?? null
    tail     = segments.slice(i)   // ["auth", "basic", "signup"] or ["users", "123"]
    break
  }

  return { locale, version, behaviors, resource, id, tail }
}
```

- [ ] **Step 2: Add auth dispatch to each HTTP method handler**

In `route.ts`, each of the exported HTTP handlers (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`) calls `bootstrap()` and then handles the request. The `bootstrap()` function currently fails if `resource === "auth"` because `getTableConfig("auth")` returns null.

Add an auth short-circuit **before** the `getTableConfig` call inside `bootstrap()`:

Find in `bootstrap()`:
```ts
  const config = getTableConfig(resource)
  if (!config) {
    return { error: NextResponse.json({ error: `Unknown resource: ${resource}` }, { status: 404 }) }
  }
```

Replace with:
```ts
  // Auth practice endpoints are handled separately — no table config needed
  if (resource === "auth") {
    return { account, config: null as unknown as TableConfig, parsed }
  }

  const config = getTableConfig(resource)
  if (!config) {
    return { error: NextResponse.json({ error: `Unknown resource: ${resource}` }, { status: 404 }) }
  }
```

Then in each HTTP method handler, add auth dispatch at the top, right after the bootstrap call and the `"error" in result` check. Example pattern for `POST`:

```ts
// After: if ("error" in result) return result.error
// Add:
if (result.parsed.resource === "auth") {
  return handleAuthRequest(req, result.parsed, result.account, "POST")
}
```

Do this for `GET`, `POST`, `PUT`, `DELETE` (PATCH too if it exists), passing the correct method string.

Also add the import at the top of route.ts:
```ts
import { handleAuthRequest } from "@/lib/auth-practice-handlers"
```

- [ ] **Step 3: Create stub `src/lib/auth-practice-handlers.ts`**

Create a minimal stub so the build passes before the full handlers are implemented in Tasks 5-7:

```ts
import { NextRequest, NextResponse } from "next/server"
import type { Account } from "@/lib/auth"
import type { ParsedSegments } from "@/app/api/[...segments]/route"  // — see note below

// NOTE: ParsedSegments is not exported from route.ts — inline the needed shape here
type AuthParsedSegments = {
  tail: string[]
  behaviors: string[]
  locale: string
  version: string
}

export async function handleAuthRequest(
  req: NextRequest,
  parsed: { tail: string[]; behaviors: string[]; locale: string; version: string },
  account: Account,
  method: string
): Promise<NextResponse> {
  // tail = ["auth", tier, action, ...]
  const tier   = parsed.tail[1]
  const action = parsed.tail[2]

  return NextResponse.json(
    { error: `Auth endpoint not yet implemented: ${tier}/${action} [${method}]` },
    { status: 501 }
  )
}
```

- [ ] **Step 4: Verify build**
```bash
pnpm build
```

- [ ] **Step 5: Commit**
```bash
git add src/app/api/[...segments]/route.ts src/lib/auth-practice-handlers.ts
git commit -m "feat: add auth resource detection and dispatch in route.ts"
```

---

## Task 5: Basic tier handlers

**Files:** Modify `src/lib/auth-practice-handlers.ts`

Implements: `POST auth/basic/signup`, `POST auth/basic/signin`, `GET auth/basic/verify-email`, `POST auth/basic/signout`

- [ ] **Step 1: Replace `src/lib/auth-practice-handlers.ts` with the full implementation**

```ts
import { NextRequest, NextResponse } from "next/server"
import type { Account } from "@/lib/auth"
import {
  signupAccount, signinAccount, verifyEmail,
  validateEmail, validatePassword,
  validatePracticeToken, signoutToken,
  initPasswordReset, resetPassword,
  getOrCreateProfile, updateProfile, deleteAccount,
  makeDebugUrl, generateToken,
} from "@/lib/auth-practice"

type Parsed = {
  tail: string[]
  behaviors: string[]
  locale: string
  version: string
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export async function handleAuthRequest(
  req: NextRequest,
  parsed: Parsed,
  account: Account,
  method: string
): Promise<NextResponse> {
  const tier   = parsed.tail[1] as "basic" | "token" | "profile" | undefined
  const action = parsed.tail[2] as string | undefined

  // Apply delay modifier
  const delay = parsed.behaviors.includes("slow3") ? 3000
              : parsed.behaviors.includes("slow2") ? 1500
              : parsed.behaviors.includes("slow1") ? 500
              : 0
  if (delay > 0) await new Promise(r => setTimeout(r, delay))

  // Chaos modifier
  if (parsed.behaviors.includes("chaos") && Math.random() < 0.3) {
    const errors = [
      { status: 500, error: "Internal Server Error" },
      { status: 503, error: "Service Unavailable" },
      { status: 504, error: "Gateway Timeout" },
    ]
    const e = errors[Math.floor(Math.random() * errors.length)]
    return NextResponse.json({ error: e.error }, { status: e.status })
  }

  if (!tier || !["basic", "token", "profile"].includes(tier)) {
    return NextResponse.json(
      { error: "Unknown auth tier. Use: auth/basic, auth/token, or auth/profile" },
      { status: 404 }
    )
  }

  if (!action) {
    return NextResponse.json({ error: "No action specified" }, { status: 404 })
  }

  if (tier === "basic") return handleBasic(req, action, method, account, parsed)
  if (tier === "token") return handleToken(req, action, method, account, parsed)
  return handleProfile(req, action, method, account, parsed)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function baseUrl(req: NextRequest): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? `${req.nextUrl.protocol}//${req.nextUrl.host}`
}

function bearerToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization") ?? ""
  return auth.startsWith("Bearer ") ? auth.slice(7) : null
}

async function parseBody(req: NextRequest): Promise<Record<string, unknown>> {
  try { return await req.json() } catch { return {} }
}

// ─── BASIC tier ───────────────────────────────────────────────────────────────

async function handleBasic(
  req: NextRequest,
  action: string,
  method: string,
  account: Account,
  parsed: Parsed
): Promise<NextResponse> {
  const url = req.nextUrl

  // POST /auth/basic/signup
  if (action === "signup" && method === "POST") {
    const body     = await parseBody(req)
    const email    = typeof body.email    === "string" ? body.email.toLowerCase().trim() : ""
    const password = typeof body.password === "string" ? body.password : ""

    const emailErr = validateEmail(email)
    if (emailErr) return NextResponse.json({ error: emailErr }, { status: 400 })
    const passErr = validatePassword(password)
    if (passErr) return NextResponse.json({ error: passErr }, { status: 400 })

    let result
    try { result = await signupAccount("basic", account.id, email, password) }
    catch { return NextResponse.json({ error: "Failed to create account" }, { status: 500 }) }

    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

    const debug = makeDebugUrl(
      baseUrl(req),
      `/api/${parsed.locale}/${parsed.version}/auth/basic/verify-email`,
      result.verificationToken
    )

    return NextResponse.json(
      { success: true, account: result.account, debug },
      { status: 201 }
    )
  }

  // POST /auth/basic/signin
  if (action === "signin" && method === "POST") {
    const body     = await parseBody(req)
    const email    = typeof body.email    === "string" ? body.email.toLowerCase().trim() : ""
    const password = typeof body.password === "string" ? body.password : ""

    if (!email || !password) {
      return NextResponse.json({ error: "email and password are required" }, { status: 400 })
    }

    let result
    try { result = await signinAccount("basic", account.id, email, password) }
    catch { return NextResponse.json({ error: "Signin failed" }, { status: 500 }) }

    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

    return NextResponse.json({ success: true, account: result.account })
  }

  // GET /auth/basic/verify-email?token=...
  if (action === "verify-email" && method === "GET") {
    const token = url.searchParams.get("token")
    if (!token) return NextResponse.json({ error: "token query param is required" }, { status: 400 })

    let result
    try { result = await verifyEmail("basic", account.id, token) }
    catch { return NextResponse.json({ error: "Verification failed" }, { status: 500 }) }

    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

    return NextResponse.json({ success: true, message: "Email verified. You can now sign in." })
  }

  // POST /auth/basic/signout
  if (action === "signout" && method === "POST") {
    return NextResponse.json({
      success: true,
      message: "Signed out. (Basic tier has no session token to invalidate — see auth/token for stateful signout.)",
    })
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 404 })
}

// ─── TOKEN tier ───────────────────────────────────────────────────────────────

async function handleToken(
  req: NextRequest,
  action: string,
  method: string,
  account: Account,
  parsed: Parsed
): Promise<NextResponse> {
  const url = req.nextUrl

  if (action === "signup" && method === "POST") {
    const body     = await parseBody(req)
    const email    = typeof body.email    === "string" ? body.email.toLowerCase().trim() : ""
    const password = typeof body.password === "string" ? body.password : ""

    const emailErr = validateEmail(email)
    if (emailErr) return NextResponse.json({ error: emailErr }, { status: 400 })
    const passErr = validatePassword(password)
    if (passErr) return NextResponse.json({ error: passErr }, { status: 400 })

    let result
    try { result = await signupAccount("token", account.id, email, password) }
    catch { return NextResponse.json({ error: "Failed to create account" }, { status: 500 }) }

    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

    // Issue a session token immediately on signup
    const signinResult = await signinAccount("token", account.id, email, password)
    const token = signinResult.ok ? signinResult.token : undefined

    const debug = makeDebugUrl(
      baseUrl(req),
      `/api/${parsed.locale}/${parsed.version}/auth/token/verify-email`,
      result.verificationToken
    )

    return NextResponse.json(
      { success: true, token, account: result.account, debug },
      { status: 201 }
    )
  }

  if (action === "signin" && method === "POST") {
    const body     = await parseBody(req)
    const email    = typeof body.email    === "string" ? body.email.toLowerCase().trim() : ""
    const password = typeof body.password === "string" ? body.password : ""

    if (!email || !password) {
      return NextResponse.json({ error: "email and password are required" }, { status: 400 })
    }

    let result
    try { result = await signinAccount("token", account.id, email, password) }
    catch { return NextResponse.json({ error: "Signin failed" }, { status: 500 }) }

    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

    return NextResponse.json({ success: true, token: result.token, account: result.account })
  }

  if (action === "signout" && method === "POST") {
    const raw = bearerToken(req)
    if (!raw) return NextResponse.json({ error: "Authorization: Bearer <token> header required" }, { status: 401 })

    try { await signoutToken("token", raw) }
    catch { return NextResponse.json({ error: "Signout failed" }, { status: 500 }) }

    return NextResponse.json({ success: true, message: "Token invalidated." })
  }

  if (action === "me" && method === "GET") {
    const raw = bearerToken(req)
    if (!raw) return NextResponse.json({ error: "Authorization: Bearer <token> header required" }, { status: 401 })

    const result = await validatePracticeToken("token", account.id, raw)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

    return NextResponse.json({ account: result.account })
  }

  if (action === "verify-email" && method === "GET") {
    const token = url.searchParams.get("token")
    if (!token) return NextResponse.json({ error: "token query param is required" }, { status: 400 })

    let result
    try { result = await verifyEmail("token", account.id, token) }
    catch { return NextResponse.json({ error: "Verification failed" }, { status: 500 }) }

    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

    return NextResponse.json({ success: true, message: "Email verified." })
  }

  if (action === "forgot-password" && method === "POST") {
    const body  = await parseBody(req)
    const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : ""

    if (!email) return NextResponse.json({ error: "email is required" }, { status: 400 })

    let resetToken: string | null = null
    try { resetToken = await initPasswordReset("token", account.id, email) }
    catch { return NextResponse.json({ error: "Request failed" }, { status: 500 }) }

    // Always return 200 — never reveal if email exists
    const response: Record<string, unknown> = {
      message: "If that email is registered, a reset link has been sent.",
    }
    if (resetToken) {
      response.debug = makeDebugUrl(
        baseUrl(req),
        `/api/${parsed.locale}/${parsed.version}/auth/token/reset-password`,
        resetToken
      )
    }
    return NextResponse.json(response)
  }

  if (action === "reset-password" && method === "POST") {
    const token    = url.searchParams.get("token")
    const body     = await parseBody(req)
    const password = typeof body.password === "string" ? body.password : ""

    if (!token) return NextResponse.json({ error: "token query param is required" }, { status: 400 })
    const passErr = validatePassword(password)
    if (passErr) return NextResponse.json({ error: passErr }, { status: 400 })

    let result
    try { result = await resetPassword("token", account.id, token, password) }
    catch { return NextResponse.json({ error: "Reset failed" }, { status: 500 }) }

    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

    return NextResponse.json({ success: true, message: "Password updated. Please sign in again." })
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 404 })
}

// ─── PROFILE tier ─────────────────────────────────────────────────────────────

async function handleProfile(
  req: NextRequest,
  action: string,
  method: string,
  account: Account,
  parsed: Parsed
): Promise<NextResponse> {
  const url = req.nextUrl

  // All token-tier flows exist on profile tier too — delegate with tier swap
  if (["signup", "signin", "signout", "verify-email", "forgot-password", "reset-password"].includes(action)) {
    // Re-run through handleToken logic but using profile tables
    // We achieve this by calling the DB functions directly with tier="profile"

    if (action === "signup" && method === "POST") {
      const body     = await parseBody(req)
      const email    = typeof body.email    === "string" ? body.email.toLowerCase().trim() : ""
      const password = typeof body.password === "string" ? body.password : ""

      const emailErr = validateEmail(email)
      if (emailErr) return NextResponse.json({ error: emailErr }, { status: 400 })
      const passErr = validatePassword(password)
      if (passErr) return NextResponse.json({ error: passErr }, { status: 400 })

      let result
      try { result = await signupAccount("profile", account.id, email, password) }
      catch { return NextResponse.json({ error: "Failed to create account" }, { status: 500 }) }

      if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

      const signinResult = await signinAccount("profile", account.id, email, password)
      const token = signinResult.ok ? signinResult.token : undefined

      const debug = makeDebugUrl(
        baseUrl(req),
        `/api/${parsed.locale}/${parsed.version}/auth/profile/verify-email`,
        result.verificationToken
      )

      return NextResponse.json({ success: true, token, account: result.account, debug }, { status: 201 })
    }

    if (action === "signin" && method === "POST") {
      const body     = await parseBody(req)
      const email    = typeof body.email    === "string" ? body.email.toLowerCase().trim() : ""
      const password = typeof body.password === "string" ? body.password : ""

      if (!email || !password) {
        return NextResponse.json({ error: "email and password are required" }, { status: 400 })
      }

      let result
      try { result = await signinAccount("profile", account.id, email, password) }
      catch { return NextResponse.json({ error: "Signin failed" }, { status: 500 }) }

      if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

      return NextResponse.json({ success: true, token: result.token, account: result.account })
    }

    if (action === "signout" && method === "POST") {
      const raw = bearerToken(req)
      if (!raw) return NextResponse.json({ error: "Authorization: Bearer <token> header required" }, { status: 401 })
      try { await signoutToken("profile", raw) }
      catch { return NextResponse.json({ error: "Signout failed" }, { status: 500 }) }
      return NextResponse.json({ success: true, message: "Token invalidated." })
    }

    if (action === "verify-email" && method === "GET") {
      const token = url.searchParams.get("token")
      if (!token) return NextResponse.json({ error: "token query param is required" }, { status: 400 })
      let result
      try { result = await verifyEmail("profile", account.id, token) }
      catch { return NextResponse.json({ error: "Verification failed" }, { status: 500 }) }
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
      return NextResponse.json({ success: true, message: "Email verified." })
    }

    if (action === "forgot-password" && method === "POST") {
      const body  = await parseBody(req)
      const email = typeof body.email === "string" ? body.email.toLowerCase().trim() : ""
      if (!email) return NextResponse.json({ error: "email is required" }, { status: 400 })
      let resetToken: string | null = null
      try { resetToken = await initPasswordReset("profile", account.id, email) }
      catch { return NextResponse.json({ error: "Request failed" }, { status: 500 }) }
      const response: Record<string, unknown> = {
        message: "If that email is registered, a reset link has been sent.",
      }
      if (resetToken) {
        response.debug = makeDebugUrl(
          baseUrl(req),
          `/api/${parsed.locale}/${parsed.version}/auth/profile/reset-password`,
          resetToken
        )
      }
      return NextResponse.json(response)
    }

    if (action === "reset-password" && method === "POST") {
      const token    = url.searchParams.get("token")
      const body     = await parseBody(req)
      const password = typeof body.password === "string" ? body.password : ""
      if (!token) return NextResponse.json({ error: "token query param is required" }, { status: 400 })
      const passErr = validatePassword(password)
      if (passErr) return NextResponse.json({ error: passErr }, { status: 400 })
      let result
      try { result = await resetPassword("profile", account.id, token, password) }
      catch { return NextResponse.json({ error: "Reset failed" }, { status: 500 }) }
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
      return NextResponse.json({ success: true, message: "Password updated. Please sign in again." })
    }
  }

  // GET /auth/profile/me
  if (action === "me" && method === "GET") {
    const raw = bearerToken(req)
    if (!raw) return NextResponse.json({ error: "Authorization: Bearer <token> header required" }, { status: 401 })

    const tokenResult = await validatePracticeToken("profile", account.id, raw)
    if (!tokenResult.ok) return NextResponse.json({ error: tokenResult.error }, { status: tokenResult.status })

    let profile
    try { profile = await getOrCreateProfile(tokenResult.accountId) }
    catch { return NextResponse.json({ error: "Failed to load profile" }, { status: 500 }) }

    return NextResponse.json({ account: tokenResult.account, profile })
  }

  // PUT /auth/profile/me
  if (action === "me" && method === "PUT") {
    const raw = bearerToken(req)
    if (!raw) return NextResponse.json({ error: "Authorization: Bearer <token> header required" }, { status: 401 })

    const tokenResult = await validatePracticeToken("profile", account.id, raw)
    if (!tokenResult.ok) return NextResponse.json({ error: tokenResult.error }, { status: tokenResult.status })

    const body = await parseBody(req)
    const fields: Record<string, string> = {}

    if (typeof body.displayName === "string") {
      if (body.displayName.length > 80) return NextResponse.json({ error: "displayName max 80 chars" }, { status: 400 })
      fields.displayName = body.displayName
    }
    if (typeof body.bio === "string") {
      if (body.bio.length > 500) return NextResponse.json({ error: "bio max 500 chars" }, { status: 400 })
      fields.bio = body.bio
    }
    if (typeof body.avatarUrl === "string") {
      try { new URL(body.avatarUrl) } catch { return NextResponse.json({ error: "avatarUrl must be a valid URL" }, { status: 400 }) }
      fields.avatarUrl = body.avatarUrl
    }
    if (typeof body.location === "string") fields.location = body.location
    if (typeof body.website  === "string") {
      try { new URL(body.website) } catch { return NextResponse.json({ error: "website must be a valid URL" }, { status: 400 }) }
      fields.website = body.website
    }

    let profile
    try { profile = await updateProfile(tokenResult.accountId, fields) }
    catch { return NextResponse.json({ error: "Failed to update profile" }, { status: 500 }) }

    return NextResponse.json({ profile })
  }

  // DELETE /auth/profile/me
  if (action === "me" && method === "DELETE") {
    const raw = bearerToken(req)
    if (!raw) return NextResponse.json({ error: "Authorization: Bearer <token> header required" }, { status: 401 })

    const tokenResult = await validatePracticeToken("profile", account.id, raw)
    if (!tokenResult.ok) return NextResponse.json({ error: tokenResult.error }, { status: tokenResult.status })

    try { await deleteAccount("profile", tokenResult.accountId) }
    catch { return NextResponse.json({ error: "Failed to delete account" }, { status: 500 }) }

    return NextResponse.json({ success: true, message: "Account and profile deleted." })
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 404 })
}
```

- [ ] **Step 2: Run tests + build**
```bash
pnpm test
pnpm build
```
Both must pass.

- [ ] **Step 3: Commit**
```bash
git add src/lib/auth-practice-handlers.ts
git commit -m "feat: implement all 3 auth tier handlers — basic, token, profile"
```

---

## Task 6: Sidebar + docs pages

**Files:**
- Modify `src/app/docs/layout.tsx` — add Auth Practice section
- Create `src/app/docs/auth/basic/page.tsx`
- Create `src/app/docs/auth/token/page.tsx`
- Create `src/app/docs/auth/profile/page.tsx`

- [ ] **Step 1: Update `src/app/docs/layout.tsx`**

Find where the sidebar lists are built (from `Object.values(registry)`). Add a hardcoded "Auth Practice" section below the data tables section. The auth docs are not config-driven (they have a different structure), so list them manually:

```tsx
{/* Auth Practice section */}
<div className="mt-6">
  <p className="px-3 mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
    Auth Practice
  </p>
  {[
    { slug: "auth/basic",   label: "Basic Auth" },
    { slug: "auth/token",   label: "Token Auth" },
    { slug: "auth/profile", label: "Profile Auth" },
  ].map(item => (
    <Link
      key={item.slug}
      href={`/docs/${item.slug}`}
      className="block rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
    >
      {item.label}
    </Link>
  ))}
</div>
```

- [ ] **Step 2: Create docs pages for each tier**

Read the existing `/docs/[table]/page.tsx` to understand the layout patterns, then create three manually-written docs pages. Each page follows the same visual structure but lists actions instead of CRUD fields.

**`src/app/docs/auth/basic/page.tsx`** — endpoint table covering signup, signin, verify-email, signout. Show request body shape, response shape, and the `debug` field explanation.

**`src/app/docs/auth/token/page.tsx`** — all basic flows plus token-specific: `/me` (requires `Authorization: Bearer`), `/forgot-password`, `/reset-password`. Document the token format (`tok_` + 64 hex), 24h expiry.

**`src/app/docs/auth/profile/page.tsx`** — all token flows plus GET/PUT/DELETE `/me` with profile shape. Show the full profile object structure.

Each page should include:
- A short intro (1-2 sentences on what this tier teaches)
- Base URL: `/api/[modifiers]/auth/{tier}/{action}`
- Modifiers note (slow, chaos work; empty/random ignored for auth)
- Endpoints table: Method | Path | Auth required | Description
- Request/response examples in `<code>` blocks

- [ ] **Step 3: Run build**
```bash
pnpm build
```

- [ ] **Step 4: Commit**
```bash
git add src/app/docs/auth/ src/app/docs/layout.tsx
git commit -m "feat: add auth docs pages and sidebar section for all 3 tiers"
```

---

## Task 7: /auth-explained page

**Files:** Create `src/app/(main)/auth-explained/page.tsx`

A standalone knowledge page — no API reference, pure teaching. Server Component, static content.

- [ ] **Step 1: Create `src/app/(main)/auth-explained/page.tsx`**

Sections (prose + occasional inline code):

1. **What is authentication?** — Proving who you are. Not to be confused with authorisation (what you can do).
2. **Passwords and hashing** — Why we never store plaintext. What a hash is. What salt does (prevents rainbow tables). This API uses `scrypt` — show a conceptual example.
3. **Sessions and tokens** — After you prove who you are, the server gives you a token. You send the token on every subsequent request instead of your password. Explain the `Authorization: Bearer` header.
4. **Email verification** — Why it exists (prove you own the email). What happens in a real app (a link with a one-time token is emailed). What this API does instead (returns the URL in `debug`).
5. **Password reset** — Reset tokens expire (1 hour here) because they're single-use credentials. Why we never confirm if an email exists (user enumeration).
6. **Protected endpoints** — What it means for an endpoint to be "protected". The server reads the token, looks it up, decides if it's valid.
7. **Account vs user** — An account is credentials (email + password hash). A user/profile is data about a person. Apps often merge these but they're conceptually different.
8. **What this API simplifies** — Honest note: no real emails, tokens are opaque random strings (not JWTs), no HTTPS enforcement in practice mode.

Style: use `<h2>`, `<p>`, `<code>`, `<pre>` with Tailwind prose classes. Keep it readable and beginner-friendly.

- [ ] **Step 2: Add link in the sidebar or navigation**

In `src/app/docs/layout.tsx`, below the Auth Practice section, add a "Learn" section or a standalone link:

```tsx
<div className="mt-6">
  <p className="px-3 mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
    Learn
  </p>
  <Link
    href="/auth-explained"
    className="block rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
  >
    Auth Explained
  </Link>
</div>
```

- [ ] **Step 3: Build**
```bash
pnpm build
```

- [ ] **Step 4: Commit**
```bash
git add src/app/(main)/auth-explained/
git commit -m "feat: add /auth-explained knowledge page"
```

---

## What Part 2 will cover

- Refresh tokens (`POST /auth/token/refresh`, `POST /auth/profile/refresh`)
- Short-lived access token (15 min) + long-lived refresh token (7 days)
- Roles & permissions (new spec, new tables — `auth_accounts_roles` family)
