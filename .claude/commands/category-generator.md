---
name: category-generator
description: Generate a new API category for the API Playground project. Use this skill whenever Mario asks to add a new category, table, or endpoint group to the API Playground. Triggers include "add a new category", "create a cats endpoint", "add a new table", "I want to add [thing] to the API", or any request to expand the available API data categories. This skill generates the config file, seed data, docs page, and dashboard UI entry for the new category — all consistent with existing patterns.
---

# Category Generator

Generates everything needed to add a new category to the API Playground. One config file drives all of it.

## What this skill produces

Given a category name and description, generate:

1. `config/categories/[name].ts` — category config with all fields, versions, locale support
2. `seed/[name].ts` — 20 English seed rows realistic for this category
3. `docs/[name].mdx` — auto-generated docs page with endpoint list and examples
4. Dashboard UI entry — one item to add to the categories list component

The dynamic route handler at `app/api/[locale]/[version]/[category]/route.ts` already handles everything. You do NOT need to create new route files.

---

## Step 1 — Write the config file

Location: `config/categories/[name].ts`

Follow this exact structure. All fields are required unless marked optional.

```ts
import { CategoryConfig } from "@/types/category"

const config: CategoryConfig = {
  name: "...",           // lowercase, singular, URL-safe
  label: "...",          // Title Case, used in UI
  description: "...",    // one sentence, shown in docs

  locale: true,          // set false if locale does not make sense (e.g. math facts)
  localeFields: [],      // which fields get translated — usually name + description

  versions: {
    v1: [],              // minimal fields — id + 2-3 core fields
    v2: [],              // v1 + a few more
    v3: []               // everything
  },

  fields: {
    // See field types reference below
  },

  searchable: [],        // fields to search with ?search=
  sortable: [],          // fields allowed in ?sort=
  filterable: [],        // fields allowed as ?field=value filters

  maxUserRows: 100,
  modifiers: ["slow1", "slow2", "slow3", "chaos", "empty", "paginate", "stale", "random"],
  seedCount: 20,
}

export default config
```

### Field types reference

| Type | Use for | Extra options |
|------|---------|---------------|
| string | short text | maxLength, searchable, translatable |
| text | long text | maxLength, searchable, translatable |
| number | float/decimal | min, max, precision |
| integer | whole numbers | min, max, default |
| boolean | true/false | default |
| enum | fixed values | values: [], translatable |
| enum_multi | multiple from fixed set | values: [], maxItems |
| array | list of values | itemType: string/url/number, maxItems |
| date | date only | — |
| datetime | date + time | auto: true to set on insert |
| url | validated URL | — |
| email | validated email | — |
| json | freeform object | description for docs |
| ref | link to another category | ref: "categoryName" |

Always include a createdAt datetime field with auto: true.
Always put id in all versions.
v1 should have 2-4 fields max. v2 adds depth. v3 is everything.

---

## Step 2 — Write seed data

Location: `seed/[name].ts`

Generate 20 realistic English rows. Rules:
- Varied, not repetitive — different values across rows
- Realistic — not "test1", "test2" — actual plausible data
- Cover edge cases — some with optional fields missing, some with all fields populated
- For locale=true categories, include name_fr, name_es, name_sr on at least 5 rows

```ts
import { SeedRow } from "@/types/seed"

export const [name]Seed: SeedRow[] = [
  {
    locale: "en",
    is_system: true,
    data: {
      // all fields populated
    }
  },
  // ... 19 more
]
```

---

## Step 3 — Write the docs page

Location: `docs/[name].mdx`

Follow this exact structure:

```
# [Label]

[One sentence description]

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET    | /api/en/v1/[name]     | Optional        | List all     |
| GET    | /api/en/v1/[name]/:id | Optional        | Get single   |
| POST   | /api/en/v1/[name]     | Required (paid) | Create       |
| PUT    | /api/en/v1/[name]/:id | Required (paid) | Update       |
| DELETE | /api/en/v1/[name]/:id | Required (paid) | Delete       |

## Versions

| Version | Fields returned |
|---------|----------------|
| v1 | [list v1 fields] |
| v2 | [list v2 fields] |
| v3 | [list v3 fields] |

## Query parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 10 | Results per page (max 100) |
| sort | string | created_at | Sort field |
| order | asc/desc | asc | Sort direction |
| search | string | — | Search across searchable fields |
| mine_only | boolean | false | Return only your rows |

## Example request

curl https://yourapi.com/api/en/v1/[name] -H "x-api-key: YOUR_API_KEY"

## Example response (v1)

{
  "data": [ { realistic v1 row } ],
  "meta": { "total": 20, "page": 1, "limit": 10, "totalPages": 2 }
}

## Locale support

curl https://yourapi.com/api/fr/v2/[name] -H "x-api-key: YOUR_API_KEY"

## Behaviour modifiers

/api/en/v1/slow2/[name]   — slow response
/api/en/v1/empty/[name]   — always empty
/api/en/v1/chaos/[name]   — random errors
```

---

## Step 4 — Add to dashboard categories list

File: `components/dashboard/CategoriesList.tsx`

Add one entry to the categories array:

```ts
{
  name: "[name]",
  label: "[Label]",
  icon: "[relevant lucide icon name]",
  description: "[one line description]",
  versions: ["v1", "v2", "v3"],
  locales: ["en", "fr", "es", "sr"]
}
```

---

## Step 5 — Register the config

File: `lib/categories/index.ts`

```ts
import [name]Config from "@/config/categories/[name]"

export const categories = {
  // ... existing
  [name]: [name]Config,
}
```

That is it. The route handler picks it up automatically. No new route files needed.

---

## Checklist before finishing

- [ ] Config file created with all field types correctly typed
- [ ] All versions defined (v1 minimal, v3 complete)
- [ ] Seed file has 20 rows, varied and realistic
- [ ] At least 5 seed rows have French/Spanish/Serbian name translations
- [ ] Docs page has working curl example
- [ ] Docs example response matches v1 fields exactly
- [ ] Dashboard entry added
- [ ] Config registered in lib/categories/index.ts
- [ ] No new route files created
