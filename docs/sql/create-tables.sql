-- ─────────────────────────────────────────────────────────────────────────────
-- apicamp — table creation SQL (flat columns, no JSONB)
-- Paste this into the Supabase SQL Editor and run it.
--
-- Every table gets:
--   id          UUID primary key (auto)
--   num_id      BIGSERIAL — numeric id for beginner-friendly access (/api/quotes/1)
--   user_id     FK → auth.users — ownership (locale admins own seed rows)
--   created_at  timestamptz
--
-- All data fields are flat columns — no JSONB wrapper.
-- ─────────────────────────────────────────────────────────────────────────────


-- ─── QUOTES ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS quotes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  num_id      BIGSERIAL   UNIQUE NOT NULL,
  user_id     UUID        REFERENCES auth.users NOT NULL,
  text        TEXT        NOT NULL,
  author      TEXT        NOT NULL,
  source      TEXT,
  category    TEXT        NOT NULL,
  year        INTEGER,
  tags        JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotes_user_id ON quotes (user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_category ON quotes (category);


-- ─── BOOKS ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS books (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  num_id      BIGSERIAL   UNIQUE NOT NULL,
  user_id     UUID        REFERENCES auth.users NOT NULL,
  title       TEXT        NOT NULL,
  author      TEXT        NOT NULL,
  isbn        TEXT,
  genre       TEXT        NOT NULL,
  year        INTEGER,
  pages       INTEGER,
  rating      NUMERIC(2,1) DEFAULT 0,
  description TEXT,
  language    TEXT,
  tags        JSONB,
  cover_url   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_books_user_id ON books (user_id);
CREATE INDEX IF NOT EXISTS idx_books_genre ON books (genre);


-- ─── STUDENTS ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS students (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  num_id          BIGSERIAL   UNIQUE NOT NULL,
  user_id         UUID        REFERENCES auth.users NOT NULL,
  first_name      TEXT        NOT NULL,
  last_name       TEXT        NOT NULL,
  student_id      TEXT        NOT NULL UNIQUE,
  email           TEXT        NOT NULL UNIQUE,
  age             INTEGER,
  grade           TEXT        NOT NULL DEFAULT 'freshman',
  gpa             NUMERIC(3,2),
  major           TEXT        NOT NULL,
  minor           TEXT,
  subjects        JSONB,
  enrollment_year INTEGER     NOT NULL,
  is_active       BOOLEAN     DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_students_user_id ON students (user_id);
CREATE INDEX IF NOT EXISTS idx_students_grade ON students (grade);
CREATE INDEX IF NOT EXISTS idx_students_major ON students (major);


-- ─── RESUMES ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS resumes (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  num_id                BIGSERIAL   UNIQUE NOT NULL,
  user_id               UUID        REFERENCES auth.users NOT NULL,
  first_name            TEXT        NOT NULL,
  last_name             TEXT        NOT NULL,
  title                 TEXT        NOT NULL,
  summary               TEXT,
  years_of_experience   INTEGER     NOT NULL,
  seniority_level       TEXT        NOT NULL,
  skills                JSONB,
  tech_stack            JSONB,
  programming_languages JSONB,
  certifications        JSONB,
  education             JSONB,
  github                TEXT,
  linkedin              TEXT,
  available_for_hire    BOOLEAN     DEFAULT false,
  location              TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes (user_id);
CREATE INDEX IF NOT EXISTS idx_resumes_seniority ON resumes (seniority_level);


-- ─── ANIMALS ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS animals (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  num_id              BIGSERIAL   UNIQUE NOT NULL,
  user_id             UUID        REFERENCES auth.users NOT NULL,
  name                TEXT        NOT NULL,
  scientific_name     TEXT,
  type                TEXT        NOT NULL,
  habitat             TEXT        NOT NULL,
  diet                TEXT        NOT NULL,
  conservation_status TEXT,
  weight_kg           NUMERIC,
  lifespan_years      NUMERIC(4,1),
  fun_fact            TEXT,
  native_region       TEXT,
  is_nocturnal        BOOLEAN,
  speed               NUMERIC(4,1),
  tags                JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_animals_user_id ON animals (user_id);
CREATE INDEX IF NOT EXISTS idx_animals_type ON animals (type);
CREATE INDEX IF NOT EXISTS idx_animals_habitat ON animals (habitat);


-- ─── RLS POLICIES ────────────────────────────────────────────────────────────
-- Service role bypasses RLS (used by seed scripts).
-- Regular users see their own rows + rows owned by locale admins (seed data).
-- Users can only write/delete their own rows.

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['quotes','books','students','resumes','animals'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);

    EXECUTE format($$
      CREATE POLICY IF NOT EXISTS "%s_select" ON %I FOR SELECT
        USING (true)
    $$, tbl, tbl);

    EXECUTE format($$
      CREATE POLICY IF NOT EXISTS "%s_insert" ON %I FOR INSERT
        WITH CHECK (auth.uid() = user_id)
    $$, tbl, tbl);

    EXECUTE format($$
      CREATE POLICY IF NOT EXISTS "%s_update" ON %I FOR UPDATE
        USING (auth.uid() = user_id)
    $$, tbl, tbl);

    EXECUTE format($$
      CREATE POLICY IF NOT EXISTS "%s_delete" ON %I FOR DELETE
        USING (auth.uid() = user_id)
    $$, tbl, tbl);
  END LOOP;
END;
$$;
