# API Key System — Design Spec
_Date: 2026-03-19_

---

## Overview

Every API request requires a valid API key. There is no free anonymous tier — access is key-gated. Keys are tied to accounts, expire automatically (leak protection), and can be rotated. Three key types exist: personal, gift, and pool. A donor formula lets users pay more to earn extra giftable keys.

---

## Data Model

### `profiles`
Extends `auth.users` 1:1 via FK. Lives in the public schema.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | = `auth.users.id`, `ON DELETE CASCADE` from auth.users |
| `role` | enum | `user \| locale_admin \| youtuber \| superadmin` |
| `is_blocked` | boolean | default false — set by admin to block all access |
| `ever_paid` | boolean | default false — one-way flag, never reverts. Prevents pool gaming. |
| `created_at` | timestamptz | |

No `tier` column. Access is determined entirely by whether the user has a valid active key.

**Role semantics:** `youtuber` is admin-granted, unlocks the pool key management dashboard section. All roles have identical API access — role only affects dashboard UI surfaces and admin guards. `superadmin` is reserved for the platform admin account.

---

### `api_keys`
Single table for all key types.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `key_hash` | text unique | bcrypt hash — raw key never stored |
| `prefix` | text | first 8 chars shown in UI, e.g. `ak_4f9a2c1b` |
| `owner_id` | uuid FK profiles nullable | null until claimed. `ON DELETE SET NULL` — if owner account deleted, key becomes ownerless/revoked |
| `creator_id` | uuid FK profiles nullable | who generated it. `ON DELETE SET NULL` — orphaned pool keys remain valid if already activated |
| `type` | enum | `personal \| gift \| pool` |
| `status` | enum | `active \| unclaimed \| donated \| expired \| revoked` |
| `expires_at` | timestamptz nullable | null until activated — clock starts at `activated_at` |
| `pool_expires_days` | integer nullable | only set for `type=pool` — number of days after activation the key will expire. Set by creator at generation time. |
| `activated_at` | timestamptz nullable | when key became live |
| `created_at` | timestamptz | |
| `last_used_at` | timestamptz nullable | updated on each valid API call |

**Expiry durations (calculated and written to `expires_at` at activation):**
- `personal` → `activated_at + 14 days`
- `gift` → `activated_at + 30 days`
- `pool` → `activated_at + pool_expires_days days`

**Key rules:**
- Gift and pool keys: `owner_id = null` until claimed, `expires_at = null` until activated
- Personal keys: `owner_id = creator_id`, `activated_at = created_at` (immediate)
- Gift keys cannot be claimed by their `creator_id`
- Pool/gift keys can only be claimed by accounts where `ever_paid = false`
- Once a pool key is activated, it belongs to that user like any other key
- If `owner_id` becomes null (account deleted), set `status = revoked`

**Claim race condition:** The claim step must use a conditional update:
```sql
UPDATE api_keys SET owner_id = $user, status = 'active', activated_at = now(), expires_at = ...
WHERE id = $key_id AND status = 'unclaimed'
```
If 0 rows updated, another claim won the race — return an error to the requester.

---

### `subscriptions`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `user_id` | uuid FK profiles `ON DELETE CASCADE` | |
| `amount_paid` | integer | cents |
| `base_price` | integer | cents — captured at purchase time, not live config |
| `gift_keys_earned` | integer | `floor((amount_paid - base_price) / base_price)` — calculated at purchase |
| `gift_keys_used` | integer | default 0 — incremented when a gift key is generated |
| `started_at` | timestamptz | |
| `expires_at` | timestamptz | subscription billing period end |
| `payment_ref` | text | Stripe / LemonSqueezy order id |
| `created_at` | timestamptz | |

**Donor formula example:**
- Base price: $8 (800 cents). User pays $80 (8000 cents).
- `gift_keys_earned = floor((8000 - 800) / 800) = floor(7200 / 800) = floor(9) = 9`
- User gets 1 personal key (auto-activated) + 9 giftable keys they can generate on demand

**Active subscription definition:** a row in `subscriptions` where `expires_at > now()` for this `user_id`. Used to gate key regeneration.

**Gift/pool key recipients:** No subscription row is created when a gift or pool key is claimed. When their key expires, they see "subscribe to get a new key" — the regenerate path requires an active subscription row. There is no "free regenerate" for gift recipients.

---

### `pool_key_requests`
Tracks the apply → review → activate flow for public pool keys.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `requester_id` | uuid FK profiles `ON DELETE CASCADE` | |
| `reason` | text | why they need a key |
| `status` | enum | `pending \| approved \| rejected` |
| `assigned_key_id` | uuid FK api_keys nullable | set on approval |
| `admin_note` | text nullable | optional rejection/approval note |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | updated on every status change — tracks latest review action |

---

## `Account` type (replaces stub in `lib/auth.ts`)

```ts
export type Account = {
  id: string
  role: "user" | "locale_admin" | "youtuber" | "superadmin"
  isBlocked: boolean
  everPaid: boolean
}
```

`tier` is removed. `checkRateLimit` in `lib/rateLimit.ts` currently uses `account.tier` — this must be updated. Since all valid API keys belong to paying/gifted users, there is only one rate limit tier. The `LIMITS` map in `rateLimit.ts` should be simplified to a single limit set (no `free`/`paid` distinction), or `everPaid` can be used as a proxy if differentiation is ever needed.

---

## Flows

### Personal key
1. User pays → subscription row created, `profiles.ever_paid = true`
2. Personal key auto-generated: `type=personal`, `status=active`, `activated_at=now()`, `expires_at=now()+14d`, `owner_id=creator_id=user.id`
3. Dashboard shows prefix + expiry countdown + "Regenerate" button
4. Regenerate → old key `status=revoked`, new key created with fresh `activated_at=now()`, `expires_at=now()+14d`
5. Key expires → user still logs in via Supabase auth. Dashboard shows expiry banner. "Regenerate" requires active subscription (`subscriptions.expires_at > now()`). If subscription also lapsed: "Renew your subscription to get a new key."

---

### Gift key
1. Paying user clicks "Generate gift key" — blocked if `gift_keys_used >= gift_keys_earned`
2. Key created: `type=gift`, `status=unclaimed`, `owner_id=null`, `expires_at=null`
3. Raw key shown **once** with "Copy now — this won't be shown again" warning. `subscriptions.gift_keys_used` incremented immediately.
4. Recipient creates account (no payment needed) → goes to `/activate`, enters key
5. Validation checks: `type=gift`, `status=unclaimed`, `creator_id ≠ requester.id`, `profiles.ever_paid=false` on recipient
6. Claim via conditional update (race-safe). On success: `owner_id=recipient.id`, `status=active`, `activated_at=now()`, `expires_at=now()+30d`, recipient's `profiles.ever_paid=true`
7. When gift key expires: recipient has no subscription. Dashboard shows "Subscribe to get your own key." No regeneration available until they pay.

---

### Pool key (YouTuber)
1. Admin bulk-generates N keys via `/admin/keys`: `type=pool`, `status=unclaimed`, `creator_id=youtuber.id`, `pool_expires_days=X` (set in the form)
2. YouTuber sees their keys on dashboard — each row shows prefix, status, "Reveal key" (shows raw key once with copy warning), "Donate to pool" button
3. Donate → `status=donated`. Key now visible in public pool.
4. YouTuber can share unrevealed/undonated keys however they choose (mass release, DM, etc.)
5. If YouTuber account is deleted: `creator_id` set to null. Already-active keys remain valid until `expires_at`. Unclaimed/donated keys remain in pool — admin should review and clean up manually.

---

### Public pool request
1. User creates account (no payment). Dashboard shows "Request a donated key" only if `ever_paid=false`
2. Submits reason → `pool_key_requests` row created, `status=pending`
3. Admin reviews at `/admin/keys` → approves: picks a `status=donated` key, writes `assigned_key_id`, flips `status=approved`, `updated_at=now()`
4. User receives email notification → logs in → dashboard shows "Activate your key" CTA
5. User clicks activate → conditional claim update: `owner_id=user.id`, `status=active`, `activated_at=now()`, `expires_at=now() + pool_expires_days days`, `profiles.ever_paid=true`
6. When this key expires: no subscription exists. Dashboard shows "Subscribe to get your own key." No second pool request possible since `ever_paid=true`.

---

## `validateApiKey()` logic

```
1. Hash incoming key, look up in api_keys by key_hash
2. Not found → 401 "Invalid API key"
3. status = revoked → 401 "This key has been revoked"
4. status = expired OR expires_at < now() → 401 "Key expired — renew from your dashboard"
5. status = unclaimed OR donated → 401 "Key not yet activated"
6. Load profiles row via owner_id (if owner_id is null → 401 "Key has no owner — contact support")
7. profiles.is_blocked = true → 403 "Account suspended"
8. Update api_keys.last_used_at = now() (fire-and-forget, do not block response)
9. Return Account { id, role, isBlocked, everPaid }
```

Key validity is independent of subscription status. A key is valid until `expires_at` regardless of whether the subscription has lapsed. Subscription is only checked at key generation/regeneration time.

---

## Admin access

Admin is identified by `profiles.role = 'superadmin'`. On signup, if `auth.users.email = process.env.ADMIN_EMAIL`, the profile trigger sets `role = 'superadmin'` automatically. Guards check `account.role === 'superadmin'`.

```
ADMIN_EMAIL=admin@apicamp.com
```

Same pattern as `LOCALE_ADMIN_EN`. Admin creates their Supabase account via normal signup with that email. No separate Supabase configuration needed.

---

## Dashboard surfaces

### `/dashboard` — any authenticated user

**Has active key:**
- Key prefix + expiry date + "Regenerate" button (requires active subscription)
- Gift keys section: `X / N used`, list of generated gift keys with status badges, "Generate gift key" button (disabled when quota exhausted)

**Key expired, has active subscription:**
- Banner: "Your key expired — regenerate to restore access"
- "Regenerate" button enabled

**Key expired, no active subscription:**
- Banner: "Your key expired — renew your subscription to get a new one"
- Link to pricing/subscribe

**No key, `ever_paid=false`:**
- "Activate a key" input (for gift or pool key codes)
- "Request a donated key" form (reason + submit), or pending status if already requested

**No key, `ever_paid=true`:**
- "Subscribe to generate a new key" — links to pricing

---

### `/activate` — public, no auth required initially
- Enter key code → validates
- If not logged in: prompts account creation first, then completes activation
- Error states: key already claimed, key expired, key invalid, creator attempting to claim own gift key, `ever_paid=true` on requester

---

### `/dashboard` — `role=youtuber`
- Personal key section (same as above)
- Pool keys section: table with prefix, status badge, expiry, "Reveal key" button, "Donate to pool" button
- Summary: `X of N keys donated to public pool`

---

### `/admin/keys` — `role=superadmin` only
- Pending pool requests queue: requester info, reason, approve (with key picker) / reject (with note)
- Bulk key generation form: target user, N keys, expiry days
- Account management: search, view usage stats, toggle `is_blocked`

---

## Key rotation rationale

14-day personal key expiry exists purely for leak protection — if a key is compromised, the damage window is bounded. Regenerating (not extending) ensures the old key is immediately dead. Users are expected to regenerate before expiry; the dashboard shows an expiry countdown to prompt this.

---

## Out of scope (this spec)

- Payment processing integration (Stripe / LemonSqueezy) — billing triggers subscription creation but the payment UI is a separate concern
- Email sending implementation — spec assumes transactional email exists; content and provider TBD
- YouTuber onboarding flow — admin manually grants `role=youtuber` and bulk-generates keys for MVP
