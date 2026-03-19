# Wall of Love Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let paid users submit testimonial reviews from their dashboard; approved reviews appear on the landing page as a CSS infinite marquee; superadmin approves/rejects from `/admin-dashboard`.

**Architecture:** SQL migration adds 3 columns to `profiles`, creates `user_more_info` (scaffolded, no UI), and creates `reviews`. Six API routes handle user and admin operations. A server component (`WallOfLove`) renders the marquee on the landing page. A client component (`ReviewSection`) handles the 4-state submission flow in the dashboard. A new `/admin-dashboard` page (superadmin-gated) handles review approvals.

**Tech Stack:** Next.js 16 App Router, Supabase Postgres + Auth SSR, Tailwind CSS v4, Zod, Vitest

---

## File Map

| File | Action |
|------|--------|
| `docs/sql/wall-of-love.sql` | Create — migration SQL |
| `src/lib/wall-of-love.ts` | Create — pure helpers (getInitials, getAvatarColor, shuffle) |
| `src/lib/__tests__/wall-of-love.test.ts` | Create — unit tests for pure helpers |
| `src/app/api/reviews/route.ts` | Create — POST (submit/update own review) |
| `src/app/api/reviews/mine/route.ts` | Create — GET (own review) |
| `src/app/api/profiles/me/route.ts` | Create — PATCH (display_name, title, avatar_url) |
| `src/app/api/admin/reviews/route.ts` | Create — GET (list, admin) |
| `src/app/api/admin/reviews/[id]/approve/route.ts` | Create — POST (approve) |
| `src/app/api/admin/reviews/[id]/route.ts` | Create — DELETE (reject/revoke) |
| `src/app/globals.css` | Modify — add marquee keyframe + utility |
| `src/components/WallOfLove.tsx` | Create — server component, CSS marquee |
| `src/app/(main)/page.tsx` | Modify — add `<WallOfLove />` below code example |
| `src/app/(main)/dashboard/ReviewSection.tsx` | Create — client component, 4 states |
| `src/app/(main)/dashboard/page.tsx` | Modify — add ReviewSection for ever_paid users |
| `src/app/(main)/admin-dashboard/page.tsx` | Create — superadmin page, sidebar nav |
| `src/app/(main)/admin-dashboard/ReviewsPanel.tsx` | Create — client component, approve/reject |

---

## Key patterns to follow

- **Auth in routes:** `await createClient()` → `supabase.auth.getUser()` → check user → check role/permission → act
- **Error shape:** always `{ error: string }` with appropriate status
- **Admin guard:** select `role` from `profiles` and check `=== "superadmin"` — same pattern for every admin route
- **Next.js 15+ dynamic params:** `params` is `Promise<{ id: string }>` — always `await params`
- **Client components:** `"use client"` at top, `useState` + `fetch` + try/catch/finally pattern (see `KeySection.tsx`)
- **Tests:** Vitest, `import { describe, it, expect } from "vitest"`, run with `pnpm vitest run`

---

## Task 1: SQL migration

**Files:**
- Create: `docs/sql/wall-of-love.sql`

This is a manual step — the implementer generates the SQL file, then the human pastes it into Supabase SQL Editor.

- [ ] **Step 1: Create the SQL file**

```sql
-- docs/sql/wall-of-love.sql
-- Wall of Love: profiles additions, user_more_info scaffold, reviews table.
-- Run in Supabase SQL Editor.
-- Requires: set_updated_at() already exists (from profiles-and-keys.sql).

-- ─── PROFILES: 3 new columns ─────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS title        TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url   TEXT;

-- ─── USER_MORE_INFO: scaffolded, no UI yet ───────────────────────────────────

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

-- Postgres 14+ required for CREATE OR REPLACE TRIGGER (Supabase uses PG15+)
CREATE OR REPLACE TRIGGER user_more_info_updated_at
  BEFORE UPDATE ON user_more_info
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE user_more_info ENABLE ROW LEVEL SECURITY;
-- Service role only — no client-facing policies

-- ─── REVIEWS ─────────────────────────────────────────────────────────────────

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

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
-- Service role only — no client-facing policies
```

- [ ] **Step 2: Commit the SQL file**

```bash
git add docs/sql/wall-of-love.sql
git commit -m "sql: add wall-of-love migration (profiles columns, user_more_info, reviews)"
```

- [ ] **Step 3: Human pastes SQL into Supabase SQL Editor and confirms**

---

## Task 2: Pure helpers + unit tests

**Files:**
- Create: `src/lib/wall-of-love.ts`
- Create: `src/lib/__tests__/wall-of-love.test.ts`

Pure functions used by both the WallOfLove component and the API validation. Test them first.

- [ ] **Step 1: Write failing tests**

```ts
// src/lib/__tests__/wall-of-love.test.ts
import { describe, it, expect } from "vitest"
import { getInitials, getAvatarColor, shuffle, AVATAR_COLORS } from "@/lib/wall-of-love"

describe("getInitials", () => {
  it("returns first letter of each word, max 2 chars", () => {
    expect(getInitials("Alice Walker")).toBe("AW")
  })
  it("handles single name", () => {
    expect(getInitials("Alice")).toBe("A")
  })
  it("handles more than 2 words — takes first 2 initials only", () => {
    expect(getInitials("Alice B Walker")).toBe("AB")
  })
  it("returns ? for null", () => {
    expect(getInitials(null)).toBe("?")
  })
  it("returns ? for empty string", () => {
    expect(getInitials("")).toBe("?")
  })
})

describe("getAvatarColor", () => {
  it("returns a string from AVATAR_COLORS", () => {
    const color = getAvatarColor("some-user-id")
    expect(AVATAR_COLORS).toContain(color)
  })
  it("is deterministic — same userId always gives same color", () => {
    expect(getAvatarColor("abc")).toBe(getAvatarColor("abc"))
  })
  it("different userIds can produce different colors", () => {
    const colors = new Set(
      ["a", "b", "c", "d", "e", "f", "g"].map(getAvatarColor)
    )
    expect(colors.size).toBeGreaterThan(1)
  })
})

describe("shuffle", () => {
  it("returns same elements", () => {
    const arr = [1, 2, 3, 4, 5]
    expect(shuffle(arr).sort()).toEqual([1, 2, 3, 4, 5])
  })
  it("does not mutate original array", () => {
    const arr = [1, 2, 3]
    const original = [...arr]
    shuffle(arr)
    expect(arr).toEqual(original)
  })
  it("returns array of same length", () => {
    expect(shuffle([1, 2, 3])).toHaveLength(3)
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
pnpm vitest run src/lib/__tests__/wall-of-love.test.ts
```

Expected: FAIL — `wall-of-love.ts` does not exist yet.

- [ ] **Step 3: Implement the helpers**

```ts
// src/lib/wall-of-love.ts

export const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-green-100 text-green-700",
  "bg-violet-100 text-violet-700",
  "bg-orange-100 text-orange-700",
  "bg-pink-100 text-pink-700",
  "bg-teal-100 text-teal-700",
] as const

export function getInitials(name: string | null): string {
  if (!name?.trim()) return "?"
  return name
    .trim()
    .split(/\s+/)
    .map(w => w[0].toUpperCase())
    .slice(0, 2)
    .join("")
}

export function getAvatarColor(userId: string): string {
  const hash = [...userId].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
pnpm vitest run src/lib/__tests__/wall-of-love.test.ts
```

Expected: PASS — 9 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/wall-of-love.ts src/lib/__tests__/wall-of-love.test.ts
git commit -m "feat: add wall-of-love pure helpers with tests"
```

---

## Task 3: User-facing API routes

**Files:**
- Create: `src/app/api/reviews/route.ts`
- Create: `src/app/api/reviews/mine/route.ts`
- Create: `src/app/api/profiles/me/route.ts`

No unit tests needed — these are thin route handlers (Supabase calls, Zod validation). Tested manually via the dashboard in Task 6.

- [ ] **Step 1: Create POST /api/reviews**

```ts
// src/app/api/reviews/route.ts
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { z } from "zod"

const schema = z.object({
  comment:       z.string().min(10, "Comment must be at least 10 characters").max(500, "Comment must be at most 500 characters"),
  rating:        z.number().int().min(1).max(5),
  project_url:   z.string().url("project_url must be a valid URL").optional().or(z.literal("").transform(() => undefined)),
  project_label: z.string().max(60, "project_label must be at most 60 characters").optional(),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("ever_paid")
    .eq("id", user.id)
    .single()

  if (!profile?.ever_paid) {
    return NextResponse.json({ error: "Paid account required to leave a review" }, { status: 403 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { comment, rating, project_url, project_label } = parsed.data

  if (project_label && !project_url) {
    return NextResponse.json({ error: "project_label requires project_url" }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from("reviews")
    .select("id")
    .eq("user_id", user.id)
    .single()

  const payload = {
    user_id:       user.id,
    comment,
    rating,
    project_url:   project_url ?? null,
    project_label: project_label ?? null,
    approved:      false,
    approved_at:   null,
  }

  const { error } = existing
    ? await supabase.from("reviews").update(payload).eq("user_id", user.id)
    : await supabase.from("reviews").insert(payload)

  if (error) return NextResponse.json({ error: "Failed to save review" }, { status: 500 })

  return NextResponse.json({ success: true, status: "pending" }, { status: existing ? 200 : 201 })
}
```

- [ ] **Step 2: Create GET /api/reviews/mine**

```ts
// src/app/api/reviews/mine/route.ts
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: review } = await supabase
    .from("reviews")
    .select("id, comment, rating, project_url, project_label, approved, approved_at, created_at, updated_at")
    .eq("user_id", user.id)
    .single()

  return NextResponse.json({ review: review ?? null })
}
```

- [ ] **Step 3: Create PATCH /api/profiles/me**

```ts
// src/app/api/profiles/me/route.ts
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { z } from "zod"

const schema = z.object({
  display_name: z.string().max(80).nullable().optional(),
  title:        z.string().max(80).nullable().optional(),
  avatar_url:   z.union([
    z.string().url("avatar_url must be a valid URL"),
    z.literal("").transform(() => null),
    z.null(),
  ]).optional(),
})

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  // Only include keys that were explicitly sent
  const updates: Record<string, unknown> = {}
  if ("display_name" in parsed.data) updates.display_name = parsed.data.display_name ?? null
  if ("title"        in parsed.data) updates.title        = parsed.data.title        ?? null
  if ("avatar_url"   in parsed.data) updates.avatar_url   = parsed.data.avatar_url   ?? null

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields provided" }, { status: 400 })
  }

  const { error } = await supabase.from("profiles").update(updates).eq("id", user.id)
  if (error) return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/reviews/route.ts src/app/api/reviews/mine/route.ts src/app/api/profiles/me/route.ts
git commit -m "feat: add user-facing review and profile API routes"
```

---

## Task 4: Admin API routes

**Files:**
- Create: `src/app/api/admin/reviews/route.ts`
- Create: `src/app/api/admin/reviews/[id]/approve/route.ts`
- Create: `src/app/api/admin/reviews/[id]/route.ts`

All three routes share the same admin guard pattern: getUser → check `profiles.role === "superadmin"`.

- [ ] **Step 1: Create GET /api/admin/reviews**

```ts
// src/app/api/admin/reviews/route.ts
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()
  if (profile?.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const status = req.nextUrl.searchParams.get("status") ?? "pending"

  let query = supabase
    .from("reviews")
    .select("id, comment, rating, project_url, project_label, approved, approved_at, created_at, user_id, profiles(display_name, title, avatar_url, ever_paid)")
    .order("created_at", { ascending: false })

  if (status === "pending")  query = query.eq("approved", false)
  if (status === "approved") query = query.eq("approved", true)
  // "all" — no filter

  const { data: reviews } = await query
  return NextResponse.json({ reviews: reviews ?? [] })
}
```

- [ ] **Step 2: Create POST /api/admin/reviews/[id]/approve**

```ts
// src/app/api/admin/reviews/[id]/approve/route.ts
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()
  if (profile?.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const { error } = await supabase
    .from("reviews")
    .update({ approved: true, approved_at: new Date().toISOString() })
    .eq("id", id)

  if (error) return NextResponse.json({ error: "Failed to approve review" }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3: Create DELETE /api/admin/reviews/[id]**

```ts
// src/app/api/admin/reviews/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()
  if (profile?.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const { error } = await supabase.from("reviews").delete().eq("id", id)
  if (error) return NextResponse.json({ error: "Failed to delete review" }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/reviews/route.ts src/app/api/admin/reviews/[id]/approve/route.ts src/app/api/admin/reviews/[id]/route.ts
git commit -m "feat: add admin review API routes (list, approve, delete)"
```

---

## Task 5: WallOfLove server component + landing page

**Files:**
- Modify: `src/app/globals.css` (add marquee keyframe)
- Create: `src/components/WallOfLove.tsx`
- Modify: `src/app/(main)/page.tsx`

- [ ] **Step 1: Add marquee keyframe to globals.css**

Open `src/app/globals.css`. At the very end of the file, append:

```css
/* ─── Marquee animation (Wall of Love) ──────────────────────────────────── */
@keyframes marquee {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}

@utility animate-marquee {
  animation: marquee 35s linear infinite;
}
```

> **Note:** `@utility` is the correct Tailwind v4 directive for custom utilities. If the build fails to apply the class (marquee doesn't animate), fall back to the `@layer utilities` syntax instead:
> ```css
> @layer utilities {
>   .animate-marquee { animation: marquee 35s linear infinite; }
> }
> ```
> Verify after running `pnpm dev` that the marquee card container moves.

- [ ] **Step 2: Create WallOfLove server component**

```tsx
// src/components/WallOfLove.tsx
export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase/server"
import { getInitials, getAvatarColor, shuffle } from "@/lib/wall-of-love"

type ReviewRow = {
  id: string
  user_id: string
  comment: string
  rating: number
  project_url: string | null
  project_label: string | null
  profiles: {
    display_name: string | null
    title: string | null
    avatar_url: string | null
  } | null
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5 text-sm">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < rating ? "text-amber-400" : "text-muted-foreground/20"}>★</span>
      ))}
    </div>
  )
}

function ReviewCard({ review }: { review: ReviewRow }) {
  const p = review.profiles
  const name = p?.display_name ?? "Anonymous"
  const comment = review.comment.length > 180
    ? review.comment.slice(0, 177) + "…"
    : review.comment
  const initials = getInitials(p?.display_name ?? null)
  const colorClass = getAvatarColor(review.user_id)

  return (
    <div className="w-72 shrink-0 rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center gap-3">
        {p?.avatar_url ? (
          <img
            src={p.avatar_url}
            alt={name}
            className="w-10 h-10 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${colorClass}`}>
            {initials}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{name}</p>
          {p?.title && (
            <p className="text-xs text-muted-foreground truncate">{p.title}</p>
          )}
        </div>
        <span className="ml-auto shrink-0 text-xs rounded-full bg-primary/10 text-primary px-2 py-0.5 font-medium">
          Paid
        </span>
      </div>

      <StarRating rating={review.rating} />

      <p className="text-sm text-muted-foreground leading-relaxed">{comment}</p>

      {review.project_url && (
        <a
          href={review.project_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary underline underline-offset-4"
        >
          {review.project_label ?? "View project"} →
        </a>
      )}
    </div>
  )
}

export async function WallOfLove() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("reviews")
    .select("id, user_id, comment, rating, project_url, project_label, profiles(display_name, title, avatar_url)")
    .eq("approved", true)

  const reviews = (data as ReviewRow[] | null) ?? []
  if (reviews.length < 4) return null

  const shuffled = shuffle(reviews)

  return (
    <section className="mt-16">
      <h2 className="text-center text-lg font-semibold text-foreground mb-8">
        Loved by developers
      </h2>
      <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
        <div className="flex gap-4 w-max animate-marquee hover:[animation-play-state:paused]">
          {[...shuffled, ...shuffled].map((review, i) => (
            <ReviewCard key={`${review.id}-${i}`} review={review} />
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Add WallOfLove to landing page**

Open `src/app/(main)/page.tsx`. After the closing `</div>` of the quick example block (line 74), add:

```tsx
import { WallOfLove } from "@/components/WallOfLove"

// ... inside <main>, after the quick example div:
<WallOfLove />
```

The import goes at the top. The component goes after the `{/* Quick example */}` section. The `</main>` tag stays at the end.

Full modified file:

```tsx
import Link from "next/link"
import { WallOfLove } from "@/components/WallOfLove"

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-24">
      {/* Hero */}
      <div className="text-center">
        <span className="inline-block rounded-full border border-border px-3 py-1 text-xs text-muted-foreground mb-6">
          Free to start · $8/year for full access
        </span>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          A real API to practice against
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
          Pre-seeded data across multiple categories. Full CRUD, auth practice,
          custom tables, and behavior modifiers — all under one API key.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href="/docs"
            className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80 transition-colors"
          >
            Browse the API
          </Link>
          <Link
            href="/pricing"
            className="rounded-md border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            See pricing
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="mt-24 grid gap-6 sm:grid-cols-3">
        <div className="rounded-lg border border-border p-5">
          <h3 className="font-medium text-foreground">Pre-seeded data</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Cats, products, users, recipes, jokes — ready to query. No setup required.
          </p>
        </div>
        <div className="rounded-lg border border-border p-5">
          <h3 className="font-medium text-foreground">Behavior modifiers</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Add <code className="text-xs font-mono bg-muted px-1 py-0.5 rounded">/slow2/</code> or{" "}
            <code className="text-xs font-mono bg-muted px-1 py-0.5 rounded">/chaos/</code> to any
            endpoint to simulate real-world conditions.
          </p>
        </div>
        <div className="rounded-lg border border-border p-5">
          <h3 className="font-medium text-foreground">Auth practice</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Spin up disposable practice accounts to test sign-up and login flows.
          </p>
        </div>
      </div>

      {/* Quick example */}
      <div className="mt-16 rounded-lg border border-border bg-muted/50 p-6">
        <p className="text-xs font-mono text-muted-foreground mb-3">Example request</p>
        <pre className="text-sm font-mono text-foreground overflow-x-auto">
{`GET https://apicamp.dev/api/en/v1/cats
Authorization: Bearer YOUR_API_KEY`}
        </pre>
        <div className="mt-4 border-t border-border pt-4">
          <p className="text-xs font-mono text-muted-foreground mb-3">Response</p>
          <pre className="text-sm font-mono text-foreground overflow-x-auto">
{`[
  { "id": 1, "name": "Whiskers", "breed": "Tabby", "age": 3, "color": "orange" },
  { "id": 2, "name": "Luna", "breed": "Siamese", "age": 5, "color": "cream" }
]`}
          </pre>
        </div>
      </div>

      <WallOfLove />
    </main>
  )
}
```

- [ ] **Step 4: Check build (no TypeScript errors)**

```bash
pnpm build 2>&1 | grep -E "error|Error" | head -20
```

Expected: no errors related to WallOfLove or the landing page.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css src/components/WallOfLove.tsx src/app/(main)/page.tsx
git commit -m "feat: add WallOfLove server component with CSS marquee to landing page"
```

---

## Task 6: Dashboard ReviewSection

**Files:**
- Create: `src/app/(main)/dashboard/ReviewSection.tsx`
- Modify: `src/app/(main)/dashboard/page.tsx`

- [ ] **Step 1: Create ReviewSection client component**

```tsx
// src/app/(main)/dashboard/ReviewSection.tsx
"use client"

import { useState } from "react"

type Review = {
  id: string
  comment: string
  rating: number
  project_url: string | null
  project_label: string | null
  approved: boolean
  approved_at: string | null
}

type ProfileData = {
  display_name: string | null
  title: string | null
  avatar_url: string | null
}

type Props = {
  initialReview: Review | null
  profile: ProfileData
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`text-2xl transition-colors ${n <= value ? "text-amber-400" : "text-muted-foreground/30 hover:text-amber-300"}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

export function ReviewSection({ initialReview, profile: initialProfile }: Props) {
  const [review, setReview]     = useState<Review | null>(initialReview)
  const [profile, setProfile]   = useState(initialProfile)
  const [editing, setEditing]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  // Profile form state
  const [profileName,  setProfileName]  = useState(initialProfile.display_name ?? "")
  const [profileTitle, setProfileTitle] = useState(initialProfile.title ?? "")

  // Review form state
  const [comment,      setComment]      = useState(initialReview?.comment ?? "")
  const [rating,       setRating]       = useState(initialReview?.rating ?? 5)
  const [projectUrl,   setProjectUrl]   = useState(initialReview?.project_url ?? "")
  const [projectLabel, setProjectLabel] = useState(initialReview?.project_label ?? "")
  const [avatarUrl,    setAvatarUrl]    = useState(initialProfile.avatar_url ?? "")

  const profileComplete = !!(profile.display_name?.trim() && profile.title?.trim())

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!profileName.trim() || !profileTitle.trim()) {
      setError("Name and title are required")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/profiles/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: profileName.trim(), title: profileTitle.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setProfile(p => ({ ...p, display_name: profileName.trim(), title: profileTitle.trim() }))
    } catch {
      setError("Network error — please try again")
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      // Save avatar_url to profile if changed
      if (avatarUrl !== (profile.avatar_url ?? "")) {
        await fetch("/api/profiles/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatar_url: avatarUrl || null }),
        })
        setProfile(p => ({ ...p, avatar_url: avatarUrl || null }))
      }

      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment,
          rating,
          project_url:   projectUrl  || undefined,
          project_label: projectLabel || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }

      // Re-fetch own review to get the saved row
      const mineRes = await fetch("/api/reviews/mine")
      const mineData = await mineRes.json()
      setReview(mineData.review)
      setEditing(false)
    } catch {
      setError("Network error — please try again")
    } finally {
      setLoading(false)
    }
  }

  // State 1: Profile incomplete
  if (!profileComplete) {
    return (
      <section className="rounded-lg border border-border p-6 space-y-4">
        <h2 className="font-semibold text-foreground">Leave a review</h2>
        <p className="text-sm text-muted-foreground">
          Add your name and title before leaving a review — these appear on the landing page.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <form onSubmit={handleSaveProfile} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Name</label>
            <input
              value={profileName}
              onChange={e => setProfileName(e.target.value)}
              placeholder="Alice Walker"
              required
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Title</label>
            <input
              value={profileTitle}
              onChange={e => setProfileTitle(e.target.value)}
              placeholder="Frontend Developer, Bootcamp Student, …"
              required
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80 disabled:opacity-50 transition-colors"
          >
            {loading ? "Saving…" : "Save and continue"}
          </button>
        </form>
      </section>
    )
  }

  // State 2 / 3 (editing): Review form
  if (!review || editing) {
    return (
      <section className="rounded-lg border border-border p-6 space-y-4">
        <h2 className="font-semibold text-foreground">
          {review ? "Edit your review" : "Leave a review"}
        </h2>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <form onSubmit={handleSubmitReview} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Rating</label>
            <StarPicker value={rating} onChange={setRating} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Comment <span className="text-muted-foreground font-normal">(10–500 chars)</span>
            </label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={4}
              minLength={10}
              maxLength={500}
              required
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
            <p className="text-xs text-muted-foreground text-right mt-1">{comment.length}/500</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Project link <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              type="url"
              value={projectUrl}
              onChange={e => setProjectUrl(e.target.value)}
              placeholder="https://my-weather-app.vercel.app"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          {projectUrl && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Link label <span className="text-muted-foreground font-normal">(optional, max 60 chars)</span>
              </label>
              <input
                value={projectLabel}
                onChange={e => setProjectLabel(e.target.value)}
                maxLength={60}
                placeholder="My weather app"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Photo URL <span className="text-muted-foreground font-normal">(optional — a photo makes your review stand out)</span>
            </label>
            <input
              type="url"
              value={avatarUrl}
              onChange={e => setAvatarUrl(e.target.value)}
              placeholder="https://…"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80 disabled:opacity-50 transition-colors"
            >
              {loading ? "Saving…" : "Submit review"}
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => { setEditing(false); setError(null) }}
                className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>
    )
  }

  // State 3: Pending approval
  if (!review.approved) {
    return (
      <section className="rounded-lg border border-border p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Your review</h2>
          <span className="text-xs rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 px-2 py-0.5">
            Pending approval
          </span>
        </div>
        <p className="text-sm text-muted-foreground italic">&ldquo;{review.comment}&rdquo;</p>
        <button
          onClick={() => {
            setEditing(true)
            setComment(review.comment)
            setRating(review.rating)
            setProjectUrl(review.project_url ?? "")
            setProjectLabel(review.project_label ?? "")
          }}
          className="text-sm text-primary underline underline-offset-4"
        >
          Edit review
        </button>
      </section>
    )
  }

  // State 4: Approved / live
  return (
    <section className="rounded-lg border border-border p-6 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-foreground">Your review</h2>
        <span className="text-xs rounded-full bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300 px-2 py-0.5">
          Live on landing page
        </span>
      </div>
      <p className="text-sm text-muted-foreground italic">&ldquo;{review.comment}&rdquo;</p>
      <button
        onClick={() => {
          setEditing(true)
          setComment(review.comment)
          setRating(review.rating)
          setProjectUrl(review.project_url ?? "")
          setProjectLabel(review.project_label ?? "")
        }}
        className="text-sm text-primary underline underline-offset-4"
      >
        Edit review (will require re-approval)
      </button>
    </section>
  )
}
```

- [ ] **Step 2: Modify dashboard page to fetch and pass data to ReviewSection**

Open `src/app/(main)/dashboard/page.tsx`. Add:
1. Import `ReviewSection`
2. In the `Promise.all`, add fetches for own review and profile fields
3. Add `ReviewSection` below `GiftKeySection` for `ever_paid` users

Full modified file:

```tsx
// src/app/(main)/dashboard/page.tsx
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getActiveKey, getGiftKeys, getExpiredKey } from "@/lib/keys"
import { KeySection } from "./KeySection"
import { GiftKeySection } from "./GiftKeySection"
import { ReviewSection } from "./ReviewSection"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const [profile, activeKey, expiredKey, giftKeys, subscription, reviewResult] = await Promise.all([
    supabase.from("profiles")
      .select("role, is_blocked, ever_paid, display_name, title, avatar_url")
      .eq("id", user.id).single().then(r => r.data),
    getActiveKey(user.id),
    getExpiredKey(user.id),
    getGiftKeys(user.id),
    supabase.from("subscriptions").select("id, gift_keys_earned, gift_keys_used, expires_at")
      .eq("user_id", user.id).gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }).limit(1).single().then(r => r.data),
    supabase.from("reviews")
      .select("id, comment, rating, project_url, project_label, approved, approved_at, created_at, updated_at")
      .eq("user_id", user.id).single().then(r => r.data),
  ])

  const hasActiveSub = !!subscription
  const everPaid = profile?.ever_paid ?? false

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
        everPaid={everPaid}
      />

      {hasActiveSub && subscription && (
        <GiftKeySection
          giftKeys={giftKeys}
          giftKeysEarned={subscription.gift_keys_earned}
          giftKeysUsed={subscription.gift_keys_used}
        />
      )}

      {!everPaid && !activeKey && !expiredKey && (
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

      {everPaid && (
        <ReviewSection
          initialReview={reviewResult ?? null}
          profile={{
            display_name: profile?.display_name ?? null,
            title:        profile?.title         ?? null,
            avatar_url:   profile?.avatar_url    ?? null,
          }}
        />
      )}
    </main>
  )
}
```

- [ ] **Step 3: Check build**

```bash
pnpm build 2>&1 | grep -E "error|Error" | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/(main)/dashboard/ReviewSection.tsx src/app/(main)/dashboard/page.tsx
git commit -m "feat: add ReviewSection to dashboard for paid users"
```

---

## Task 7: Admin dashboard

**Files:**
- Create: `src/app/(main)/admin-dashboard/page.tsx`
- Create: `src/app/(main)/admin-dashboard/ReviewsPanel.tsx`

- [ ] **Step 1: Create ReviewsPanel client component**

```tsx
// src/app/(main)/admin-dashboard/ReviewsPanel.tsx
"use client"

import { useState } from "react"

type ReviewWithProfile = {
  id: string
  comment: string
  rating: number
  project_url: string | null
  project_label: string | null
  approved: boolean
  approved_at: string | null
  created_at: string
  profiles: {
    display_name: string | null
    title: string | null
    avatar_url: string | null
    ever_paid: boolean
  } | null
}

type Props = {
  initialPending:  ReviewWithProfile[]
  initialApproved: ReviewWithProfile[]
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <span className="text-sm">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < rating ? "text-amber-400" : "text-muted-foreground/20"}>★</span>
      ))}
    </span>
  )
}

function ReviewCard({
  review,
  onApprove,
  onDelete,
  approving,
  deleting,
}: {
  review: ReviewWithProfile
  onApprove?: () => void
  onDelete:   () => void
  approving?: boolean
  deleting:   boolean
}) {
  const p = review.profiles
  const name = p?.display_name ?? "Unknown"
  const [confirmDelete, setConfirmDelete] = useState(false)

  function handleDeleteClick() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setConfirmDelete(false)
    onDelete()
  }

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-foreground">{name}</p>
          {p?.title && <p className="text-xs text-muted-foreground">{p.title}</p>}
          {p?.ever_paid && (
            <span className="inline-block text-xs rounded-full bg-primary/10 text-primary px-2 py-0.5 font-medium mt-1">
              Paid member
            </span>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <StarDisplay rating={review.rating} />
          <span className="text-xs text-muted-foreground">
            Submitted {new Date(review.created_at).toLocaleDateString()}
          </span>
          {review.approved_at && (
            <span className="text-xs text-muted-foreground">
              Approved {new Date(review.approved_at).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{review.comment}</p>

      {review.project_url && (
        <a
          href={review.project_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary underline underline-offset-4"
        >
          {review.project_label ?? review.project_url} →
        </a>
      )}

      <div className="flex gap-2 pt-1 items-center">
        {onApprove && (
          <button
            onClick={onApprove}
            disabled={approving}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/80 disabled:opacity-50 transition-colors"
          >
            {approving ? "Approving…" : "Approve"}
          </button>
        )}
        {confirmDelete ? (
          <>
            <span className="text-xs text-muted-foreground">Are you sure?</span>
            <button
              onClick={handleDeleteClick}
              disabled={deleting}
              className="rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-white hover:bg-destructive/80 disabled:opacity-50 transition-colors"
            >
              {deleting ? "Deleting…" : "Yes, delete"}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs text-muted-foreground underline underline-offset-4"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            onClick={handleDeleteClick}
            disabled={deleting}
            className="rounded-md border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/5 disabled:opacity-50 transition-colors"
          >
            {review.approved ? "Revoke" : "Reject"}
          </button>
        )}
      </div>
    </div>
  )
}

export function ReviewsPanel({ initialPending, initialApproved }: Props) {
  const [tab,      setTab]      = useState<"pending" | "approved">("pending")
  const [pending,  setPending]  = useState(initialPending)
  const [approved, setApproved] = useState(initialApproved)
  const [loading,  setLoading]  = useState<Record<string, "approving" | "deleting" | null>>({})
  const [error,    setError]    = useState<string | null>(null)

  async function handleApprove(id: string) {
    setLoading(l => ({ ...l, [id]: "approving" }))
    setError(null)
    try {
      const res = await fetch(`/api/admin/reviews/${id}/approve`, { method: "POST" })
      if (!res.ok) { setError("Failed to approve"); return }
      const item = pending.find(r => r.id === id)
      if (item) {
        setPending(p => p.filter(r => r.id !== id))
        setApproved(a => [{ ...item, approved: true, approved_at: new Date().toISOString() }, ...a])
      }
    } catch {
      setError("Network error — please try again")
    } finally {
      setLoading(l => ({ ...l, [id]: null }))
    }
  }

  async function handleDelete(id: string) {
    setLoading(l => ({ ...l, [id]: "deleting" }))
    setError(null)
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" })
      if (!res.ok) { setError("Failed to delete"); return }
      setPending(p  => p.filter(r => r.id !== id))
      setApproved(a => a.filter(r => r.id !== id))
    } catch {
      setError("Network error — please try again")
    } finally {
      setLoading(l => ({ ...l, [id]: null }))
    }
  }

  const list = tab === "pending" ? pending : approved

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(["pending", "approved"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t} {t === "pending" ? `(${pending.length})` : `(${approved.length})`}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No {tab} reviews.
        </p>
      ) : (
        <div className="space-y-3">
          {list.map(review => (
            <ReviewCard
              key={review.id}
              review={review}
              onApprove={tab === "pending" ? () => handleApprove(review.id) : undefined}
              onDelete={() => handleDelete(review.id)}
              approving={loading[review.id] === "approving"}
              deleting={loading[review.id] === "deleting"}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create admin dashboard page**

```tsx
// src/app/(main)/admin-dashboard/page.tsx
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ReviewsPanel } from "./ReviewsPanel"

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "superadmin") redirect("/")

  const [pendingResult, approvedResult] = await Promise.all([
    supabase
      .from("reviews")
      .select("id, comment, rating, project_url, project_label, approved, approved_at, created_at, profiles(display_name, title, avatar_url, ever_paid)")
      .eq("approved", false)
      .order("created_at", { ascending: false }),
    supabase
      .from("reviews")
      .select("id, comment, rating, project_url, project_label, approved, approved_at, created_at, profiles(display_name, title, avatar_url, ever_paid)")
      .eq("approved", true)
      .order("approved_at", { ascending: false }),
  ])

  return (
    <main className="mx-auto max-w-4xl px-6 py-12 space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Superadmin tools</p>
      </div>

      {/* Sidebar nav */}
      <div className="flex gap-8">
        <nav className="w-40 shrink-0">
          <ul className="space-y-1">
            <li>
              <span className="block rounded-md bg-muted px-3 py-2 text-sm font-medium text-foreground">
                Reviews
              </span>
            </li>
            <li>
              <span className="block rounded-md px-3 py-2 text-sm text-muted-foreground cursor-not-allowed">
                YouTube videos
                <span className="ml-1 text-xs opacity-60">(soon)</span>
              </span>
            </li>
            <li>
              <span className="block rounded-md px-3 py-2 text-sm text-muted-foreground cursor-not-allowed">
                Tutorials
                <span className="ml-1 text-xs opacity-60">(soon)</span>
              </span>
            </li>
            <li>
              <span className="block rounded-md px-3 py-2 text-sm text-muted-foreground cursor-not-allowed">
                Repo links
                <span className="ml-1 text-xs opacity-60">(soon)</span>
              </span>
            </li>
          </ul>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-medium text-foreground mb-4">Reviews</h2>
          <ReviewsPanel
            initialPending={pendingResult.data ?? []}
            initialApproved={approvedResult.data ?? []}
          />
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Check build**

```bash
pnpm build 2>&1 | grep -E "error|Error" | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/(main)/admin-dashboard/page.tsx src/app/(main)/admin-dashboard/ReviewsPanel.tsx
git commit -m "feat: add /admin-dashboard with review approval UI"
```

---

## Final verification

- [ ] Run all tests to confirm nothing regressed:

```bash
pnpm vitest run
```

Expected: all tests pass (keys tests + auth-practice tests + new wall-of-love tests).

- [ ] Final build check:

```bash
pnpm build
```

Expected: build succeeds with no errors.
