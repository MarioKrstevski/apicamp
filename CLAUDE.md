# apicamp — API Playground

A hosted backend-as-a-service for developers learning REST APIs. Pre-seeded data
across multiple categories, writable user-scoped rows, auth practice, and custom
tables — all under one API key.

---

## Tech Stack

| Layer | Tool | Notes |
|-------|------|-------|
| Framework | Next.js 16 (App Router) | API routes + UI |
| Database | Supabase Postgres | All data in `user_rows` JSONB table |
| Auth | Supabase Auth | Email/password — Supabase only, no NextAuth |
| Storage | Supabase Storage | File uploads (paid feature, future) |
| Validation | Zod | Config schema + request body validation |
| Styling | Tailwind CSS v4 + shadcn/ui | Component library pre-installed |
| Package manager | pnpm | Always use pnpm — never npm or yarn |
| Scripts | tsx | `pnpm tsx scripts/name.ts` |

---

## Architecture

### The config is the source of truth

Every data category (users, products, posts, cats…) is defined by a single
TypeScript config file at `src/config/categories/[name].ts`, validated by a Zod
schema on import.

That config drives **everything**:

| Script / File | What it uses the config for |
|---------------|-----------------------------|
| `scripts/generate-schema.ts` | Outputs base Supabase SQL (run once) |
| `scripts/generate-seeds.ts` | Outputs INSERT SQL for seed data |
| `src/app/api/[locale]/[version]/[category]/route.ts` | Enforces versions, filters, ownership, validation at runtime |
| `src/app/docs/[category]/page.tsx` | Auto-generates the docs page |

**Adding a new category = one config file + two script runs. Never touch the route handler.**

### Data model

All category data lives in one Supabase table:

```sql
user_rows (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users NOT NULL,
  category    text NOT NULL,       -- "cats", "users", "products"
  locale      text NOT NULL,       -- "en", "fr", "es", "sr"
  is_system   boolean DEFAULT false, -- seeded rows, never deleteable by users
  data        jsonb NOT NULL,      -- { name: "Whiskers", breed: "Tabby", age: 3 }
  created_at  timestamptz DEFAULT now()
)
```

Every GET request merges rows owned by the requester + rows owned by the locale
admin account for the requested locale.

### API URL structure

```
GET    /api/[locale]/[version]/[category]
GET    /api/[locale]/[version]/[category]/[id]
POST   /api/[locale]/[version]/[category]
PUT    /api/[locale]/[version]/[category]/[id]
DELETE /api/[locale]/[version]/[category]/[id]
```

Supported locales: `en`, `fr`, `es`, `sr`
Supported versions per category: `v1`, `v2`, `v3` (defined in config)

### Behavior modifiers

Middleware-intercepted URL segments that change response behavior:

```
slow1  — 500ms delay
slow2  — 1500ms delay
slow3  — 3000ms delay
chaos  — 30% chance of random error (500/503/504)
empty  — always returns empty array
stale  — returns real data + fake staleness headers
random — shuffles result order on every request
```

Usage: `GET /api/en/v1/slow2/users`

### Tiers

| Tier | Price | Limits |
|------|-------|--------|
| Free | $0 | GET only, 50 req/day |
| Paid | $8/year | Full CRUD, 1000 req/day |

---

## File Structure

```
src/
  app/
    api/
      [locale]/[version]/[category]/
        route.ts          ← one handler for ALL categories
  config/
    categories/
      users.ts            ← CategoryConfig
      products.ts         ← CategoryConfig
      posts.ts            ← CategoryConfig
    registry.ts           ← map of all configs, used by getCategoryConfig()
  lib/
    supabase/
      server.ts           ← server client (service role key)
      client.ts           ← browser client (anon key)
    categories.ts         ← getCategoryConfig(name)
    auth.ts               ← validateApiKey(key) → account | null
    rateLimit.ts          ← checkRateLimit(account) → null | { resetAt }
    versioning.ts         ← applyVersionShape(data, fields) → partial object
    validation.ts         ← validateFields(body, configFields, opts?)
    locales.ts            ← getLocaleAdminId(locale) → uuid
    audit.ts              ← logAudit(userId, method, category, rowId)
    modifiers.ts          ← extractModifier(searchParams) / applyModifier(mod)
  types/
    category.ts           ← Zod schema + CategoryConfig inferred type
  components/
    ui/                   ← shadcn/ui components
docs/
  spec.md                 ← full product specification
  extensions.md           ← future features roadmap
  examples/               ← reference route examples
  superpowers/plans/      ← implementation plans
scripts/
  generate-schema.ts      ← outputs base Supabase SQL (run once)
  generate-seeds.ts       ← outputs seed INSERT SQL for a category
.claude/
  commands/
    category-generator.md ← /category-generator skill
    add-category.md       ← detailed add-category reference
```

---

## Common Commands

```bash
pnpm dev                                    # start dev server
pnpm build                                  # production build
pnpm lint                                   # eslint

pnpm tsx scripts/generate-schema.ts         # output base Supabase schema SQL
pnpm tsx scripts/generate-seeds.ts users    # output seed SQL for a category
```

---

## Adding a New Category

1. Create `src/config/categories/[name].ts` — must satisfy `CategoryConfig` Zod schema
2. Add it to `src/config/registry.ts`
3. Run `pnpm tsx scripts/generate-seeds.ts [name]` — paste output into Supabase SQL editor
4. Done — `/api/en/v1/[name]` works automatically, docs at `/docs/[name]`

Use the `/category-generator` Claude Code skill for a guided walkthrough.

---

## Key Conventions

- **Zod first** — define the schema, infer the type with `z.infer<>`. Never write types manually when Zod can derive them.
- **Config = contract** — if behavior isn't defined in the config, it doesn't exist in the API.
- **No per-category route files** — the dynamic route at `[category]/route.ts` handles everything. Adding a route file for a specific category is always wrong.
- **Supabase only** — no external auth providers, no Redis, no other backend services. Rate limiting uses DB counters until scale demands otherwise.
- **pnpm only** — never run `npm install` or `yarn add` in this project.
- **Service role key = server only** — never import `lib/supabase/server.ts` from a client component or expose the service role key to the browser.

---

## Env Vars

See `.env.example` for all required variables and descriptions. Copy to `.env.local` and fill in your values.

Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `LOCALE_ADMIN_EN` / `LOCALE_ADMIN_FR` / `LOCALE_ADMIN_ES` / `LOCALE_ADMIN_SR`

---

## Current Task List

| # | Task | Status |
|---|------|--------|
| 1 | Define Zod CategoryConfig schema (`src/types/category.ts`) | pending |
| 2 | Create 3 initial category configs: users, products, posts | pending |
| 3 | Build SQL + seed generator scripts | pending |
| 4 | Set up Supabase project and run migrations | pending |
| 5 | Build all lib files needed by the route handler | pending |
| 6 | Wire up and smoke-test the dynamic API route | pending |
| 7 | Build docs generator from config | pending |
