# Auth Flow & Dashboard Routing — Design Spec
**Date:** 2026-03-17
**Project:** apicamp API Playground
**Status:** Approved

---

## Overview

Implement email+password authentication and role-based routing. Two types of authenticated users: locale admins (seed data managers) and regular users (API consumers). Each lands on a different dashboard. Unauthenticated users see the public landing page.

---

## User Types & Access

| User | Identified by | Destination after login |
|------|--------------|------------------------|
| Locale admin | UUID matches any `LOCALE_ADMIN_*` env var | `/manage-dashboard` |
| Regular user | everyone else | `/dashboard` |
| Unauthenticated | no session | `/` |

---

## Routes

| Route | Access | Notes |
|-------|--------|-------|
| `/` | Public | Always accessible |
| `/auth/login` | Public | No nav |
| `/auth/signup` | Public | No nav |
| `/auth/callback` | Public | Supabase confirmation handler |
| `/auth/signout` | Public, POST only | Signs out, redirects to `/`. GET returns 405 (Next.js default). |
| `/dashboard` | Regular users only | → `/` if unauthed; → `/manage-dashboard` if admin |
| `/manage-dashboard` | Locale admins only | → `/` if unauthed; → `/dashboard` if regular user |

---

## Environment Variables

Project uses `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` (not the legacy `ANON_KEY`). All Supabase client files already use this name correctly.

`src/lib/supabase/server.ts` correctly uses the publishable key with cookie-based session management — this is the right pattern for SSR auth. It is NOT the service-role client. The `SUPABASE_SERVICE_ROLE_KEY` env var is used separately for admin scripts only.

Locale admins are identified by any env var prefixed `LOCALE_ADMIN_` (currently EN, FR, ES, SR, MK, DE).

**Files needing env var name fix:** `.env.example` and `CLAUDE.md` still reference the old `NEXT_PUBLIC_SUPABASE_ANON_KEY` name — update both.

---

## Middleware

File: `src/middleware.ts` — **new file** (root middleware does not currently exist; `src/lib/supabase/middleware.ts` is a session helper with its own redirect logic — do not call `updateSession()` from the new middleware as it redirects to `/auth/login` which conflicts with this spec)

The root middleware handles session refresh itself:

```
1. Create Supabase server client with cookie read/write on the request/response
   (replicate the cookie handler pattern from src/lib/supabase/middleware.ts,
   but without its redirect logic — session refresh only via getClaims())
2. Apply matcher to skip _next/static, _next/image, favicon.ico
3. If route matches /auth/* or exactly / or /api/* → allow through
4. If no session (getClaims() returns null claims) → redirect to /
5. If session:
   a. isLocaleAdmin(userId) — check !== null for admin status
   b. result !== null AND path starts with /dashboard → redirect to /manage-dashboard
   c. result === null AND path starts with /manage-dashboard → redirect to /dashboard
   d. otherwise → allow through
```

Export a `config.matcher` that excludes static assets:
```ts
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

---

## Locale Admin Helper

File: `src/lib/locale-admin.ts`

```ts
isLocaleAdmin(userId: string): string | null
// Returns locale suffix (e.g. "EN", "MK") or null if not an admin
```

- Dynamically scans `process.env` for all keys matching `LOCALE_ADMIN_*`
- Compares each value against `userId`
- Returns the suffix (e.g. `"EN"` from `LOCALE_ADMIN_EN`) of the first match, or `null`
- If a UUID appears in multiple vars (edge case), returns the first match — behavior is acceptable
- **Access control callers:** check `!== null` only — never check for a specific locale value
- **Display callers:** may use the returned string to show locale to the user (e.g. `/manage-dashboard` heading)
- Edge-runtime safe: no Node.js-only imports, no async, pure string operations
- TypeScript type imports permitted (erased at build time)

---

## Navigation Component

File: `src/components/nav.tsx` — Server Component (async)

```ts
const client = await createClient()  // createClient is async — must be awaited
const { data: { user } } = await client.auth.getUser()
const locale = user ? isLocaleAdmin(user.id) : null
```

Renders:
- **No user:** "Sign in" link → `/auth/login`
- **Admin (locale !== null):** "Dashboard" → `/manage-dashboard` + `<SignoutButton />`
- **Regular user (locale === null, user exists):** "Dashboard" → `/dashboard` + `<SignoutButton />`

Sign out button: `src/components/signout-button.tsx` — **Client Component** (`"use client"`). Renders `<form action="/auth/signout" method="POST"><button type="submit">Sign out</button></form>`. Required because Server Components cannot attach event handlers.

Nav included in `src/app/layout.tsx`. Auth pages use `src/app/auth/layout.tsx` (separate, no nav).

---

## Auth Pages

### `/auth/login`
- Centered layout via `auth/layout.tsx`, no nav
- Email + password fields
- On mount: read `?error` param — if `expired`, show "Your confirmation link has expired. Please sign in or sign up again." above the form
- Submit: `supabase.auth.signInWithPassword()`
- Success: redirect to `/dashboard` — middleware re-routes admins to `/manage-dashboard` (one extra redirect, known trade-off, acceptable)
- Error: inline Supabase error message below form

### `/auth/signup`
- Centered layout, no nav
- Email + password + confirm password fields
- Client-side: block submit if passwords don't match → show "Passwords do not match"
- Password strength: delegate to Supabase (min 6 chars), surface errors as-is
- Submit: `supabase.auth.signUp()`
- Success: replace form with "Check your email to confirm your account." — no redirect
- Error: inline Supabase error message

### `/auth/callback` — Route Handler
- If `code` param is absent or empty → redirect to `/auth/login?error=expired`
- `exchangeCodeForSession(code)` success → redirect to `/dashboard` (middleware routes from there)
- Error → redirect to `/auth/login?error=expired`

### `/auth/signout` — Route Handler (POST only)
- `supabase.auth.signOut()` → redirect to `/`

---

## Dashboard Pages

### `/dashboard`
- Server Component; trusts middleware — no defensive auth check needed in page code
- `await createClient()` → `supabase.auth.getUser()` for user object (for future use)
- Shows: "Welcome to apicamp." heading + "Your dashboard is coming soon."

### `/manage-dashboard`
- Server Component; trusts middleware
- `await createClient()` → `supabase.auth.getUser()` → `user.id`
- `isLocaleAdmin(user.id)` → locale suffix string (non-null guaranteed by middleware)
- Shows: "Welcome, [locale] admin." heading (e.g. "Welcome, EN admin.")
- Shows: category name list from static import of `src/config/registry.ts`

---

## Config Registry

File: `src/config/registry.ts` — created as part of this implementation

Shape:
```ts
import type { TableConfig } from "@/types/table"

const registry: Record<string, TableConfig> = {
  users: usersConfig,
  products: productsConfig,
}

export default registry
```

`/manage-dashboard` reads `Object.keys(registry)` to render the category list. This is a build-time static import — no DB or API call.

**Note:** `users.ts` imports from `@/lib/types` while `products.ts` imports from `@/types/table` — these must be reconciled to a single path. The canonical location is `@/types/table` (matches CLAUDE.md). Update `users.ts` import to match.

---

## What Is NOT in This Spec

- GitHub OAuth
- Gmail nudge on signup
- `/manage-dashboard` data management UI (next spec)
- Rate limiting, API key auth

---

## Files to Create / Modify

| File | Action |
|------|--------|
| `src/middleware.ts` | **Create** — root middleware |
| `src/lib/supabase/middleware.ts` | **Replace** — remove `updateSession()`, add pure `refreshSession()` |
| `src/lib/locale-admin.ts` | Create |
| `src/config/registry.ts` | Create — `{ users, products }` map |
| `src/components/navbar.tsx` | Replace — async Server Component (keep existing filename) |
| `src/components/signout-button.tsx` | Create — Client Component |
| `src/app/layout.tsx` | Update — remove `<Navbar />`, nav moves to `(main)` layout |
| `src/app/(main)/layout.tsx` | Create — route group layout with Navbar (excludes `/auth/*`) |
| `src/app/(main)/page.tsx` | Create — landing page (route group doesn't affect URL `/`) |
| `src/app/page.tsx` | Delete — replaced by `(main)/page.tsx` |
| `src/app/auth/layout.tsx` | Create — minimal centered, no nav |
| `src/app/auth/login/page.tsx` | Create — Server Component, passes `?error` to `LoginForm` |
| `src/app/auth/login/LoginForm.tsx` | Create — Client Component form |
| `src/app/auth/signup/page.tsx` | Create |
| `src/app/auth/callback/route.ts` | Create |
| `src/app/auth/signout/route.ts` | Create |
| `src/app/(main)/dashboard/page.tsx` | Create |
| `src/app/(main)/manage-dashboard/page.tsx` | Create |
| `src/config/tables/users.ts` | Update — fix import path to `@/types/table` |
| `.env.example` | Update — replace old anon key name |
| `CLAUDE.md` | Update — fix env var name |
