-- ─────────────────────────────────────────────────────────────────────────────
-- auth-practice.sql
-- Practice auth tables — no relation to platform accounts (profiles, api_keys).
-- Every row is scoped to a platform user_id (the API key owner).
-- Run in Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── TIER 1: BASIC ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS auth_accounts_basic (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  num_id              BIGSERIAL   UNIQUE,
  user_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email               TEXT        NOT NULL,
  password_hash       TEXT        NOT NULL,
  is_verified         BOOLEAN     NOT NULL DEFAULT false,
  verification_token  TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Each apicamp user gets their own email namespace
CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_basic_user_email
  ON auth_accounts_basic (user_id, email);

CREATE INDEX IF NOT EXISTS idx_auth_basic_verification_token
  ON auth_accounts_basic (verification_token)
  WHERE verification_token IS NOT NULL;

-- ─── TIER 2: TOKEN ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS auth_accounts_token (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  num_id                  BIGSERIAL   UNIQUE,
  user_id                 UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email                   TEXT        NOT NULL,
  password_hash           TEXT        NOT NULL,
  is_verified             BOOLEAN     NOT NULL DEFAULT false,
  verification_token      TEXT,
  verification_expires_at TIMESTAMPTZ,
  reset_token             TEXT,
  reset_token_expires_at  TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_token_user_email
  ON auth_accounts_token (user_id, email);

CREATE INDEX IF NOT EXISTS idx_auth_token_verification_token
  ON auth_accounts_token (verification_token)
  WHERE verification_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_auth_token_reset_token
  ON auth_accounts_token (reset_token)
  WHERE reset_token IS NOT NULL;

CREATE TABLE IF NOT EXISTS auth_sessions_token (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  UUID        NOT NULL REFERENCES auth_accounts_token(id) ON DELETE CASCADE,
  token_hash  TEXT        UNIQUE NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_token_account
  ON auth_sessions_token (account_id);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_token_hash
  ON auth_sessions_token (token_hash);

-- ─── TIER 3: PROFILE ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS auth_accounts_profile (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  num_id                  BIGSERIAL   UNIQUE,
  user_id                 UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email                   TEXT        NOT NULL,
  password_hash           TEXT        NOT NULL,
  is_verified             BOOLEAN     NOT NULL DEFAULT false,
  verification_token      TEXT,
  verification_expires_at TIMESTAMPTZ,
  reset_token             TEXT,
  reset_token_expires_at  TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_profile_user_email
  ON auth_accounts_profile (user_id, email);

CREATE INDEX IF NOT EXISTS idx_auth_profile_verification_token
  ON auth_accounts_profile (verification_token)
  WHERE verification_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_auth_profile_reset_token
  ON auth_accounts_profile (reset_token)
  WHERE reset_token IS NOT NULL;

CREATE TABLE IF NOT EXISTS auth_sessions_profile (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  UUID        NOT NULL REFERENCES auth_accounts_profile(id) ON DELETE CASCADE,
  token_hash  TEXT        UNIQUE NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_profile_account
  ON auth_sessions_profile (account_id);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_profile_hash
  ON auth_sessions_profile (token_hash);

CREATE TABLE IF NOT EXISTS auth_user_profiles (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    UUID        UNIQUE NOT NULL REFERENCES auth_accounts_profile(id) ON DELETE CASCADE,
  display_name  TEXT        CHECK (char_length(display_name) <= 80),
  bio           TEXT        CHECK (char_length(bio) <= 500),
  avatar_url    TEXT,
  location      TEXT,
  website       TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_user_profiles_account
  ON auth_user_profiles (account_id);

-- Auto-update updated_at on auth_user_profiles
-- NOTE: set_updated_at() function was created in profiles-and-keys.sql
CREATE OR REPLACE TRIGGER auth_user_profiles_updated_at
  BEFORE UPDATE ON auth_user_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────────────────────
-- Service role (server-side) bypasses RLS.
-- Direct client access is blocked — all access goes through the API route.

ALTER TABLE auth_accounts_basic    ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_accounts_token    ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_sessions_token    ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_accounts_profile  ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_sessions_profile  ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_user_profiles     ENABLE ROW LEVEL SECURITY;

-- No client-facing policies — service role only
