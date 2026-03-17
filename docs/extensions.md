# API Playground — Extensions

These are features beyond the core API product. They add learning value, community, and additional revenue without changing the core infrastructure.

---

## YouTube Library

A curated page of videos showing the API in use.

- Embedded YouTube videos (your own or community creators)
- Organized by category or difficulty (beginner, intermediate)
- Each video tagged with which endpoints it covers
- Simple to maintain — backed by a JSON file or a basic CMS table
- Can feature YouTubers who promote the product (mutual benefit)

No complex infrastructure needed. A styled page with a list of videos.

---

## Mini Courses

Short, structured lessons that teach REST API concepts using this product's endpoints as the practice environment.

Structure:
- Courses broken into chapters
- Each chapter has a lesson (text + code examples) and an exercise
- Learner marks chapters complete — progress stored in their account
- Completion unlocks the next chapter

Example course: "Build your first dashboard with a REST API"
- Chapter 1: Making your first GET request
- Chapter 2: Displaying a list with pagination
- Chapter 3: Handling loading and empty states
- Chapter 4: Posting data with a form
- Chapter 5: Deleting a row with confirmation

Backed by:
- `courses` table (id, title, description)
- `chapters` table (id, course_id, order, content)
- `user_progress` table (user_id, chapter_id, completed_at)

---

## Quiz System

Multiple choice quizzes at the end of each chapter or course.

- Questions stored in DB with correct answer flagged
- User submits answers, score calculated server-side
- Pass threshold configurable per quiz (e.g. 80%)
- Failed quiz can be retaken, progress not lost
- Results stored per user

Example question:
"Which HTTP method should you use to update a single field on an existing resource?"
- A) GET
- B) POST
- C) PATCH ✓
- D) DELETE

---

## Exercise / Code Challenge System

Practical exercises where the learner must make a real API call that matches expected criteria.

How it works:
- Exercise defines an expected outcome (e.g. "fetch page 2 of cats, sorted by name ascending")
- Learner writes their code and hits a special `/verify/:exerciseId` endpoint
- That endpoint checks: correct method, correct path, correct query params
- Returns pass/fail with hints if failed
- Pass stored in `user_progress`

This teaches them to actually use the API correctly, not just read about it.

Backed by:
- `exercises` table (id, chapter_id, expected_method, expected_path, expected_params, hint)
- Pass/fail logic in the verify endpoint

---

## Certificate of Completion

Awarded when a learner completes all chapters and passes all quizzes/exercises in a course.

- PDF generated on demand with learner's name, course name, completion date
- Unique certificate ID stored in DB (verifiable via a public URL)
- Shareable link: `yoursite.com/certificate/:id`
- Anyone can visit the link to verify it's real

Great for portfolio use. Learners will share these, which is free marketing.

Tech: generate PDF using a simple HTML template + headless PDF generation (e.g. Puppeteer or a PDF library).

---

## Pro / Supporter Tier

A third pricing tier for people who want to support the project and get community access.

| Tier | Price | Access |
|------|-------|--------|
| Free | $0 | GET only, 50 req/day |
| Paid | $8/year | Full API access |
| Pro | $50/year | Everything + Discord + supporter badge |

Pro perks:
- Access to private Discord community
- Supporter badge on their dashboard profile
- Early access to new categories and features
- Vote weight on the category upvote board (counts as 3 votes)
- Name in a public supporters page (opt-in)

Discord integration:
- V1: manual invite after payment confirmed
- V2: Discord bot checks subscription status via Paddle webhook, auto-assigns role

Positioning: frame it as supporting an indie project you believe in, not just buying features. People respond to that.

---

## Promotion Strategy for This Audience

- Reddit: r/learnprogramming, r/webdev, r/Frontend — post as a tool you built, not an ad
- Dev.to / Hashnode — write tutorials that use your own API as the example backend
- YouTube outreach — contact mid-size coding educators (10k–100k subs), offer free Pro access in exchange for featuring it in a tutorial
- Promo codes via Paddle — YouTubers get a code to share with their audience (e.g. first 100 uses at 50% off)
- ProductHunt launch — even modest launches bring early adopters
- Bootcamp Discord servers — your exact target audience, share genuinely

---

## Wall of Love

Social proof page on the marketing site showing real user reviews.

Fields per review:
- Name
- Photo (optional upload)
- Account tier badge (Free / Paid / Pro — pulled from their account)
- Review text
- Star rating (1–5)
- Permission checkbox ("I allow this to be displayed publicly")

Rules:
- You manually approve each review before it goes live
- Only authenticated users can submit (no anonymous reviews)
- One review per account
- Can be updated by the user at any time (re-enters approval queue)

Notes:
- Don't launch this on day one — wait until you have 5–10 genuine reviews
- An empty wall looks worse than no wall
- Paid/Pro badges next to names signal that real people found it worth paying for

Backed by a simple `reviews` table (user_id, text, rating, photo_url, approved, created_at).

---

## Caffè Sospeso — Suspended Accounts

Inspired by the Italian tradition of paying for a coffee for a stranger. Someone tips any amount and it generates free accounts for people who can't afford it.

How it works:
- Tipper enters a custom amount (any value, no fixed price)
- Every $8 = 1 suspended account added to the communal pool
- Example: $50 tip = 6 accounts in the pool
- Anyone can hit a "request free access" button and claim one

Tipper experience:
- Dashboard shows "you've helped X people get access"
- Name optionally shown on a supporters page (opt-in)
- No fixed perks — this is purely generosity-driven

Claimer experience:
- Quiet "request free access" link — not prominently advertised, but findable
- One claim per email address ever (no recycling)
- Short optional "why do you want access" field
- Manual approval by you for v1 to prevent abuse

Technical:
- Paddle supports variable/custom pricing on a product
- `suspended_accounts` pool tracked in DB (count increments on tip, decrements on claim)
- `claims` table stores who claimed, when, and which tip funded it

---

## Internationalization (i18n)

The REST API learning space is almost entirely in English. This is a real gap — Spanish has ~45 courses, most other languages have fewer than 10.

What needs translating:
- Dashboard UI
- Marketing site
- Documentation
- Course content and quizzes

What does NOT need translating:
- API responses (JSON keys are always English — that's standard)
- Endpoint paths

Implementation:
- Next.js + next-intl (same stack as Termino — zero new learning curve)
- All UI text lives in JSON translation files per language
- Adding a new language = adding one new JSON file per section
- Course content stored in DB with a `language` field, same structure

Launch strategy:
- Ship in English first
- Crowdsource translations from community — offer 1 free Pro year to anyone who translates a full course into their language
- Priority languages: Serbian/Croatian, Slovenian (Balkan market), then Spanish and Portuguese for global reach

---

## Build Order (Extensions)

1. YouTube library page (day 1 — just a styled list)
2. Pro tier in Paddle + manual Discord invites
3. Caffè sospeso tipping + suspended accounts pool
4. Mini course structure (courses + chapters + progress tracking)
5. Quiz system
6. Exercise / verify endpoint system
7. Certificate generation + public verify URL
8. Wall of love (after first real users)
9. i18n — English first, then Serbian/Croatian, Spanish, Portuguese
10. Discord bot automation (V2)
