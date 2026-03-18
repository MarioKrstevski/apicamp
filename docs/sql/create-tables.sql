-- ─────────────────────────────────────────────────────────────────────────────
-- apicamp — table creation SQL
-- Paste this into the Supabase SQL Editor and run it.
--
-- Standard schema for every non-users table:
--   id          UUID primary key (auto)
--   num_id      BIGSERIAL — numeric id for beginner-friendly access (/api/quotes/1)
--   user_id     FK → auth.users — ownership
--   locale      text — "en" | "fr" | "es" | "sr" | "de" | "mk"
--   is_system   boolean — seeded rows (never deletable by regular users)
--   data        jsonb — the actual resource payload
--   created_at  timestamptz
-- ─────────────────────────────────────────────────────────────────────────────


-- ─── QUOTES ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS quotes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  num_id      BIGSERIAL   UNIQUE NOT NULL,
  user_id     UUID        REFERENCES auth.users NOT NULL,
  locale      TEXT        NOT NULL DEFAULT 'en',
  is_system   BOOLEAN     NOT NULL DEFAULT false,
  data        JSONB       NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotes_user_id   ON quotes (user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_locale     ON quotes (locale);
CREATE INDEX IF NOT EXISTS idx_quotes_data       ON quotes USING GIN (data);


-- ─── BOOKS ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS books (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  num_id      BIGSERIAL   UNIQUE NOT NULL,
  user_id     UUID        REFERENCES auth.users NOT NULL,
  locale      TEXT        NOT NULL DEFAULT 'en',
  is_system   BOOLEAN     NOT NULL DEFAULT false,
  data        JSONB       NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_books_user_id   ON books (user_id);
CREATE INDEX IF NOT EXISTS idx_books_locale     ON books (locale);
CREATE INDEX IF NOT EXISTS idx_books_data       ON books USING GIN (data);


-- ─── STUDENTS ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS students (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  num_id      BIGSERIAL   UNIQUE NOT NULL,
  user_id     UUID        REFERENCES auth.users NOT NULL,
  locale      TEXT        NOT NULL DEFAULT 'en',
  is_system   BOOLEAN     NOT NULL DEFAULT false,
  data        JSONB       NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_students_user_id   ON students (user_id);
CREATE INDEX IF NOT EXISTS idx_students_locale     ON students (locale);
CREATE INDEX IF NOT EXISTS idx_students_data       ON students USING GIN (data);


-- ─── RESUMES ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS resumes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  num_id      BIGSERIAL   UNIQUE NOT NULL,
  user_id     UUID        REFERENCES auth.users NOT NULL,
  locale      TEXT        NOT NULL DEFAULT 'en',
  is_system   BOOLEAN     NOT NULL DEFAULT false,
  data        JSONB       NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resumes_user_id   ON resumes (user_id);
CREATE INDEX IF NOT EXISTS idx_resumes_locale     ON resumes (locale);
CREATE INDEX IF NOT EXISTS idx_resumes_data       ON resumes USING GIN (data);


-- ─── ANIMALS ─────────────────────────────────────────────────────────────────
-- locale: false — shared catalog. Seeded once under the EN locale admin.

CREATE TABLE IF NOT EXISTS animals (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  num_id      BIGSERIAL   UNIQUE NOT NULL,
  user_id     UUID        REFERENCES auth.users NOT NULL,
  locale      TEXT        NOT NULL DEFAULT 'en',
  is_system   BOOLEAN     NOT NULL DEFAULT false,
  data        JSONB       NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_animals_user_id   ON animals (user_id);
CREATE INDEX IF NOT EXISTS idx_animals_locale     ON animals (locale);
CREATE INDEX IF NOT EXISTS idx_animals_data       ON animals USING GIN (data);


-- ─── RLS POLICIES ────────────────────────────────────────────────────────────
-- Enable RLS and allow the service role to bypass it (scripts use service role).
-- Users can read system rows + their own rows; can only write/delete their own.

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['quotes','books','students','resumes','animals'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);

    -- Read: own rows + system rows for their locale (or all locales if locale=false)
    EXECUTE format($$
      CREATE POLICY IF NOT EXISTS "%s_select" ON %I FOR SELECT
        USING (is_system = true OR auth.uid() = user_id)
    $$, tbl, tbl);

    -- Write: own rows only
    EXECUTE format($$
      CREATE POLICY IF NOT EXISTS "%s_insert" ON %I FOR INSERT
        WITH CHECK (auth.uid() = user_id)
    $$, tbl, tbl);

    EXECUTE format($$
      CREATE POLICY IF NOT EXISTS "%s_update" ON %I FOR UPDATE
        USING (auth.uid() = user_id AND is_system = false)
    $$, tbl, tbl);

    EXECUTE format($$
      CREATE POLICY IF NOT EXISTS "%s_delete" ON %I FOR DELETE
        USING (auth.uid() = user_id AND is_system = false)
    $$, tbl, tbl);
  END LOOP;
END;
$$;
