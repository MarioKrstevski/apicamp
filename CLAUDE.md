# apicamp — API Playground

A hosted backend-as-a-service for developers learning REST APIs. Pre-seeded data
across multiple categories, writable user-scoped rows, auth practice, and custom
tables — all under one API key.

---

## Tech Stack

| Layer | Tool | Notes |
|-------|------|-------|
| Framework | Next.js 16 (App Router) | API routes + UI |
| Database | Supabase Postgres |
| Auth | Supabase Auth | Email/password — Supabase only, no NextAuth |
| Storage | Supabase Storage | File uploads (paid feature, future) |
| Validation | Zod | Config schema + request body validation |
| Styling | Tailwind CSS v4 + shadcn/ui | Component library pre-installed |
| Package manager | pnpm | Always use pnpm — never npm or yarn |
| Scripts | tsx | `pnpm tsx scripts/name.ts` |

---

## Architecture

### The config is the source of truth

Every table (users, products, quotes, books…) is defined by a single
TypeScript config file at `src/config/tables/[name].ts`, validated by a Zod
schema on import.

That config drives **everything**:

| Script / File | What it uses the config for |
|---------------|-----------------------------|
| `scripts/generate-schema.ts` | Outputs base Supabase SQL (run once) |
| `scripts/generate-seeds.ts` | Outputs INSERT SQL for seed data |
| `src/app/api/[...segments]/route.ts` | Enforces versions, filters, ownership, validation at runtime |
| `src/app/docs/[table]/page.tsx` | Auto-generates the docs page |

**Adding a new table = one config file + register it + seed data. Never touch the route handler.**

### Data model

Each API table has its own Postgres table with flat columns (no JSONB wrapper).
Every table includes `id UUID`, `num_id BIGSERIAL`, `user_id UUID` (ownership), and `created_at`.

```sql
-- Example: quotes table
quotes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  num_id      bigserial UNIQUE,
  user_id     uuid REFERENCES auth.users NOT NULL,
  text        text NOT NULL,
  author      varchar(120) NOT NULL,
  category    varchar(50) NOT NULL,
  source      varchar(200),
  year        integer,
  tags        jsonb,
  created_at  timestamptz DEFAULT now()
)
```

Every GET request merges rows owned by the requester + rows owned by the locale
admin account for the requested locale. RLS ensures users can only modify their own rows.

### API URL structure

```
GET    /api/[modifiers]/[resource]
GET    /api/[modifiers]/[resource]/[id]
POST   /api/[modifiers]/[resource]
PUT    /api/[modifiers]/[resource]/[id]
DELETE /api/[modifiers]/[resource]/[id]
```


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
v1,v2,v3 - versions
en,de,sp,sr,mk,fr - locales
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
      [...segments]/
        route.ts          ← one handler for ALL tables (catch-all segments)
  config/
    tables/
      users.ts            ← TableConfig
      products.ts         ← TableConfig
      quotes.ts           ← TableConfig
      books.ts            ← TableConfig
      students.ts         ← TableConfig
      resumes.ts          ← TableConfig
      animals.ts          ← TableConfig
    registry.ts           ← map of all configs, used by getTableConfig()
  lib/
    supabase/
      server.ts           ← server client (service role key)
      client.ts           ← browser client (anon key)
    tables.ts             ← getTableConfig(name)
    auth.ts               ← validateApiKey(key) → account | null
    rateLimit.ts          ← checkRateLimit(account) → null | { resetAt }
    versioning.ts         ← applyVersionShape(data, fields) → partial object
    validation.ts         ← validateFields(body, configFields, opts?)
    locales.ts            ← getLocaleAdminId(locale) → uuid
    audit.ts              ← logAudit(userId, method, table, rowId)
    modifiers.ts          ← extractModifier(searchParams) / applyModifier(mod)
  types/
    table.ts              ← Zod schema + TableConfig inferred type
  components/
    ui/                   ← shadcn/ui components
docs/
  sql/                    ← SQL scripts (create-tables, seeds)
  superpowers/plans/      ← implementation plans
scripts/
  seed-tables.ts          ← seeds all tables via Supabase client
```

---

## Common Commands

```bash
pnpm dev                                    # start dev server
pnpm build                                  # production build
pnpm lint                                   # eslint

pnpm tsx scripts/seed-tables.ts             # seed all tables via Supabase client
```

---

## Adding a New Table

1. Create `src/config/tables/[name].ts` — must satisfy `TableConfig` Zod schema
2. Add it to `src/config/registry.ts`
3. Create the DB table in Supabase (add SQL to `docs/sql/create-tables.sql`)
4. Add seed data to `scripts/seed-tables.ts` and run it
5. Done — `/api/en/v1/[name]` works automatically, docs at `/docs/[name]`

---

## Key Conventions

- **Zod first** — define the schema, infer the type with `z.infer<>`. Never write types manually when Zod can derive them.
- **Config = contract** — if behavior isn't defined in the config, it doesn't exist in the API.
- **No per-table route files** — the catch-all route at `[...segments]/route.ts` handles everything. Adding a route file for a specific table is always wrong.
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
- `LOCALE_ADMIN_EN` / `LOCALE_ADMIN_FR` / `LOCALE_ADMIN_ES` / `LOCALE_ADMIN_SR` / `LOCALE_ADMIN_DE` / `LOCALE_ADMIN_MK`

---

## Current Task List

| # | Task | Status |
|---|------|--------|
| 1 | Define Zod `TableConfig` schema (`src/types/table.ts`) | done |
| 2 | Create table configs: users, products, quotes, books, students, resumes, animals | done |
| 3 | Build SQL schema + seed script | done |
| 4 | Set up Supabase project and run migrations | done |
| 5 | Build all lib files needed by the route handler | done |
| 6 | Wire up catch-all API route (`[...segments]/route.ts`) | done |
| 7 | Build manage-dashboard pages per table | done |
| 8 | Build docs pages from config | pending |
