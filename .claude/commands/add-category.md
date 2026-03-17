# SKILL: Add New API Category

Use this skill whenever you need to add a new data category to the API playground (e.g. "movies", "books", "airports"). It will generate everything needed: config, seed data, and docs entry. The dynamic route handler does NOT need to be touched — it auto-handles all categories.

---

## What to generate

When asked to add a new category, generate these files and nothing else:

### 1. `config/categories/[name].ts`
The category config. Follow the pattern in `config/categories/users.ts` exactly.

Rules:
- Include ALL field types relevant to the category
- At minimum include: `id` (uuid, auto), `createdAt` (timestamp, auto), and 2-3 meaningful fields
- Always define at least v1 (minimal fields) and v2 (full fields) in `versions`
- Mark fields as `localizable: true` if they contain human-readable text (names, descriptions, titles)
- Never mark IDs, numbers, dates, URLs, or enums as localizable
- Set `locale: true` if the category has any localizable fields, otherwise false
- Set `searchable: true` on fields that make sense to search (names, titles, descriptions)
- Always include a `docs.examples` section with realistic example values

### 2. `seeds/[name].ts`
Seed data for the English locale admin account. Generate 20 rows minimum.

Rules:
- Data must be realistic and varied — no "Item 1", "Item 2" placeholder names
- Use real-sounding names, real city names, real-looking URLs
- Vary enum values across rows (don't make every row the same role/status)
- Boolean fields should be mixed true/false
- Number fields should vary within realistic ranges
- Include at least 3-4 rows with notably different values to make filtering/sorting interesting to practice

Format:
```ts
// seeds/[name].ts
export const [name]Seeds = [
  { name: "...", ... },
  ...
]
```

### 3. Entry in `config/registry.ts`
Add the new category to the registry so the dynamic handler discovers it.

```ts
// Add to the categories array:
import [name]Config from "./categories/[name]"
export const categories = [...existingCategories, [name]Config]
```

### 4. Entry in `docs/categories.ts`
Add a docs entry so the auto-generated docs page includes this category.

---

## What NOT to generate

- Do NOT create new route files — the dynamic handler covers everything
- Do NOT modify the dynamic route handler
- Do NOT create new middleware
- Do NOT create a new Supabase table — all data goes in `user_rows` with a `category` field
- Do NOT create UI components — the dashboard auto-generates from the config

---

## Field type reference

| Type        | Use for                              | Example                        |
|-------------|--------------------------------------|--------------------------------|
| `string`    | Names, titles, descriptions          | `"Whiskers"`                   |
| `number`    | Age, price, count, rating            | `3`, `29.99`                   |
| `boolean`   | Active status, flags                 | `true`                         |
| `email`     | Email addresses                      | `"user@example.com"`           |
| `url`       | Images, websites, avatars            | `"https://example.com/img.jpg"`|
| `phone`     | Phone numbers                        | `"+1 555 000 0000"`            |
| `date`      | Birthdates, publish dates            | `"1990-04-15"`                 |
| `timestamp` | Auto-managed created/updated times   | auto only, never user input    |
| `uuid`      | Auto-generated IDs                   | auto only, never user input    |
| `enum`      | Fixed set of options                 | `["active","inactive","pending"]` |
| `object`    | Nested structured data               | address, metadata              |
| `array`     | Lists of strings or objects          | tags, social links             |

---

## Versioning rules

- v1: minimal — id + 2 core identifying fields (name, title, etc.)
- v2: standard — adds descriptive fields (age, category, status, etc.)
- v3: full — adds nested objects, arrays, timestamps, all optional fields

Not all categories need v3. Only add it if there are genuinely more fields to expose.

---

## Locale rules

- Only add locale support if the category has human-readable text worth translating
- Categories like `airports` (code, name, city) — localizable
- Categories like `colors` (hex, rgb) — not localizable
- Mark only text fields as `localizable: true` — never IDs, numbers, URLs, enums

---

## Example invocation

**User says:** "Add a movies category"

**You generate:**
1. `config/categories/movies.ts` with fields: title, tagline, genre (enum), releaseYear (number), rating (number, 0-10), director, posterUrl (url), isClassic (boolean), languages (array of strings), createdAt (timestamp), id (uuid)
2. `seeds/movies.ts` with 20 realistic movie rows
3. Registry entry
4. Docs entry

**You do NOT:**
- Create route files
- Create Supabase migrations
- Modify any existing files except registry and docs

---

## Quality checklist before finishing

- [ ] Config has at least v1 and v2 versions defined
- [ ] All auto fields (id, createdAt) have `auto: true`
- [ ] At least one field is `searchable: true`
- [ ] Seed data has 20+ rows with realistic, varied values
- [ ] Localizable fields are marked correctly
- [ ] docs.examples has realistic URLs and body values
- [ ] Registry updated
- [ ] No new route files created
