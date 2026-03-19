# API Key System — Implementation Plan (Part 1 of 2)

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the foundation of the API key system — database schema, real API key auth, personal key lifecycle (generate, display, regenerate), and gift key flow (generate + activate).

**Architecture:** Four layers: SQL schema (run once in Supabase); `lib/keys.ts` for all key business logic (pure utilities + DB ops); API routes under `/api/keys/` for mutations (use Supabase session auth, not API key); Server Component dashboard and activate page for UI. The dashboard reads directly from Supabase using the user's cookie session — it does NOT go through the external API. The external API (`/api/[...segments]/route.ts`) uses API key auth for external consumers only.

**Tech Stack:** Next.js 16 App Router, Supabase Postgres + Auth SSR client, `node:crypto` (SHA-256) for key hashing, Vitest for unit tests on pure functions.

**Spec:** `docs/superpowers/specs/2026-03-19-api-key-system-design.md`

**Part 2 covers:** Pool key system (YouTuber dashboard, donate to pool), public pool request flow, admin `/admin/keys` page.

---

## File Map

**New files:**
- `docs/sql/profiles-and-keys.sql` — complete DB migration
- `src/lib/keys.ts` — key generation, hashing, expiry, DB operations
- `src/lib/__tests__/keys.test.ts` — unit tests for pure functions
- `src/app/api/keys/generate/route.ts` — POST: generate or regenerate personal key
- `src/app/api/keys/gift/route.ts` — POST: generate a gift key
- `src/app/api/keys/activate/route.ts` — POST: claim a gift key by code
- `src/app/(main)/dashboard/page.tsx` — full dashboard (replaces placeholder)
- `src/app/(main)/activate/page.tsx` — public key activation page (client component)

**Modified files:**
- `src/app/auth/callback/route.ts` — create `profiles` row after session exchange
- `src/lib/auth.ts` — replace stub with real `validateApiKey()`
- `src/lib/rateLimit.ts` — remove free/paid tier split, single limit set
- `src/lib/auth.ts` — update `Account` type, implement `validateApiKey()` with discriminated return type
- `package.json` — add `vitest` + `@vitest/ui` dev deps

---

## Task 1: SQL migration

**Files:**
- Create: `docs/sql/profiles-and-keys.sql`

Run this in the Supabase SQL editor. No automated test — verify by checking the Tables view after running.

- [ ] **Step 1: Create the migration file**

```sql
-- ─────────────────────────────────────────────────────────────────────────────
-- profiles-and-keys.sql
-- Run in Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── ENUMS ───────────────────────────────────────────────────────────────────

CREATE TYPE profile_role AS ENUM ('user', 'locale_admin', 'youtuber', 'superadmin');
CREATE TYPE key_type     AS ENUM ('personal', 'gift', 'pool');
CREATE TYPE key_status   AS ENUM ('active', 'unclaimed', 'donated', 'expired', 'revoked');
CREATE TYPE req_status   AS ENUM ('pending', 'approved', 'rejected');

-- ─── PROFILES ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id          UUID          PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        profile_role  NOT NULL DEFAULT 'user',
  is_blocked  BOOLEAN       NOT NULL DEFAULT false,
  ever_paid   BOOLEAN       NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Auto-create profile on signup (role = superadmin if email matches ADMIN_EMAIL,
-- otherwise 'user'). The application also creates the profile in the auth callback
-- as a fallback — the trigger is the primary path.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, role)
  VALUES (
    NEW.id,
    CASE WHEN NEW.email = current_setting('app.admin_email', true)
         THEN 'superadmin'::profile_role
         ELSE 'user'::profile_role
    END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── API KEYS ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS api_keys (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash          TEXT        UNIQUE NOT NULL,
  prefix            TEXT        NOT NULL,
  owner_id          UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  creator_id        UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  type              key_type    NOT NULL,
  status            key_status  NOT NULL DEFAULT 'unclaimed',
  expires_at        TIMESTAMPTZ,
  pool_expires_days INTEGER,
  activated_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_api_keys_owner    ON api_keys (owner_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_creator  ON api_keys (creator_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_status   ON api_keys (status);

-- ─── SUBSCRIPTIONS ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS subscriptions (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount_paid       INTEGER     NOT NULL,
  base_price        INTEGER     NOT NULL,
  gift_keys_earned  INTEGER     NOT NULL DEFAULT 0,
  gift_keys_used    INTEGER     NOT NULL DEFAULT 0,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at        TIMESTAMPTZ NOT NULL,
  payment_ref       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions (user_id, expires_at DESC);

-- ─── POOL KEY REQUESTS ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pool_key_requests (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason           TEXT        NOT NULL,
  status           req_status  NOT NULL DEFAULT 'pending',
  assigned_key_id  UUID        REFERENCES api_keys(id) ON DELETE SET NULL,
  admin_note       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pool_requests_status ON pool_key_requests (status, created_at DESC);

-- ─── HELPER FUNCTIONS ────────────────────────────────────────────────────────

-- Auto-update updated_at on pool_key_requests
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER pool_key_requests_updated_at
  BEFORE UPDATE ON pool_key_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Increment gift_keys_used on a subscription (called by createGiftKey)
CREATE OR REPLACE FUNCTION increment_gift_keys_used(p_subscription_id uuid)
RETURNS void LANGUAGE sql AS $$
  UPDATE subscriptions SET gift_keys_used = gift_keys_used + 1 WHERE id = p_subscription_id;
$$;

-- ─── RLS ─────────────────────────────────────────────────────────────────────
-- Service role (used server-side) bypasses RLS.
-- Authenticated users can only read their own profile and keys.

ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys         ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE pool_key_requests ENABLE ROW LEVEL SECURITY;

-- Profiles: users see and edit only their own
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- API keys: owners see their own keys; unclaimed keys are hidden (claimed via API route only)
CREATE POLICY "api_keys_select_own" ON api_keys FOR SELECT USING (auth.uid() = owner_id OR auth.uid() = creator_id);

-- Subscriptions: users see their own
CREATE POLICY "subscriptions_select_own" ON subscriptions FOR SELECT USING (auth.uid() = user_id);

-- Pool requests: users see their own
CREATE POLICY "pool_requests_select_own" ON pool_key_requests FOR SELECT USING (auth.uid() = requester_id);
```

- [ ] **Step 2: Paste into Supabase SQL editor and run**

In Supabase dashboard → SQL Editor → New query → paste → Run.

Expected: No errors. Check Tables sidebar shows `profiles`, `api_keys`, `subscriptions`, `pool_key_requests`.

- [ ] **Step 3: Set the admin_email config in Supabase**

In Supabase SQL Editor run:
```sql
ALTER DATABASE postgres SET "app.admin_email" = 'admin@apicamp.com';
```
Replace with your actual `ADMIN_EMAIL` value. This makes the trigger set `role = 'superadmin'` for that email.

- [ ] **Step 4: Commit the migration file**
```bash
git add docs/sql/profiles-and-keys.sql
git commit -m "feat: add profiles, api_keys, subscriptions, pool_key_requests SQL migration"
```

---

## Task 2: Update `Account` type

**Files:**
- Modify: `src/lib/auth.ts`

The `Account` type is used by `auth.ts`, `rateLimit.ts`, and `route.ts`. Update it first so TypeScript errors guide the rest of the work.

- [ ] **Step 1: Replace the Account type in `src/lib/auth.ts`**

Replace the entire file content:

```ts
// lib/auth.ts

export type Account = {
  id: string
  role: "user" | "locale_admin" | "youtuber" | "superadmin"
  isBlocked: boolean
  everPaid: boolean
}

/** Discriminated return type — lets bootstrap emit spec-correct error messages */
export type ValidateKeyResult =
  | { ok: true;  account: Account }
  | { ok: false; status: 401 | 403; message: string }

/**
 * Validates an API key from the x-api-key header.
 * Implementation in Task 5 — stub kept until then.
 */
export async function validateApiKey(_key: string | null): Promise<ValidateKeyResult> {
  // TODO: implement in Task 5
  return {
    ok: true,
    account: {
      id: "00000000-0000-0000-0000-000000000000",
      role: "user",
      isBlocked: false,
      everPaid: false,
    },
  }
}
```

- [ ] **Step 2: Fix the TypeScript error in `src/lib/rateLimit.ts`**

`rateLimit.ts` currently uses `account.tier`. Replace the `LIMITS` constant and the lookup:

```ts
// Replace the entire LIMITS constant with:
const LIMITS = {
  default: { daily: 1750, minute: 350 },
} as const

// Replace:
//   const limits = LIMITS[account.tier]
// With:
const limits = LIMITS.default
```

- [ ] **Step 3: Fix `src/app/api/[...segments]/route.ts` — update bootstrap for new return type**

`validateApiKey` now returns `ValidateKeyResult` instead of `Account | null`. Update the bootstrap function:

Find:
```ts
const account = await validateApiKey(apiKey)
if (!account) {
  return { error: NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 }) }
}
```
Replace with:
```ts
const keyResult = await validateApiKey(apiKey)
if (!keyResult.ok) {
  return { error: NextResponse.json({ error: keyResult.message }, { status: keyResult.status }) }
}
const { account } = keyResult
```

Also replace any `account.tier === "free"` → `!account.everPaid` and `account.tier === "paid"` → `account.everPaid` in the handler bodies.

Run `pnpm build` to confirm no TypeScript errors.

- [ ] **Step 4: Commit**
```bash
git add src/lib/auth.ts src/lib/rateLimit.ts src/app/api/
git commit -m "feat: update Account type, remove tier field, single rate limit tier"
```

---

## Task 3: Vitest setup + key utility tests

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/lib/__tests__/keys.test.ts`

The pure functions in `lib/keys.ts` (Task 4) can be tested without a DB. Write the tests first (TDD).

- [ ] **Step 1: Install Vitest**
```bash
pnpm add -D vitest @vitest/ui
```

- [ ] **Step 2: Create `vitest.config.ts`**
```ts
import { defineConfig } from "vitest/config"
import path from "node:path"

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
```

- [ ] **Step 3: Add test script to `package.json`**

In `scripts`, add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Write failing tests for pure key utilities**

Create `src/lib/__tests__/keys.test.ts`:
```ts
import { describe, it, expect } from "vitest"
import {
  generateRawKey,
  hashKey,
  getPrefix,
  calcExpiresAt,
} from "@/lib/keys"

describe("generateRawKey", () => {
  it("starts with ak_", () => {
    expect(generateRawKey()).toMatch(/^ak_/)
  })

  it("generates unique keys", () => {
    const keys = new Set(Array.from({ length: 100 }, generateRawKey))
    expect(keys.size).toBe(100)
  })

  it("is at least 40 characters long", () => {
    expect(generateRawKey().length).toBeGreaterThanOrEqual(40)
  })
})

describe("hashKey", () => {
  it("returns a 64-char hex string (SHA-256)", () => {
    const h = hashKey("ak_test_key_value")
    expect(h).toMatch(/^[a-f0-9]{64}$/)
  })

  it("is deterministic", () => {
    expect(hashKey("ak_test")).toBe(hashKey("ak_test"))
  })

  it("different keys produce different hashes", () => {
    expect(hashKey("ak_a")).not.toBe(hashKey("ak_b"))
  })
})

describe("getPrefix", () => {
  it("returns ak_ + 8 hex chars (11 chars total)", () => {
    expect(getPrefix("ak_abcdefghijklmn")).toBe("ak_abcdefgh")
  })
})

describe("calcExpiresAt", () => {
  it("personal key expires 14 days from activation", () => {
    const now = new Date("2025-01-01T00:00:00Z")
    const expires = calcExpiresAt("personal", now)
    const diff = expires.getTime() - now.getTime()
    expect(diff).toBe(14 * 24 * 60 * 60 * 1000)
  })

  it("gift key expires 30 days from activation", () => {
    const now = new Date("2025-01-01T00:00:00Z")
    const expires = calcExpiresAt("gift", now)
    const diff = expires.getTime() - now.getTime()
    expect(diff).toBe(30 * 24 * 60 * 60 * 1000)
  })

  it("pool key expires N days from activation", () => {
    const now = new Date("2025-01-01T00:00:00Z")
    const expires = calcExpiresAt("pool", now, 60)
    const diff = expires.getTime() - now.getTime()
    expect(diff).toBe(60 * 24 * 60 * 60 * 1000)
  })
})
```

- [ ] **Step 5: Run tests — expect FAIL (keys.ts doesn't exist yet)**
```bash
pnpm test
```
Expected: FAIL with "Cannot find module '@/lib/keys'"

- [ ] **Step 6: Commit the test setup (tests can be failing)**
```bash
git add vitest.config.ts src/lib/__tests__/ package.json pnpm-lock.yaml
git commit -m "test: add vitest and failing unit tests for key utilities"
```

---

## Task 4: Implement `lib/keys.ts`

**Files:**
- Create: `src/lib/keys.ts`

This is the core of the feature. Pure utilities at the top, DB operations below. Dashboard and API routes import from here.

- [ ] **Step 1: Create `src/lib/keys.ts`**

```ts
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
```

- [ ] **Step 2: Run tests — expect PASS**
```bash
pnpm test
```
Expected: All tests in `keys.test.ts` PASS.

- [ ] **Step 3: Commit**
```bash
git add src/lib/keys.ts
git commit -m "feat: implement lib/keys.ts — key generation, hashing, expiry, DB ops"
```

---

## Task 5: Implement real `validateApiKey()`

**Files:**
- Modify: `src/lib/auth.ts`

Now that `api_keys` and `profiles` exist, replace the stub.

- [ ] **Step 1: Replace stub with real implementation**

Replace the full content of `src/lib/auth.ts`:

```ts
import { createHash } from "node:crypto"
import { createClient } from "@/lib/supabase/server"

export type Account = {
  id: string
  role: "user" | "locale_admin" | "youtuber" | "superadmin"
  isBlocked: boolean
  everPaid: boolean
}

export type ValidateKeyResult =
  | { ok: true;  account: Account }
  | { ok: false; status: 401 | 403; message: string }

const err = (status: 401 | 403, message: string): ValidateKeyResult => ({ ok: false, status, message })

export async function validateApiKey(raw: string | null): Promise<ValidateKeyResult> {
  if (!raw) return err(401, "Missing API key — pass it in the x-api-key header")

  const supabase = await createClient()
  const keyHash = createHash("sha256").update(raw).digest("hex")

  const { data: key } = await supabase
    .from("api_keys")
    .select("id, status, expires_at, owner_id")
    .eq("key_hash", keyHash)
    .single()

  if (!key)                                               return err(401, "Invalid API key")
  if (key.status === "revoked")                           return err(401, "This key has been revoked")
  if (key.status === "unclaimed" || key.status === "donated") return err(401, "Key not yet activated")
  if (key.expires_at && new Date(key.expires_at) < new Date()) return err(401, "Key expired — renew from your dashboard")
  if (!key.owner_id)                                      return err(401, "Key has no owner — contact support")

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, is_blocked, ever_paid")
    .eq("id", key.owner_id)
    .single()

  if (!profile)          return err(401, "Account not found")
  if (profile.is_blocked) return err(403, "Account suspended")

  // Fire-and-forget: update last_used_at
  supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", key.id)
    .then(() => {})

  return {
    ok: true,
    account: {
      id:        profile.id,
      role:      profile.role as Account["role"],
      isBlocked: profile.is_blocked,
      everPaid:  profile.ever_paid,
    },
  }
}
```

- [ ] **Step 2: Update `route.ts` to send correct 401 messages**

In `src/app/api/[...segments]/route.ts`, the bootstrap function currently returns a generic 401. Update the message slightly to match the spec:

Find:
```ts
if (!account) {
  return { error: NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 }) }
}
```
No change needed — message is already correct.

- [ ] **Step 3: Commit**
```bash
git add src/lib/auth.ts
git commit -m "feat: implement real validateApiKey() using api_keys + profiles tables"
```

---

## Task 6: Auth callback creates profile

**Files:**
- Modify: `src/app/auth/callback/route.ts`

After session exchange, upsert a profile row. The SQL trigger (Task 1) is the primary mechanism, but the callback is a reliable fallback for cases where the trigger hasn't fired yet.

- [ ] **Step 1: Update the callback route**

```ts
import { createClient } from "@/lib/supabase/server"
import { NextResponse, type NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin

  if (!code) {
    return NextResponse.redirect(new URL("/auth/login?error=expired", appUrl))
  }

  const client = await createClient()
  const { data: sessionData, error } = await client.auth.exchangeCodeForSession(code)

  if (error || !sessionData.user) {
    return NextResponse.redirect(new URL("/auth/login?error=expired", appUrl))
  }

  const userId = sessionData.user.id
  const email  = sessionData.user.email ?? ""
  const isAdmin = email === process.env.ADMIN_EMAIL

  // Upsert profile — trigger may have already created it
  await client.from("profiles").upsert(
    {
      id:   userId,
      role: isAdmin ? "superadmin" : "user",
    },
    { onConflict: "id", ignoreDuplicates: true }
  )

  return NextResponse.redirect(new URL("/dashboard", appUrl))
}
```

Note: redirect now goes straight to `/dashboard` instead of `/auth/verified`. Update `.env.example` to document `ADMIN_EMAIL`.

- [ ] **Step 2: Add `ADMIN_EMAIL` to `.env.local` and `.env.example`**

In `.env.example` add:
```
ADMIN_EMAIL=admin@apicamp.com
```

- [ ] **Step 3: Commit**
```bash
git add src/app/auth/callback/route.ts .env.example
git commit -m "feat: create profile row on auth callback, redirect to dashboard"
```

---

## Task 7: Key action API routes

**Files:**
- Create: `src/app/api/keys/generate/route.ts`
- Create: `src/app/api/keys/gift/route.ts`
- Create: `src/app/api/keys/activate/route.ts`

These routes use **Supabase session auth** (cookie), not API key auth. They are called from the dashboard UI.

- [ ] **Step 1: Create `src/app/api/keys/generate/route.ts`**

```ts
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
```

- [ ] **Step 2: Create `src/app/api/keys/gift/route.ts`**

```ts
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
```

- [ ] **Step 3: Create `src/app/api/keys/activate/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { claimKey } from "@/lib/keys"

const ERROR_MESSAGES: Record<string, string> = {
  not_found:     "Key not found or invalid",
  already_claimed: "This key has already been activated by someone else",
  expired:       "This key has expired",
  self_claim:    "You cannot activate a gift key you created",
  already_paid:  "You already have or had a paid account — this key is for new users only",
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
```

- [ ] **Step 4: Commit**
```bash
git add src/app/api/keys/
git commit -m "feat: add key action routes — generate, gift, activate"
```

---

## Task 8: Dashboard page

**Files:**
- Modify: `src/app/(main)/dashboard/page.tsx`

Server component. Reads profile + keys + subscription from Supabase using the user's cookie session. Renders the correct state based on spec.

- [ ] **Step 1: Replace the placeholder dashboard**

```tsx
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getActiveKey, getGiftKeys, getExpiredKey } from "@/lib/keys"
import { KeySection } from "./KeySection"
import { GiftKeySection } from "./GiftKeySection"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const [profile, activeKey, expiredKey, giftKeys, subscription] = await Promise.all([
    supabase.from("profiles").select("role, is_blocked, ever_paid").eq("id", user.id).single().then(r => r.data),
    getActiveKey(user.id),
    getExpiredKey(user.id),
    getGiftKeys(user.id),
    supabase.from("subscriptions").select("id, gift_keys_earned, gift_keys_used, expires_at")
      .eq("user_id", user.id).gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }).limit(1).single().then(r => r.data),
  ])

  const hasActiveSub = !!subscription

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
      </div>

      <KeySection
        activeKey={activeKey}
        expiredKey={expiredKey}
        hasActiveSub={hasActiveSub}
        everPaid={profile?.ever_paid ?? false}
      />

      {hasActiveSub && subscription && (
        <GiftKeySection
          giftKeys={giftKeys}
          giftKeysEarned={subscription.gift_keys_earned}
          giftKeysUsed={subscription.gift_keys_used}
        />
      )}

      {!profile?.ever_paid && !activeKey && !expiredKey && (
        <section className="rounded-lg border border-border p-6">
          <h2 className="font-semibold text-foreground mb-1">Request a donated key</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Don&apos;t have a subscription? You can request a free key from our community pool.
          </p>
          <a href="/request-key" className="text-sm text-primary underline underline-offset-4">
            Submit a request →
          </a>
        </section>
      )}
    </main>
  )
}
```

- [ ] **Step 2: Create `src/app/(main)/dashboard/KeySection.tsx`**

```tsx
"use client"

import { useState } from "react"
import type { ApiKeyRow } from "@/lib/keys"

type Props = {
  activeKey: ApiKeyRow | null
  expiredKey: ApiKeyRow | null
  hasActiveSub: boolean
  everPaid: boolean
}

export function KeySection({ activeKey, expiredKey, hasActiveSub, everPaid }: Props) {
  const [newKey, setNewKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    const res = await fetch("/api/keys/generate", { method: "POST" })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error); return }
    setNewKey(data.raw)
  }

  function copyKey() {
    if (!newKey) return
    navigator.clipboard.writeText(newKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (newKey) {
    return (
      <section className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-6 space-y-3">
        <h2 className="font-semibold text-foreground">Your new API key</h2>
        <p className="text-sm text-amber-700 dark:text-amber-400">
          Copy this now — it won&apos;t be shown again.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded bg-muted px-3 py-2 text-sm font-mono break-all">{newKey}</code>
          <button onClick={copyKey} className="shrink-0 rounded border border-border px-3 py-2 text-sm hover:bg-muted transition-colors">
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </section>
    )
  }

  if (activeKey) {
    const expires = new Date(activeKey.expiresAt!)
    const daysLeft = Math.ceil((expires.getTime() - Date.now()) / 86400000)
    return (
      <section className="rounded-lg border border-border p-6 space-y-4">
        <h2 className="font-semibold text-foreground">Your API key</h2>
        <div className="flex items-center justify-between">
          <code className="text-sm font-mono text-foreground">{activeKey.prefix}••••••••••••••••</code>
          <span className={`text-xs ${daysLeft <= 3 ? "text-destructive" : "text-muted-foreground"}`}>
            Expires in {daysLeft}d
          </span>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          onClick={handleGenerate}
          disabled={loading || !hasActiveSub}
          className="text-sm text-primary underline underline-offset-4 disabled:opacity-50 disabled:no-underline"
        >
          {loading ? "Regenerating…" : "Regenerate key"}
        </button>
        {!hasActiveSub && (
          <p className="text-xs text-muted-foreground">Renew your subscription to regenerate.</p>
        )}
      </section>
    )
  }

  if (expiredKey) {
    return (
      <section className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 space-y-3">
        <h2 className="font-semibold text-foreground">Your key has expired</h2>
        <p className="text-sm text-muted-foreground">
          {hasActiveSub
            ? "Regenerate to get a new key and restore API access."
            : "Renew your subscription to get a new key."}
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {hasActiveSub ? (
          <button onClick={handleGenerate} disabled={loading}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80 disabled:opacity-50">
            {loading ? "Regenerating…" : "Regenerate key"}
          </button>
        ) : (
          <a href="/pricing" className="text-sm text-primary underline underline-offset-4">
            View plans →
          </a>
        )}
      </section>
    )
  }

  // No key at all, has subscription (e.g. just signed up)
  if (hasActiveSub) {
    return (
      <section className="rounded-lg border border-border p-6 space-y-3">
        <h2 className="font-semibold text-foreground">Generate your API key</h2>
        <p className="text-sm text-muted-foreground">You&apos;re subscribed — generate your key to start using the API.</p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button onClick={handleGenerate} disabled={loading}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80 disabled:opacity-50">
          {loading ? "Generating…" : "Generate key"}
        </button>
      </section>
    )
  }

  // No key, no subscription, ever_paid = true
  return (
    <section className="rounded-lg border border-border p-6 space-y-3">
      <h2 className="font-semibold text-foreground">API key</h2>
      <p className="text-sm text-muted-foreground">Subscribe to generate an API key.</p>
      <a href="/pricing" className="text-sm text-primary underline underline-offset-4">View plans →</a>
    </section>
  )
}
```

- [ ] **Step 3: Create `src/app/(main)/dashboard/GiftKeySection.tsx`**

```tsx
"use client"

import { useState } from "react"
import type { ApiKeyRow } from "@/lib/keys"

type Props = {
  giftKeys: ApiKeyRow[]
  giftKeysEarned: number
  giftKeysUsed: number
}

export function GiftKeySection({ giftKeys, giftKeysEarned, giftKeysUsed }: Props) {
  const [newKey, setNewKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const canGenerate = giftKeysUsed < giftKeysEarned

  async function handleGenerate() {
    setLoading(true); setError(null)
    const res = await fetch("/api/keys/gift", { method: "POST" })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error); return }
    setNewKey(data.raw)
  }

  function copyKey() {
    if (!newKey) return
    navigator.clipboard.writeText(newKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section className="rounded-lg border border-border p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-foreground">Gift keys</h2>
        <span className="text-xs text-muted-foreground">{giftKeysUsed} / {giftKeysEarned} used</span>
      </div>

      {newKey && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-2">
          <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">Copy this key now — it won&apos;t be shown again.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-muted px-3 py-2 text-xs font-mono break-all">{newKey}</code>
            <button onClick={copyKey} className="shrink-0 rounded border border-border px-3 py-2 text-sm hover:bg-muted transition-colors">
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <button
        onClick={handleGenerate}
        disabled={loading || !canGenerate}
        className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted transition-colors disabled:opacity-50"
      >
        {loading ? "Generating…" : canGenerate ? "Generate gift key" : "Gift key quota used"}
      </button>

      {giftKeys.length > 0 && (
        <div className="divide-y divide-border rounded-lg border border-border overflow-hidden mt-2">
          {giftKeys.map(key => (
            <div key={key.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="font-mono text-xs text-foreground">{key.prefix}••••••••</span>
              <span className={`text-xs rounded-full px-2 py-0.5 ${
                key.status === "active"   ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300" :
                key.status === "unclaimed"? "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300" :
                "bg-muted text-muted-foreground"
              }`}>{key.status}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 4: Commit**
```bash
git add src/app/\(main\)/dashboard/
git commit -m "feat: build dashboard with personal key and gift key sections"
```

---

## Task 9: Activate page

**Files:**
- Create: `src/app/(main)/activate/page.tsx`

Public-facing page. If user isn't logged in, stores the key in session storage and redirects to signup. After login, activates on return.

- [ ] **Step 1: Create `src/app/(main)/activate/page.tsx`**

```tsx
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function ActivatePage() {
  const router = useRouter()
  const [keyValue, setKeyValue] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // If redirected back here after login with a pending key in sessionStorage
  useEffect(() => {
    const pending = sessionStorage.getItem("pendingActivationKey")
    if (pending) {
      setKeyValue(pending)
      sessionStorage.removeItem("pendingActivationKey")
    }
  }, [])

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      // Not logged in — store key and redirect to signup
      sessionStorage.setItem("pendingActivationKey", keyValue.trim())
      router.push("/auth/signup?next=/activate")
      return
    }

    const res = await fetch("/api/keys/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: keyValue.trim() }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error); return }
    setSuccess(true)
  }

  if (success) {
    return (
      <main className="mx-auto max-w-md px-6 py-20 text-center space-y-4">
        <h1 className="text-2xl font-semibold text-foreground">Key activated!</h1>
        <p className="text-sm text-muted-foreground">Your API key is now active. Head to your dashboard to see it.</p>
        <a href="/dashboard" className="inline-block rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80 transition-colors">
          Go to dashboard →
        </a>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-md px-6 py-20 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Activate a key</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter a gift key or donated key to activate your account.
        </p>
      </div>

      <form onSubmit={handleActivate} className="space-y-4">
        <div>
          <label htmlFor="key" className="block text-sm font-medium text-foreground mb-1.5">
            Key code
          </label>
          <input
            id="key"
            type="text"
            value={keyValue}
            onChange={e => setKeyValue(e.target.value)}
            placeholder="ak_..."
            required
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80 transition-colors disabled:opacity-50"
        >
          {loading ? "Activating…" : "Activate key"}
        </button>
      </form>
    </main>
  )
}
```

- [ ] **Step 2: Commit**
```bash
git add src/app/\(main\)/activate/
git commit -m "feat: add /activate page for gift and pool key redemption"
```

---

## Task 10: Smoke test end-to-end

Manual verification steps — no automated test here since this requires a running Supabase instance.

- [ ] **Step 1: Start dev server**
```bash
pnpm dev
```

- [ ] **Step 2: Verify profile creation**
1. Sign up with a new email at `/auth/signup`
2. Confirm email via inbox
3. In Supabase: SQL Editor → `SELECT * FROM profiles;` — should see a row

- [ ] **Step 3: Verify dashboard states**
1. Log in → `/dashboard` → should see "Subscribe to generate an API key" (no subscription yet)

- [ ] **Step 4: Insert a test subscription directly in Supabase**
```sql
INSERT INTO subscriptions (user_id, amount_paid, base_price, gift_keys_earned, expires_at)
VALUES ('<your-user-uuid>', 800, 800, 1, NOW() + INTERVAL '1 year');
```
Refresh `/dashboard` → should see "Generate key" button.

- [ ] **Step 5: Generate a key**
Click "Generate key" → raw key shown with copy warning ✓

- [ ] **Step 6: Verify API access**
```bash
curl -H "x-api-key: <the key>" http://localhost:3003/api/en/v1/quotes
```
Expected: 200 with data

- [ ] **Step 7: Verify regenerate**
Click "Regenerate key" → new key shown, old key should now return 401

- [ ] **Step 8: Test gift key flow**
1. Click "Generate gift key" → raw gift key shown
2. Open incognito window, go to `/activate`
3. Enter gift key → prompts signup
4. Create new account, verify email
5. Return to `/activate` → should auto-activate
6. Dashboard shows active key with 30-day expiry

- [ ] **Step 9: Final commit**
```bash
git add .
git commit -m "feat: complete API key system Part 1 — personal keys, gift keys, dashboard, activate"
```

---

## What Part 2 will cover

- Pool key generation (admin bulk create, assign to YouTuber)
- YouTuber dashboard section (reveal, donate to pool)
- Public pool request flow (`/request-key` page, `pool_key_requests` table)
- Admin `/admin/keys` page (approve/reject requests, bulk generate, account management)
