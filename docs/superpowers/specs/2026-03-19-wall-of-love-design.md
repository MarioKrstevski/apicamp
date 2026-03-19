# Wall of Love — Design Spec

**Date:** 2026-03-19
**Status:** Approved

---

## Overview

A social proof system for apicamp. Paid users can submit a testimonial review from their dashboard. Approved reviews appear on the landing page as a continuously scrolling marquee. A superadmin dashboard at `/admin-dashboard` handles approval.

The feature spans:
- Schema additions: `profiles` table (3 new columns), new `user_more_info` table (scaffolded), new `reviews` table
- Landing page: `WallOfLove` server component with CSS infinite marquee
- Dashboard: review submit/edit section (paid users only)
- Admin dashboard: `/admin-dashboard` with review approval UI (superadmin only)

---

## What we are NOT building

- No anonymous reviews
- No OAuth / social login for reviewers
- No email notifications on approval
- No `user_more_info` onboarding flow (table scaffolded only — wired up later)
- No Supabase Storage integration for avatars in this phase (avatar_url stored as text, upload deferred)

---

## Data Model

### `profiles` table — 3 new columns

```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS title        TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url   TEXT;
```

`display_name` — shown on review card and used as the reviewer's public name.
`title` — profession or context e.g. "Frontend Dev", "Bootcamp Student".
`avatar_url` — optional. Stored as a URL. Avatar upload (Supabase Storage) is a future concern; for now users can paste a URL or leave it blank.

---

### `user_more_info` table — scaffolded, not yet wired to any UI

```sql
CREATE TABLE IF NOT EXISTS user_more_info (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  why_using         TEXT,
  experience_level  TEXT        CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
  languages_known   TEXT[],
  goals             TEXT[],
  learning_context  TEXT        CHECK (learning_context IN ('self_taught', 'bootcamp', 'university', 'professional')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE TRIGGER user_more_info_updated_at
  BEFORE UPDATE ON user_more_info
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- Note: CREATE OR REPLACE TRIGGER requires Postgres 14+. Supabase uses PG15+ so this is safe.
```

No UI for this table in this phase. Fields are all nullable. Designed for a future onboarding flow.

---

### `reviews` table

```sql
CREATE TABLE IF NOT EXISTS reviews (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  comment        TEXT        NOT NULL CHECK (char_length(comment) BETWEEN 10 AND 500),
  rating         SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  project_url    TEXT,
  project_label  TEXT        CHECK (char_length(project_label) <= 60),
  approved       BOOLEAN     NOT NULL DEFAULT false,
  approved_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_approved ON reviews (approved);

CREATE OR REPLACE TRIGGER reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

One review per user (`UNIQUE` on `user_id`). Editing a review resets `approved = false` and clears `approved_at`.

Review card data is pulled live from `profiles` (`display_name`, `title`, `avatar_url`) — not denormalized into `reviews`.

**RLS:** Service role only (same pattern as auth practice tables). No direct client access.

---

## API Routes

### Error shape

All routes return errors as `{ error: string }`, consistent with the rest of the API. Status codes: `400` bad input, `401` not authenticated, `403` not authorized (not paid / not superadmin).

### `POST /api/reviews` — submit or update own review

Auth: session (Supabase `getUser()`). Must have `ever_paid = true` on `profiles`.

Body: `{ comment, rating, project_url?, project_label? }`

Validation:
- `comment`: 10–500 chars
- `rating`: 1–5 integer
- `project_url`: valid URL if provided
- `project_label`: max 60 chars, only allowed if `project_url` is also present (validated at route level; the DB column has no FK constraint on this)

Behavior: upsert on `user_id`. On update, resets `approved = false`, clears `approved_at = null`.

Response: `201` for new review, `200` for update. Body: `{ success: true, status: "pending" }`

### `GET /api/reviews/mine` — get own review

Auth: session. Returns current review row or `{ review: null }`.

### `PATCH /api/profiles/me` — update display_name, title, avatar_url

Auth: session. Partial update — only the three profile fields.

Body: `{ display_name?, title?, avatar_url? }`

Validation: all optional. `display_name` max 80 chars, `title` max 80 chars, `avatar_url` valid URL if provided. Sending `null` or `""` for `display_name` or `title` clears the field (sets to `null`). The dashboard handles the resulting incomplete state.

### `GET /api/admin/reviews` — list reviews (admin)

Auth: session + `role === 'superadmin'`.

Query params: `?status=pending|approved|all` (default `pending`).

Returns reviews joined with profile data (`display_name`, `title`, `avatar_url`, `ever_paid`).

### `POST /api/admin/reviews/[id]/approve` — approve a review

Auth: session + `role === 'superadmin'`.

Sets `approved = true`, `approved_at = NOW()`.

### `DELETE /api/admin/reviews/[id]` — reject / delete a review

Auth: session + `role === 'superadmin'`.

Hard deletes the row permanently. The user must resubmit their review from scratch. This applies to both the Reject action (pending tab) and the Revoke action (approved tab) — both are permanent deletions.

---

## Landing Page — Wall of Love Component

**Location:** Below the quick example code block on `src/app/(main)/page.tsx`.

**Implementation:** Server component (`WallOfLove`). Fetches all approved reviews joined with profiles at render time. Shuffles order on each render (random server-side). Hidden if fewer than 4 approved reviews.

**Rendering:** The `WallOfLove` component file must export `const dynamic = 'force-dynamic'` — or the landing page must — so the shuffle varies per visitor rather than being frozen at build time. Given the landing page is otherwise static-friendly, `WallOfLove` should be extracted into its own async server component in a separate file with `export const dynamic = 'force-dynamic'`, keeping the rest of the landing page statically cacheable.

**Animation:** CSS infinite marquee. Two identical sets of cards concatenated side by side. `@keyframes` slides the container from `0` to `-50%` on `translateX` at a fixed speed (~30s). Pure CSS — no JS. Pauses on hover (`animation-play-state: paused`).

**Card contents:**
- Avatar: circular image if `avatar_url` present, otherwise colored circle with initials
- `display_name` (bold) + `title` (muted, below name)
- Star rating: filled/empty stars (1–5)
- Comment: max 180 chars displayed, truncated with `…` if longer
- Project link: small button/badge if `project_url` present, labeled with `project_label` or "View project"
- Subscriber badge: "Paid member" shown on all approved reviews (all submitters must be `ever_paid`)

---

## Dashboard — Review Section

**Visibility:** Shown only when `ever_paid = true`. Not shown to free-tier users.

**States:**

1. **Profile incomplete** — `display_name` is null/empty-string OR `title` is null/empty-string (both are required): shows inline mini-form. Both fields must be filled (non-empty) to proceed. Saves to `profiles` via `PATCH /api/profiles/me`.

2. **No review yet** — shows the review form: star picker (1–5), comment textarea (10–500 chars, live char count), optional project URL + label fields, optional avatar URL field with note "A photo makes your review stand out on the landing page". Submit button → `POST /api/reviews`.

3. **Pending review** — shows current comment + rating as read-only, badge "Pending approval", and an Edit button that toggles back to the form. Re-submitting resets approval status.

4. **Approved review** — shows "Your review is live on the landing page ✓". Edit button available (will require re-approval on save).

File: `src/app/(main)/dashboard/ReviewSection.tsx` (client component).

---

## Admin Dashboard `/admin-dashboard`

**Access control:** Server component checks `profiles.role === 'superadmin'`. Redirects to `/` if not.

**File:** `src/app/(main)/admin-dashboard/page.tsx`

**Layout:** Sidebar nav with sections. For now, one active section: **Reviews**. Future sections present as nav items with "Coming soon" placeholder: YouTube Videos, Tutorials, Repo Links.

**Reviews section:**

Two tabs: **Pending** (default) and **Approved**.

Pending tab shows a list of review cards:
- Reviewer name, title, avatar (from profile)
- Star rating + comment
- Project link if present
- Submitted date
- **Approve** button → `POST /api/admin/reviews/[id]/approve`
- **Reject** button (red, with confirmation) → `DELETE /api/admin/reviews/[id]`

Approved tab shows the same cards with a **Revoke** button (same delete endpoint). Approved reviews also show `approved_at`.

Actions are optimistic with loading state. No full page reload.

File: `src/app/(main)/admin-dashboard/ReviewsPanel.tsx` (client component).

---

## Cross-Cutting Concerns

### Auth pattern

All `/api/admin/*` routes follow the same pattern:
```ts
const { data: { user } } = await supabase.auth.getUser()
if (!user) return 401
const profile = await supabase.from("profiles").select("role").eq("id", user.id).single()
if (profile.data?.role !== "superadmin") return 403
```

### Review card avatar fallback

If `avatar_url` is null, derive initials from `display_name` (first letter of each word, max 2). Color the circle based on a hash of the user_id so the same user always gets the same color.

### Editing resets approval

Any `POST /api/reviews` that updates an existing review must:
1. Set `approved = false`
2. Clear `approved_at = null`

This is enforced at the route level, not by DB trigger, so the route is the single source of truth.

### No empty Wall of Love

The `WallOfLove` component returns `null` when fewer than 4 reviews are approved. The landing page renders nothing in that slot. This prevents an awkward half-empty section early on.

---

## File Map

| File | Action |
|------|--------|
| `docs/sql/wall-of-love.sql` | New migration: profiles columns, user_more_info, reviews tables |
| `src/app/api/reviews/route.ts` | POST (submit/update own review) |
| `src/app/api/reviews/mine/route.ts` | GET (own review) |
| `src/app/api/profiles/me/route.ts` | PATCH (update display_name, title, avatar_url) |
| `src/app/api/admin/reviews/route.ts` | GET (list reviews, admin) |
| `src/app/api/admin/reviews/[id]/approve/route.ts` | POST (approve) |
| `src/app/api/admin/reviews/[id]/route.ts` | DELETE (reject/revoke) |
| `src/app/(main)/page.tsx` | Add WallOfLove component below code example |
| `src/components/WallOfLove.tsx` | Server component + CSS marquee |
| `src/app/(main)/dashboard/page.tsx` | Add ReviewSection |
| `src/app/(main)/dashboard/ReviewSection.tsx` | Client component, 4 states |
| `src/app/(main)/admin-dashboard/page.tsx` | Superadmin page, sidebar nav |
| `src/app/(main)/admin-dashboard/ReviewsPanel.tsx` | Client component, approve/reject |
