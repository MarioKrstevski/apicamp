# Project Setup Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up project foundations — CLAUDE.md, Supabase + Zod packages, .env.example — so every subsequent task has a clear contract to work from.

**Architecture:** Config-driven API playground built on Next.js App Router + Supabase only (auth, DB, storage). All category data lives in a single `user_rows` JSONB table. A Zod-validated `TableConfig` type is the single source of truth for SQL generation, seed data, validation, and docs.

**Tech Stack:** Next.js 16 (App Router), Supabase (Auth + Postgres + Storage), Zod, pnpm, TypeScript strict, Tailwind CSS v4, shadcn/ui

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `CLAUDE.md` | Create | Project context for Claude Code — stack, conventions, file structure, task list |
| `.env.example` | Create | Documents every required env var with descriptions |
| `.env.local` | Create (gitignored) | Local dev values (user fills in their own) |
| `package.json` | Modify | Add `@supabase/supabase-js`, `@supabase/ssr`, `zod` as deps; `tsx` as devDep |

---

## Task 1: Install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install Supabase and Zod**

```bash
pnpm add @supabase/supabase-js @supabase/ssr zod
```

Expected: packages added to `dependencies` in package.json.

- [ ] **Step 2: Install tsx as dev dependency (for running scripts)**

```bash
pnpm add -D tsx
```

Expected: `tsx` added to `devDependencies`.

- [ ] **Step 3: Verify install**

```bash
pnpm list @supabase/supabase-js @supabase/ssr zod tsx
```

Expected: all 4 packages listed with version numbers. No errors.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add supabase, zod, tsx dependencies"
```

---

## Task 2: Create .env.example

**Files:**
- Create: `.env.example`
- Create: `.env.local` (not committed)

- [ ] **Step 1: Create `.env.example`**

```bash
cat > .env.example << 'EOF'
# ─── Supabase ────────────────────────────────────────────────────────────────
# Found in: Supabase dashboard → Project Settings → API

# Your project URL (safe to expose — used in browser)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co

# Anon/public key (safe to expose — used in browser, restricted by RLS)
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Service role key (NEVER expose — server-side only, bypasses RLS)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# ─── App ─────────────────────────────────────────────────────────────────────
# Full URL of the app (used for auth redirects and docs examples)
NEXT_PUBLIC_APP_URL=http://localhost:3003

# ─── Locale Admin Account UUIDs ──────────────────────────────────────────────
# These are the Supabase Auth user IDs of the locale admin accounts.
# System seed data is owned by these accounts (is_system = true).
# Create them once in Supabase Auth, then paste their UUIDs here.
LOCALE_ADMIN_EN=uuid-of-english-locale-admin
LOCALE_ADMIN_FR=uuid-of-french-locale-admin
LOCALE_ADMIN_ES=uuid-of-spanish-locale-admin
LOCALE_ADMIN_SR=uuid-of-serbian-locale-admin
EOF
```

- [ ] **Step 2: Create `.env.local` for local dev (user fills in real values)**

```bash
cp .env.example .env.local
```

- [ ] **Step 3: Verify `.env.local` is gitignored**

```bash
grep ".env.local" .gitignore
```

Expected: `.env.local` appears in the output. If not, add it:

```bash
echo ".env.local" >> .gitignore
```

- [ ] **Step 4: Commit**

```bash
git add .env.example .gitignore
git commit -m "chore: add .env.example with all required variables"
```

---

## Task 3: Create CLAUDE.md

**Files:**
- Create: `CLAUDE.md` (root of project)

- [ ] **Step 1: Create CLAUDE.md**

```bash
cat > CLAUDE.md << 'CLAUDEOF'
# apicamp — API Playground

A hosted backend-as-a-service for developers learning REST APIs. Pre-seeded data
across multiple categories, writable user-scoped rows, auth practice, and custom
tables — all under one API key.

---

## Tech Stack

| Layer | Tool | Notes |
|-------|------|-------|
| Framework | Next.js 16 (App Router) | API routes only for now, UI later |
| Database | Supabase Postgres | All data in `user_rows` JSONB table |
| Auth | Supabase Auth | Email/password. Supabase only — no NextAuth |
| Storage | Supabase Storage | File uploads (paid feature) |
| Validation | Zod | Config schema + request body validation |
| Styling | Tailwind CSS v4 + shadcn/ui | |
| Package manager | pnpm | Always use pnpm, never npm/yarn |
| Scripts | tsx | Run TypeScript scripts with `pnpm tsx scripts/name.ts` |

---

## Architecture

### The config is the source of truth

Every data category (users, products, posts, cats…) is defined by a single
TypeScript config file in `src/config/tables/[name].ts`. The config is
validated by a Zod schema at import time.

That config drives **everything**:

- `scripts/generate-schema.ts` → reads configs → outputs base Supabase SQL
- `scripts/generate-seeds.ts` → reads a config → outputs INSERT SQL for seed data
- `src/app/api/[locale]/[version]/[category]/route.ts` → reads config at runtime
  to enforce versions, filters, ownership rules, and validation
- `src/app/docs/[category]/page.tsx` → reads config → renders docs page

**Adding a new category = writing one config file + running two scripts.**
You never touch the route handler or create new route files.

### Data model

All category data lives in a single Supabase table:

```
user_rows
  id          uuid (PK)
  user_id     uuid (FK → auth.users)
  category    text          -- "cats", "users", "products" etc.
  locale      text          -- "en", "fr", "es", "sr"
  is_system   boolean       -- true = seeded by locale admin, never deleteable
  data        jsonb         -- { name: "Whiskers", breed: "Tabby", age: 3 }
  created_at  timestamptz
```

Query logic: every GET request merges rows owned by the requester + rows owned
by the locale admin for that locale.

### API URL structure

```
GET /api/[locale]/[version]/[category]
GET /api/[locale]/[version]/[category]/[id]
POST /api/[locale]/[version]/[category]
PUT /api/[locale]/[version]/[category]/[id]
DELETE /api/[locale]/[version]/[category]/[id]
```

Supported locales: `en`, `fr`, `es`, `sr`
Supported versions: `v1`, `v2`, `v3` (defined per category in config)

### Behavior modifiers (URL path segments)

```
/api/en/v1/slow2/users   — 1500ms delay
/api/en/v1/chaos/users   — 30% random errors
/api/en/v1/empty/users   — always returns []
/api/en/v1/stale/users   — fake staleness headers
/api/en/v1/random/users  — shuffled results
```

### Tiers

| Tier | Price | Access |
|------|-------|--------|
| Free | $0 | GET only, 50 req/day |
| Paid | $8/year | Full CRUD, 1000 req/day |

---

## File Structure

```
src/
  app/
    api/
      [...segments]/
        route.ts          ← ONE file handles ALL tables
  config/
    tables/
      users.ts            ← TableConfig for users
      products.ts         ← TableConfig for products
      quotes.ts           ← TableConfig for quotes
    registry.ts           ← exports all configs as a map
  lib/
    supabase/
      server.ts           ← server-side client (service role)
      client.ts           ← browser-side client (anon key)
    tables.ts             ← getTableConfig(name)
    auth.ts               ← validateApiKey(key)
    rateLimit.ts          ← checkRateLimit(account)
    versioning.ts         ← applyVersionShape(data, fields)
    validation.ts         ← validateFields(body, configFields)
    locales.ts            ← getLocaleAdminId(locale)
    audit.ts              ← logAudit(...)
    modifiers.ts          ← extractModifier / applyModifier
  types/
    table.ts              ← Zod schema + TableConfig type
  components/
    ui/                   ← shadcn/ui components
docs/
  spec.md                 ← full product spec
  extensions.md           ← future features roadmap
  examples/               ← reference route examples
  superpowers/plans/      ← implementation plans
scripts/
  generate-schema.ts      ← outputs base Supabase SQL
  generate-seeds.ts       ← outputs seed INSERT SQL for a category
.claude/
  commands/
    category-generator.md ← /category-generator skill
    add-category.md       ← add category reference
```

---

## Common Commands

```bash
pnpm dev                              # start dev server
pnpm build                            # production build
pnpm lint                             # run eslint

pnpm tsx scripts/generate-schema.ts   # output base Supabase schema SQL
pnpm tsx scripts/generate-seeds.ts users   # output seed SQL for a category
```

---

## Adding a New Category

1. Create `src/config/tables/[name].ts` — must satisfy `TableConfig` Zod schema
2. Add it to `src/config/registry.ts`
3. Run `pnpm tsx scripts/generate-seeds.ts [name]` — paste output into Supabase SQL editor
4. Done — `/api/en/v1/[name]` works automatically

Use the `/category-generator` Claude Code skill for a guided walkthrough.

---

## Current Task List

| # | Task | Status |
|---|------|--------|
| 1 | Define Zod TableConfig schema (`src/types/table.ts`) | done |
| 2 | Create table configs: users, products, quotes, books, students, resumes, animals | done |
| 3 | Build SQL + seed generator scripts | pending |
| 4 | Set up Supabase project and run migrations | pending |
| 5 | Build all lib files needed by the route handler | pending |
| 6 | Wire up and smoke-test the dynamic API route | pending |
| 7 | Build docs generator from config | pending |

---

## Key Conventions

- **Zod first** — define the schema, infer the type. Never write a type manually
  if Zod can derive it.
- **Config = contract** — if a behavior isn't in the config, it doesn't exist.
- **No per-category route files** — the dynamic route handles everything.
- **Supabase only** — no external auth, no Redis, no other backend services.
  Rate limiting uses DB counters until scale demands otherwise.
- **pnpm only** — never use npm or yarn in this project.
CLAUDEOF
```

- [ ] **Step 2: Verify the file was created**

```bash
wc -l CLAUDE.md
```

Expected: ~170 lines.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add CLAUDE.md with full project context and conventions"
```

---

## Verification

After all 3 tasks complete, confirm:

- [ ] `pnpm list zod @supabase/supabase-js @supabase/ssr tsx` shows all 4 packages
- [ ] `.env.example` exists and has all 8 variables documented
- [ ] `.env.local` exists and is in `.gitignore`
- [ ] `CLAUDE.md` exists at root with stack, architecture, file structure, task list
- [ ] `git log --oneline -5` shows 3 clean commits
CLAUDEOF
