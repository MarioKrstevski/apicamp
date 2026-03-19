-- docs/sql/wall-of-love.sql
-- Wall of Love: profiles additions, user_more_info scaffold, reviews table.
-- Run in Supabase SQL Editor.
-- Requires: set_updated_at() already exists (from profiles-and-keys.sql).

-- ─── PROFILES: 3 new columns ─────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS title        TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url   TEXT;

-- ─── USER_MORE_INFO: scaffolded, no UI yet ───────────────────────────────────

CREATE TABLE IF NOT EXISTS user_more_info (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  why_using         TEXT,
  experience_level  TEXT        CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
  languages_known   TEXT[],
  goals             TEXT[],
  learning_context  TEXT        CHECK (learning_context IN ('self_taught', 'bootcamp', 'university', 'professional')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Postgres 14+ required for CREATE OR REPLACE TRIGGER (Supabase uses PG15+)
CREATE OR REPLACE TRIGGER user_more_info_updated_at
  BEFORE UPDATE ON user_more_info
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE user_more_info ENABLE ROW LEVEL SECURITY;
-- Service role only — no client-facing policies

-- ─── REVIEWS ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reviews (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  comment        TEXT        NOT NULL CHECK (char_length(comment) BETWEEN 10 AND 500),
  rating         SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  project_url    TEXT,
  project_label  TEXT        CHECK (char_length(project_label) <= 60),
  approved       BOOLEAN     NOT NULL DEFAULT false,
  approved_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_approved ON reviews (approved);

CREATE OR REPLACE TRIGGER reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
-- Service role only — no client-facing policies
