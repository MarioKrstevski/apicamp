# apicamp

A hosted backend-as-a-service for developers learning REST APIs. Pre-seeded data across multiple categories, writable user-scoped rows, versioned endpoints, locale support, and behavior modifiers — all under one API key.

## Tech Stack

- **Next.js 16** (App Router)
- **Supabase** — Postgres, Auth, Storage
- **Zod** — config schema validation
- **Tailwind CSS v4** + **shadcn/ui**
- **pnpm**

## Getting Started

```bash
pnpm install
cp .env.example .env.local   # fill in your Supabase credentials
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only) |
| `NEXT_PUBLIC_APP_URL` | App URL (default: `http://localhost:3000`) |
| `LOCALE_ADMIN_EN/FR/ES/SR` | UUIDs of locale admin accounts in Supabase Auth |

## API

```
GET    /api/[locale]/[version]/[category]
GET    /api/[locale]/[version]/[category]/[id]
POST   /api/[locale]/[version]/[category]
PUT    /api/[locale]/[version]/[category]/[id]
DELETE /api/[locale]/[version]/[category]/[id]
```

Example: `GET /api/en/v2/users?page=1&limit=10&sort=age&order=asc`

### Behavior Modifiers

```
/api/en/v1/slow2/users   — 1500ms delay
/api/en/v1/chaos/users   — 30% random errors
/api/en/v1/empty/users   — always returns []
/api/en/v1/stale/users   — fake staleness headers
```

## Scripts

```bash
pnpm tsx scripts/generate-schema.ts          # output base Supabase SQL
pnpm tsx scripts/generate-seeds.ts [name]    # output seed SQL for a category
```

## Adding a New Category

1. Create `src/config/categories/[name].ts`
2. Add it to `src/config/registry.ts`
3. Run the seed script and paste output into Supabase SQL editor
4. Done — the route and docs page exist automatically

See `CLAUDE.md` for full architecture details and conventions.
