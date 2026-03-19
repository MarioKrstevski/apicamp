# Auth Practice System — Design Spec

**Date:** 2026-03-19
**Status:** Approved

---

## Overview

A set of practice auth tables and endpoints that let developers learn authentication flows hands-on. Three tiers of increasing complexity, each fully isolated from the real platform accounts (`profiles`, `api_keys`, etc.). Accounts created here are purely for practice — no relation to any platform concept.

The feature spans:
- Three pairs/groups of DB tables (`auth_accounts_basic`, `auth_accounts_token`, `auth_accounts_profile` families)
- A dedicated auth route handler alongside the main catch-all
- Docs pages for each tier
- A standalone `/auth-explained` knowledge page (no API reference — pure teaching)

---

## What we are NOT building

- No connection to platform profiles or api_keys
- No real emails sent — ever
- No OAuth / social login (future)
- No JWT (session tokens only — simpler to explain and implement)
- No refresh tokens in Part 1 (deferred to Part 2)

---

## Tier Overview

| Tier | Tables | Returns | Core lesson |
|------|--------|---------|-------------|
| Basic | `auth_accounts_basic` | `{ success, id, email }` | Auth is just verify-credentials + a response |
| Token | `auth_accounts_token` + `auth_sessions_token` | `{ token, account }` | Stateful tokens, protected endpoints, signout |
| Profile | `auth_accounts_profile` + `auth_sessions_profile` + `auth_user_profiles` | `{ token, account, profile }` | Auth + editable profile, protected CRUD |

---

## Database Schema

### Tier 1: Basic

```sql
CREATE TABLE auth_accounts_basic (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  num_id              BIGSERIAL   UNIQUE,
  user_id             UUID        NOT NULL REFERENCES auth.users(id),   -- owner (apicamp account)
  email               TEXT        NOT NULL,
  password_hash       TEXT        NOT NULL,
  is_verified         BOOLEAN     NOT NULL DEFAULT false,
  verification_token  TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX ON auth_accounts_basic (user_id, email);  -- unique per apicamp user
```

No session table — this tier does not issue tokens.

---

### Tier 2: Token

```sql
CREATE TABLE auth_accounts_token (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  num_id                BIGSERIAL   UNIQUE,
  user_id               UUID        NOT NULL REFERENCES auth.users(id),
  email                 TEXT        NOT NULL,
  password_hash         TEXT        NOT NULL,
  is_verified           BOOLEAN     NOT NULL DEFAULT false,
  verification_token    TEXT,
  verification_expires_at TIMESTAMPTZ,
  reset_token           TEXT,
  reset_token_expires_at TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX ON auth_accounts_token (user_id, email);

CREATE TABLE auth_sessions_token (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  UUID        NOT NULL REFERENCES auth_accounts_token(id) ON DELETE CASCADE,
  token_hash  TEXT        UNIQUE NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON auth_sessions_token (account_id);
CREATE INDEX ON auth_sessions_token (token_hash);
```

---

### Tier 3: Profile

```sql
CREATE TABLE auth_accounts_profile (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  num_id                  BIGSERIAL   UNIQUE,
  user_id                 UUID        NOT NULL REFERENCES auth.users(id),
  email                   TEXT        NOT NULL,
  password_hash           TEXT        NOT NULL,
  is_verified             BOOLEAN     NOT NULL DEFAULT false,
  verification_token      TEXT,
  verification_expires_at TIMESTAMPTZ,
  reset_token             TEXT,
  reset_token_expires_at  TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX ON auth_accounts_profile (user_id, email);

CREATE TABLE auth_sessions_profile (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  UUID        NOT NULL REFERENCES auth_accounts_profile(id) ON DELETE CASCADE,
  token_hash  TEXT        UNIQUE NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON auth_sessions_profile (account_id);
CREATE INDEX ON auth_sessions_profile (token_hash);

CREATE TABLE auth_user_profiles (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    UUID        UNIQUE NOT NULL REFERENCES auth_accounts_profile(id) ON DELETE CASCADE,
  display_name  TEXT,
  bio           TEXT,
  avatar_url    TEXT,
  location      TEXT,
  website       TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## API Endpoint Reference

### URL structure

Auth endpoints follow the same modifier system as the rest of the API:

```
POST /api/[modifiers]/auth/basic/signup
POST /api/en/v1/slow2/auth/token/signin
GET  /api/en/v1/auth/profile/me
```

`auth` is detected as a special resource family in the route handler. All existing modifiers (slow, chaos, empty, stale, random, versions, locales) work the same way.

---

### Tier 1 — Basic (`/auth/basic/*`)

#### `POST /auth/basic/signup`

Request:
```json
{ "email": "alice@example.com", "password": "hunter2" }
```

Response `201`:
```json
{
  "success": true,
  "account": { "id": "uuid", "email": "alice@example.com", "isVerified": false, "createdAt": "..." },
  "debug": {
    "note": "No real email is sent. Use the verificationUrl below to verify this account.",
    "verificationUrl": "/api/en/v1/auth/basic/verify-email?token=abc123"
  }
}
```

Errors: `400` email already registered | `400` validation (email format, password min 8 chars)

---

#### `POST /auth/basic/signin`

Request:
```json
{ "email": "alice@example.com", "password": "hunter2" }
```

Response `200`:
```json
{
  "success": true,
  "account": { "id": "uuid", "email": "alice@example.com", "isVerified": true, "createdAt": "..." }
}
```

Errors: `401` invalid credentials | `403` email not verified (includes `debug.verificationUrl`)

---

#### `GET /auth/basic/verify-email?token=abc123`

No body. Token from the `debug.verificationUrl` in signup response.

Response `200`:
```json
{ "success": true, "message": "Email verified. You can now sign in." }
```

Errors: `400` invalid or expired token

---

#### `POST /auth/basic/signout`

No body required (no token exists at this tier — this is a teaching endpoint that explains the concept).

Response `200`:
```json
{ "success": true, "message": "Signed out. (No session token to invalidate at this tier — see Token auth for stateful signout.)" }
```

---

### Tier 2 — Token (`/auth/token/*`)

#### `POST /auth/token/signup`

Request:
```json
{ "email": "alice@example.com", "password": "hunter2" }
```

Response `201`:
```json
{
  "success": true,
  "token": "tok_4f9a2c1b...",
  "account": { "id": "uuid", "email": "alice@example.com", "isVerified": false, "createdAt": "..." },
  "debug": {
    "note": "No real email is sent. Use the verificationUrl to verify.",
    "verificationUrl": "/api/en/v1/auth/token/verify-email?token=abc123"
  }
}
```

Token is valid immediately even before verification, but `/me` will include `isVerified: false`.

---

#### `POST /auth/token/signin`

Request:
```json
{ "email": "alice@example.com", "password": "hunter2" }
```

Response `200`:
```json
{
  "success": true,
  "token": "tok_4f9a2c1b...",
  "account": { "id": "uuid", "email": "alice@example.com", "isVerified": true, "createdAt": "..." }
}
```

Errors: `401` invalid credentials

---

#### `POST /auth/token/signout`

Header: `Authorization: Bearer tok_4f9a2c1b...`

Response `200`:
```json
{ "success": true, "message": "Token invalidated." }
```

After this call the token is deleted from `auth_sessions_token`. Subsequent requests with the same token return `401`.

---

#### `GET /auth/token/me`

Header: `Authorization: Bearer tok_4f9a2c1b...`

Response `200`:
```json
{
  "account": { "id": "uuid", "email": "alice@example.com", "isVerified": true, "createdAt": "..." }
}
```

Errors: `401` missing/invalid/expired token

---

#### `GET /auth/token/verify-email?token=abc123`

Response `200`:
```json
{ "success": true, "message": "Email verified." }
```

---

#### `POST /auth/token/forgot-password`

Request:
```json
{ "email": "alice@example.com" }
```

Response `200` (always — never reveals if email exists):
```json
{
  "message": "If that email is registered, a reset link has been sent.",
  "debug": {
    "note": "No real email is sent. Use the resetUrl below.",
    "resetUrl": "/api/en/v1/auth/token/reset-password?token=xyz789"
  }
}
```

Reset token expires in **1 hour**.

---

#### `POST /auth/token/reset-password`

Query: `?token=xyz789`

Request:
```json
{ "password": "newpassword123" }
```

Response `200`:
```json
{ "success": true, "message": "Password updated. Please sign in again." }
```

All existing sessions for this account are invalidated on reset.

Errors: `400` invalid/expired token

---

### Tier 3 — Profile (`/auth/profile/*`)

All Tier 2 endpoints exist here with `/auth/profile/` prefix. Same behavior, different table family. Additional endpoints:

#### `GET /auth/profile/me`

Header: `Authorization: Bearer tok_...`

Response `200`:
```json
{
  "account": { "id": "uuid", "email": "alice@example.com", "isVerified": true, "createdAt": "..." },
  "profile": {
    "displayName": "Alice",
    "bio": "I build things.",
    "avatarUrl": null,
    "location": "Berlin",
    "website": "https://alice.dev",
    "updatedAt": "..."
  }
}
```

Profile row is auto-created (all nulls) on signup — always present.

---

#### `PUT /auth/profile/me`

Header: `Authorization: Bearer tok_...`

Request (all fields optional):
```json
{
  "displayName": "Alice W.",
  "bio": "I build things with code.",
  "avatarUrl": "https://...",
  "location": "Berlin",
  "website": "https://alice.dev"
}
```

Response `200`: Updated profile object (same shape as GET /me).

Errors: `400` validation (avatarUrl must be a valid URL if provided, displayName max 80 chars, bio max 500 chars)

---

#### `DELETE /auth/profile/me`

Header: `Authorization: Bearer tok_...`

Response `200`:
```json
{ "success": true, "message": "Account and profile deleted." }
```

Cascades: deletes account, sessions, and profile row. Token immediately invalid after.

---

## Cross-cutting concerns

### Password hashing

`node:crypto` `scrypt` — no external dependencies. Salt is generated per password and stored alongside the hash (`salt:hash` format in the `password_hash` column). Never stored or returned in plaintext.

### Token format

`tok_` prefix + 32 random bytes as hex = `tok_` + 64 hex chars. Always 68 characters. Raw token returned to client once, only the SHA-256 hash stored in DB.

Token lifetime: **24 hours** from creation. Each signin creates a new token (old ones remain valid until they expire — a user can have multiple active sessions).

### The `debug` field

Present on any response where a "fake email" would have been sent. Always a top-level key alongside the main response data. Always includes `note` explaining what it is.

This field is only suppressed in `empty` modifier mode (returns `[]`). All other modifier modes include it.

### Ownership isolation

Every practice account row includes a `user_id` FK to `auth.users`. Users can only read and modify rows they created via their API key. Two apicamp users with the same practice email (`alice@example.com`) get separate rows — no collision.

This is enforced at the route layer using the `account.id` from `validateApiKey()`, same as all other tables.

### Validation rules

| Field | Rule |
|-------|------|
| email | Valid email format, max 254 chars |
| password | Min 8 chars, max 72 chars (scrypt limit) |
| displayName | Max 80 chars |
| bio | Max 500 chars |
| avatarUrl | Valid URL if provided |
| website | Valid URL if provided |

### Error shape

Consistent with the rest of the API:
```json
{ "error": "Description of what went wrong" }
```

Auth-specific status codes:
- `400` — validation / bad input / expired token
- `401` — invalid credentials / missing or invalid token
- `403` — token valid but action not allowed (e.g. account suspended — rare)
- `404` — not used (forgot-password always returns 200 to avoid email enumeration)
- `409` — email already registered

---

## Route architecture

New file: `src/app/api/auth/[...segments]/route.ts`

Sits alongside the existing `src/app/api/[...segments]/route.ts`. Handles all `/api/*/auth/*` paths.

The existing main catch-all already handles modifiers and auth. The auth sub-handler receives:
- The resolved modifiers (delay, chaos, etc.) — applied the same way
- The tier: `basic` | `token` | `profile`
- The action: `signup` | `signin` | `signout` | `me` | `verify-email` | `forgot-password` | `reset-password`
- The validated `account` from `validateApiKey()` — used for ownership isolation

Lib file: `src/lib/auth-practice.ts` — contains all password hashing, token generation, and DB operations for the practice auth system. Separate from `src/lib/auth.ts` (platform auth) by name and by content.

---

## Docs pages

Three docs pages auto-generated from config (same pattern as existing tables):

```
/docs/auth/basic    — endpoint reference for Tier 1
/docs/auth/token    — endpoint reference for Tier 2
/docs/auth/profile  — endpoint reference for Tier 3
```

Sidebar section: **Auth Practice** (between the data tables and any future sections).

---

## /auth-explained page

Standalone page at `/auth-explained`. Not a docs page. Covers:

1. **What is authentication?** — proving who you are
2. **Passwords** — why we hash, what salt is, why you never store plaintext
3. **Sessions and tokens** — what a token is, how the server trusts it
4. **The verification flow** — why verify email at all, what happens in a real app
5. **Password reset** — why reset tokens expire, why we never confirm if an email exists
6. **Protected endpoints** — what `Authorization: Bearer` means and why
7. **Account vs User** — an account is credentials, a user is a person — apps often conflate them
8. **What this API fakes** — honest note on what's simplified vs realistic

No API endpoint reference on this page — pure knowledge.

---

## Part 2 (deferred)

- **Refresh tokens** — short-lived access token (15 min) + long-lived refresh token (7 days). New endpoint: `POST /auth/token/refresh` and `POST /auth/profile/refresh`
- **Roles & permissions** — separate spec, separate tables. Will not reuse `auth_accounts_*` names

---

## What is NOT in scope (ever for this feature)

- OAuth / social login
- Magic link login
- Multi-factor authentication
- Real email delivery
- Connection between practice accounts and platform accounts
