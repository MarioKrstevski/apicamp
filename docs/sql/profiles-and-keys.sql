-- ─────────────────────────────────────────────────────────────────────────────
-- profiles-and-keys.sql
-- Run in Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── ENUMS ───────────────────────────────────────────────────────────────────

CREATE TYPE profile_role AS ENUM ('user', 'locale_admin', 'youtuber', 'superadmin');
CREATE TYPE key_type     AS ENUM ('personal', 'gift', 'pool');
CREATE TYPE key_status   AS ENUM ('active', 'unclaimed', 'donated', 'expired', 'revoked');
CREATE TYPE req_status   AS ENUM ('pending', 'approved', 'rejected');

-- ─── PROFILES ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id          UUID          PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        profile_role  NOT NULL DEFAULT 'user',
  is_blocked  BOOLEAN       NOT NULL DEFAULT false,
  ever_paid   BOOLEAN       NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Auto-create profile on signup (role = superadmin if email matches ADMIN_EMAIL,
-- otherwise 'user'). The application also creates the profile in the auth callback
-- as a fallback — the trigger is the primary path.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, role)
  VALUES (
    NEW.id,
    CASE WHEN NEW.email = current_setting('app.admin_email', true)
         THEN 'superadmin'::profile_role
         ELSE 'user'::profile_role
    END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── API KEYS ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS api_keys (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash          TEXT        UNIQUE NOT NULL,
  prefix            TEXT        NOT NULL,
  owner_id          UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  creator_id        UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  type              key_type    NOT NULL,
  status            key_status  NOT NULL DEFAULT 'unclaimed',
  expires_at        TIMESTAMPTZ,
  pool_expires_days INTEGER,
  activated_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_api_keys_owner    ON api_keys (owner_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_creator  ON api_keys (creator_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_status   ON api_keys (status);

-- ─── SUBSCRIPTIONS ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS subscriptions (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount_paid       INTEGER     NOT NULL,
  base_price        INTEGER     NOT NULL,
  gift_keys_earned  INTEGER     NOT NULL DEFAULT 0,
  gift_keys_used    INTEGER     NOT NULL DEFAULT 0,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at        TIMESTAMPTZ NOT NULL,
  payment_ref       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions (user_id, expires_at DESC);

-- ─── POOL KEY REQUESTS ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pool_key_requests (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason           TEXT        NOT NULL,
  status           req_status  NOT NULL DEFAULT 'pending',
  assigned_key_id  UUID        REFERENCES api_keys(id) ON DELETE SET NULL,
  admin_note       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pool_requests_status ON pool_key_requests (status, created_at DESC);

-- ─── HELPER FUNCTIONS ────────────────────────────────────────────────────────

-- Auto-update updated_at on pool_key_requests
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER pool_key_requests_updated_at
  BEFORE UPDATE ON pool_key_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Increment gift_keys_used on a subscription (called by createGiftKey)
CREATE OR REPLACE FUNCTION increment_gift_keys_used(p_subscription_id uuid)
RETURNS void LANGUAGE sql AS $$
  UPDATE subscriptions SET gift_keys_used = gift_keys_used + 1 WHERE id = p_subscription_id;
$$;

-- ─── RLS ─────────────────────────────────────────────────────────────────────
-- Service role (used server-side) bypasses RLS.
-- Authenticated users can only read their own profile and keys.

ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys         ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE pool_key_requests ENABLE ROW LEVEL SECURITY;

-- Profiles: users see and edit only their own
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- API keys: owners see their own keys; unclaimed keys are hidden (claimed via API route only)
CREATE POLICY "api_keys_select_own" ON api_keys FOR SELECT USING (auth.uid() = owner_id OR auth.uid() = creator_id);

-- Subscriptions: users see their own
CREATE POLICY "subscriptions_select_own" ON subscriptions FOR SELECT USING (auth.uid() = user_id);

-- Pool requests: users see their own
CREATE POLICY "pool_requests_select_own" ON pool_key_requests FOR SELECT USING (auth.uid() = requester_id);
