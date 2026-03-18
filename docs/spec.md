# API Playground — Product Spec

## What It Is
A hosted backend-as-a-service for developers learning REST APIs. Pre-seeded data across multiple categories, writable user-scoped rows, auth practice accounts, and custom tables — all under one API key.

---

## Tiers

| Tier | Price | Access |
|------|-------|--------|
| Free | $0 | GET only, system rows, 50 req/day |
| Paid | $8/year | Full CRUD, custom tables, auth accounts, 1000 req/day |

Paddle as merchant of record. One transaction per year per user.

---

## API Key System
- Each paid account gets 1 active API key
- Key expires every 30 days — email warning 3 days before
- User regenerates from dashboard — simple, no friction
- Each paid account gets 2 gift keys to share
  - Gift keys = 30 days full access
  - Only redeemable by brand new accounts (never had a key before)
  - Gifter's key pool refills on annual renewal
- Creator/YouTuber tier: $20/year, pool of 50 gift keys

---

## System Data (Pre-seeded, Read-only)

Categories included from day one:
- Users (name, email, avatar, address, phone)
- Products (name, price, category, stock, image)
- Posts (title, body, author, date, tags)
- Comments (body, author, post_id, date)
- Cats (name, breed, age, color)
- Dogs (name, breed, age, size)
- Jokes (setup, punchline, category)
- Recipes (name, ingredients, steps, cuisine)
- Todos (title, done, priority, due_date)
- Orders (product_id, user_id, quantity, status, date)

All system rows have `is_system: true` — never deleteable.

Expand based on user requests (upvote board in dashboard).

---

## Endpoints (per category)

```
GET    /api/cats              — list all (system + user's own)
GET    /api/cats/:id          — single row
POST   /api/cats              — create (paid only)
PUT    /api/cats/:id          — update own rows only
DELETE /api/cats/:id          — delete own rows only
```

### Query params supported on all list endpoints:
- `?page=1&limit=10` — pagination
- `?sort=name&order=asc` — sorting
- `?search=fluffy` — text search across fields
- `?mine_only=true` — returns only user-created rows (empty state practice)

---

## Data Architecture

### Custom Table per API route that we offer

### Table: `user_rows`
```
id          uuid
user_id     uuid
data        jsonb       -- { name: "Whiskers", breed: "Tabby", age: 3 }
created_at  timestamp
```

Query logic merges system_rows + user_rows filtered by user_id on every request.

### Table: `custom_table_definitions`
```
id            uuid
user_id       uuid
table_name    text        -- e.g. "movies"
columns       jsonb       -- [{name: "title", type: "text"}, {name: "year", type: "number"}]
expires_at    timestamp
created_at    timestamp
```

### Table: `custom_rows`
```
id          uuid
user_id     uuid
table_id    uuid
data        jsonb       -- { title: "Inception", year: 2010 }
created_at  timestamp
```

---

## Custom Tables (Paid Feature)

User defines a table with column names and types. Auto-generated endpoints:
```
GET    /api/custom/:tableName
GET    /api/custom/:tableName/:id
POST   /api/custom/:tableName
PUT    /api/custom/:tableName/:id
DELETE /api/custom/:tableName/:id
```

One dynamic route handler reads the table definition and queries `custom_rows`.

Limits:
- Max 3 custom tables per user
- Max 100 rows per custom table
- Max field value length: 500 chars
- Tables expire after 90 days (refreshed on activity)

---

## Auth Practice Accounts (Paid Feature)

Separate from the billing account. Used to practice sign up / sign in flows.

Endpoints:
```
POST /auth/register     — create a practice account
POST /auth/login        — returns JWT
POST /auth/logout
GET  /auth/me           — returns current practice user (requires JWT)
POST /auth/refresh      — refresh token
```

Rules:
- Max 3 active practice accounts per billing account
- Each expires after 5 days
- On expiry: account deleted + all associated user_rows deleted
- Cron job runs nightly

---

## Rate Limiting

Two layers enforced in middleware on every request. IP check runs first, then API key check.

### Stack
**Upstash Redis** + `@upstash/ratelimit` library. Serverless, no infrastructure to manage, free tier covers early stage easily. Paid tier starts at $0.20 per 100k requests.

### Layer 1 — Per IP (anonymous + abuse prevention)
Catches scripts, bots, and free tier abuse before they even hit the API key check.

```js
const ipLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "10 s") // 5 requests per 10 seconds per IP
})
```

### Layer 2 — Per API key (paying users + leaked key protection)
```js
const keyLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(2, "1 s") // 2 requests per second per key
})
```

Sliding window used on both — prevents burst abuse at window boundaries that fixed window allows.

### Daily limits (existing, tracked in DB)
| Tier | Daily Limit |
|------|-------------|
| Free | 50 |
| Paid | 1000 |

### Middleware order
1. Check IP limiter — reject with 429 if exceeded
2. Check API key exists and is valid
3. Check API key limiter — reject with 429 if exceeded
4. Check daily limit from DB
5. Pass to route handler

### Progressive Punishment (Exponential Backoff Enforcement)

A single learner building something will never realistically send more than 2-3 requests per second. Anything beyond that is suspicious — shared key, leaked key, or script abuse.

Rather than a hard permanent ban, punishment escalates the more they push it. Strikes reset after 24 hours of clean behavior so legitimate users who accidentally hammer the API once get a 1 minute timeout and nothing more.

**Trigger:** 10+ requests in 5 seconds from the same API key

**Strike progression:**
```
Strike 1  → locked out 1 minute
Strike 2  → locked out 10 minutes
Strike 3  → locked out 1 hour
Strike 4  → locked out 24 hours
Strike 5  → key suspended + email sent to user
```

**Strike storage:** Upstash Redis with 24hr TTL. Strikes expire after 24 hours of clean behavior automatically.

**On strike 5 — email sent:**
> "Your API key was temporarily suspended due to unusual activity. If this was you, your key will resume in 24 hours. If you believe your key was compromised, regenerate it immediately from your dashboard."

This covers both cases — legitimate user whose key got leaked, and actual abuser. Key is not permanently killed, just suspended for 24 hours. User can regenerate instantly if they believe it was compromised.

**Note for implementation — dashboard burst problem:**
A user-built dashboard loading 6+ endpoints simultaneously on page load can look like abuse to a naive rate limiter. Research **unique endpoint detection per burst** before implementing — the signal to watch is the same endpoint hit many times in a second (script behavior), not many different endpoints hit at once (dashboard behavior). Raw request count alone is not a reliable abuse signal. Consider tracking endpoint uniqueness per burst window alongside total count.

---


```
HTTP 429
Retry-After: 600
{ "error": "Too many requests. Locked out for 10 minutes." }
```

---


```
HTTP 429 Too Many Requests
X-RateLimit-Reset: [timestamp]
X-RateLimit-Limit: 2
X-RateLimit-Remaining: 0
Retry-After: 1
```

### Abuse monitoring
- Same key hit from 10+ different IPs within 1 hour — flag and email user
- User can regenerate dev key instantly at any time

---



## Abuse Prevention

- Max 100 user-created rows per category per account
- Max 3 custom tables per account
- Max 3 practice auth accounts at a time
- Max payload size: 10kb per request
- Max field length: 500 chars
- Gift keys: only redeemable by brand new accounts
- API key tied to account — suspicious multi-IP usage flagged (logged, not auto-banned)

---

## My Data (Paid Feature)

A single dashboard page giving users full oversight of everything they have created across system categories and custom tables.

Two queries power the entire page — one for system category rows, one for custom tables.

UI:

```
My Data

System categories:
cats        12 rows    last added 2 days ago    [view] [clear mine]
dogs         3 rows    last added 1 week ago    [view] [clear mine]
users        0 rows    —

Custom tables:
movies      8 rows    expires in 87 days        [view] [manage] [delete table]
players     2 rows    expires in 45 days        [view] [manage] [delete table]
```

- [view] — opens inline spreadsheet showing their rows with edit and delete per row
- [clear mine] — wipes only their added rows from that category, system rows untouched. Good for resetting practice state.
- [manage] — opens the custom table row manager
- [delete table] — deletes the table definition and all its rows

Paid users only. Free tier has no writable rows so this page has nothing to show them.

---



- API key display + regenerate button
- Request count today / this month
- Gift key management (send, revoke, see status)
- Custom tables list (create, delete, see expiry)
- Practice auth accounts (create, delete, see expiry)
- Category request upvote board

---

## File Uploads (Paid Feature)

```
POST   /api/files/upload     — upload image, returns URL
GET    /api/files/:id        — retrieve file
DELETE /api/files/:id        — delete own file
```

- Stored in Supabase Storage
- `expires_at` set on upload (30 days)
- Nightly cron deletes expired files
- Max file size: 2mb
- Images only (jpg, png, webp)
- Max 10 files per account

---

## URL Behavior Modifiers

Middleware intercepts special path segments before the route handler. Works on all methods (GET, POST, PUT, DELETE).

### Delay modifiers
```
/slow1/cats   — 500ms delay
/slow2/cats   — 1500ms delay
/slow3/cats   — 3000ms delay
```
Any invalid value (e.g. `/slow50/cats`) defaults to slow3. Configurable from admin dashboard without code changes.

Purpose: lets tutorial writers slow down requests so learners can focus on the concept being taught, not query params or unrelated config.

### Chaos modifiers
```
/chaos/cats   — 30% chance of returning a random error response
/empty/cats   — always returns empty array (practice empty states)
/paginate/cats — forces pagination, never returns full list at once
/stale/cats   — returns real data but with fake staleness headers:
                 Last-Modified: 24hrs ago
                 X-Data-Age: 86400
                 X-Stale: true
/random/cats  — shuffles result order on every request
```

### Status code playground
```
/status/200
/status/201
/status/400
/status/401
/status/404
/status/500
```
Returns that exact status code with a relevant JSON body. Practice error handling UI without needing real errors.

---

## Webhooks (Paid Feature)

User registers a URL from their dashboard and selects event topics. Your cron job fires POST requests to their URL with fake event payloads.

Example payload:
```json
{
  "event": "order.created",
  "timestamp": "2026-03-16T10:00:00Z",
  "data": {
    "order_id": "abc123",
    "product": "Wireless Mouse",
    "amount": 29.99
  }
}
```

Available topics: `order.created`, `user.registered`, `comment.added`, `product.updated`

Dashboard shows a delivery log per webhook — every ping sent, timestamp, success/fail, response code returned by their server. Mirrors how real webhook providers work.

Limits:
- Max 2 registered webhook URLs per account
- Fires every 5 minutes per topic
- Log retains last 50 deliveries

---

## API Versioning Practice

Same data, different shape — teaches breaking change handling.

```
GET /v1/users   — { name, email }
GET /v2/users   — { firstName, lastName, emailAddress }
```

Available on core categories. Documented clearly so learners understand why versioning exists.

---

## Postman / Bruno Collection Export (Paid Feature)

One-click export of all endpoints (including custom tables) as a ready-to-import Postman or Bruno collection. API key pre-filled. Saves learners significant setup time.

---

## Embeddable Docs (Paid Feature)

Auto-generated documentation page for a user's custom tables. Shareable link. Makes portfolio projects look professional without any extra work.

---

## Response Size Control

```
GET /api/users?count=50   — returns exactly 50 users
```

Useful for testing how UI handles large or specific-sized datasets. Capped at 100.

---

## Changelog / Audit Log (Paid Feature)

Every mutation (POST, PUT, DELETE) on user-owned rows is logged.

```
GET /api/log   — returns last 100 actions with timestamp, method, endpoint, row_id
```

Teaches audit trail patterns used in real production apps.

---

## V2 — Projects (Relational Data)

Projects are curated sets of tables designed to work together with real relations. Separate from standalone tables — different namespace, different endpoints, no collision.

### Two layers

**Layer 1 — Standalone tables (current)**
Independent, no relations. Cats, dogs, jokes, users. Used for learning individual endpoints in isolation. The users table here is just fake people data, not an auth concept.

**Layer 2 — Project tables (v2)**
Namespaced under a project. Same data architecture under the hood, but tables reference each other and the URL reflects the project context.

```
/api/en/v1/users                    ← standalone, no relations
/api/projects/ecommerce/users       ← project-specific, relates to orders/products
/api/projects/ecommerce/orders
/api/projects/ecommerce/products
```

Table names stay simple inside a project. The project context comes from the URL prefix, not the table name. Adding a new project never requires new naming conventions.

---

### Example projects

**E-commerce**
```
users     → id, name, email, address
products  → id, name, price, category, stock
orders    → id, user_id, product_id, quantity, status, date
reviews   → id, user_id, product_id, rating, body, date
```

**Blog platform**
```
users     → id, name, email, avatar, bio
posts     → id, user_id, title, body, tags, published_at
comments  → id, user_id, post_id, body, created_at
likes     → id, user_id, post_id, created_at
```

**HR system**
```
employees    → id, name, email, department_id, role, salary, start_date
departments  → id, name, manager_id, budget
timesheets   → id, employee_id, date, hours, approved
```

---

### Relations via include param

```
GET /api/projects/ecommerce/orders?include=user,product
```

Handler fetches related rows from `user_rows` for included categories, joins in code before returning:

```json
{
  "id": 1,
  "quantity": 2,
  "status": "shipped",
  "user": { "id": 5, "name": "Mario", "email": "mario@example.com" },
  "product": { "id": 12, "name": "Keyboard", "price": 79 }
}
```

---

### Auth practice accounts connect here

Inside a project, the practice auth accounts integrate naturally. Authenticated requests attach the practice user_id automatically:

```
1. POST /auth/login → get JWT
2. POST /api/projects/ecommerce/orders  (JWT in header) → order linked to their user
3. GET  /api/projects/ecommerce/orders?user_id=me → fetch only their orders
```

Complete real world authenticated relational flow using existing infrastructure. Nothing new to build — just connecting auth practice accounts to project tables.

---

### Data isolation

Each user who activates a project gets their own copy of seed data scoped to their `user_id`. Same `user_rows` table, same ownership logic as always. No new infrastructure.

### Inactivity cleanup

Projects have a `last_active_at` timestamp updated on every request. Nightly cron wipes project rows inactive for 30 days. Email warning sent before deletion.

### Dashboard UI

```
Available projects:
🛒 E-commerce      [activate]
📝 Blog platform   [activate]
👥 HR system       [activate]

Your active projects:
🛒 E-commerce      active 3 days ago    [view endpoints] [reset data] [deactivate]
```

- Activate = seeds their copy instantly
- Reset = wipes and reseeds fresh
- Deactivate = cleans up immediately

---



- GraphQL endpoint on top of same data (paid tier upsell)
- MongoDB-style query endpoint — accepts Mongo syntax, translates to SQL under the hood
- Sandboxed SQL practice — separate schema per user, not raw DB access
- White-label for bootcamps — flat fee, students get free access under custom subdomain

---

## API Key Types

Users get two separate keys with different purposes and rules:

### 1. Development Key
- Default key every paid user gets
- Works on any domain including localhost
- Rotates every 30 days — email warning 3 days before
- Full access — GET + POST + PUT + DELETE
- Old key has 7 day grace period after rotation before dying completely
- During grace period responses include `X-Key-Status: expiring-soon` header

### 2. Portfolio Key
- Separate key generated on demand from dashboard
- Domain whitelisted only — works ONLY on registered domains
- Does NOT work on localhost — by design, intentional
- Never rotates — stable forever for live portfolio sites
- Full access — GET + POST + PUT + DELETE (no restrictions on methods)
- Up to 3 domains registered per portfolio key

Domain whitelisting rules:
- Registering `myportfolio.com` automatically covers `www.myportfolio.com` and all subdomains
- Up to 3 domains per portfolio key
- Domain mismatch returns clear `403` with message explaining why and linking to dashboard
- Headers checked: `Origin` first, `Referer` as fallback

Middleware check:
```js
const origin = req.headers.get("origin") || req.headers.get("referer")
const allowedDomains = key.whitelistedDomains // from DB
if (!allowedDomains.some(domain => origin?.includes(domain))) {
  return NextResponse.json({
    error: "Domain not whitelisted. Add your domain at yoursite.com/dashboard/keys"
  }, { status: 403 })
}
```

Abuse monitoring:
- Same key hit from many different IPs simultaneously — flag it, email user
- User can regenerate dev key instantly at any time without waiting for monthly cycle
- Portfolio key can be revoked and regenerated instantly

Dashboard UI:
```
Dev key:        dev_abc123...    expires in 12 days    [regenerate now]

Portfolio key:  port_xyz789...   never expires
                domains: myportfolio.com, myapp.vercel.app
                                                        [manage domains] [revoke]
```

---



### Account roles
```
role           | permissions
---------------|--------------------------------------------------
superadmin     | full access, everything, all locales
locale_admin   | INSERT + UPDATE only, own locale only, never DELETE
user           | standard paid account rules
free           | GET only
```

### Special system accounts
Instead of a complex translation architecture, locale data is seeded by special locale admin accounts. Their rows are treated as system rows — undeleteable by regular users.

```
user_id  | role         | locale
---------|--------------|-------
sys_en   | locale_admin | en     -- default English, your account
sys_fr   | locale_admin | fr     -- invite a real French person
sys_es   | locale_admin | es
sys_sr   | locale_admin | sr
```

Even English default data is owned by a locale admin account (sys_en), not hardcoded. This means you can update, improve, or expand seed data through the normal UI without touching code or running migrations.

### How it works
When a request hits `/api/fr/cats`:
- Pull rows where `user_id = sys_fr` (French system rows)
- Plus rows where `user_id = [requester]` (their own added rows)
- One extra OR condition in the query, nothing else changes

### Safety rule
Locale admins can INSERT and UPDATE only — never DELETE. Enforced as a permission flag checked in middleware before any DELETE operation. Prevents a rogue or compromised locale admin from wiping an entire language's data.

### Onboarding locale admins
- Invite a native speaker, give them a locale_admin account for their language
- They seed data through the normal dashboard UI
- If they go inactive, reassign the account or take it over yourself
- If they go rogue, revoke locale_admin role instantly — their rows remain, they just can't touch them anymore

---



- Next.js App Router (API routes)
- Supabase (Postgres + Storage + pg_cron)
- Paddle (payments + merchant of record)
- Vercel (hosting)

---

## Build Order

1. Supabase schema + seed system data
2. API key auth middleware + rate limiting
3. URL behavior modifier middleware (slow1/2/3, chaos, empty, stale, random, status)
4. First category endpoints (users) — full CRUD with ownership logic
5. Copy pattern to remaining categories
6. Custom tables (dynamic route handler)
7. Auth practice accounts + expiry cron
8. File uploads
9. Webhooks + delivery log
10. Dashboard UI (keys, gift keys, custom tables, auth accounts, webhook config, audit log, upvote board)
11. Postman/Bruno export + embeddable docs
12. Payments (Paddle) + gift key system
13. Launch
