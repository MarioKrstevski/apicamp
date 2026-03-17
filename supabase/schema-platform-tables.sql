-- Platform tables: real DB tables for API-served demo data (products, users).
-- Paid customers hit these as valid endpoints. Seed from the manage dashboard.
-- user_rows remains for paid-users' own logical tables (no real table per category).

-- Products (demo products for /api/.../products)
CREATE TABLE IF NOT EXISTS public.products (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  locale      text NOT NULL DEFAULT 'en',
  is_system   boolean NOT NULL DEFAULT false,
  data        jsonb NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products (user_id);
CREATE INDEX IF NOT EXISTS idx_products_locale ON public.products (locale);

COMMENT ON TABLE public.products IS 'Demo products; served at /api/[locale]/[version]/products. Seeded from manage dashboard.';

-- Users (demo/fake user profiles for /api/.../users — not auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  locale      text NOT NULL DEFAULT 'en',
  is_system   boolean NOT NULL DEFAULT false,
  data        jsonb NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_user_id ON public.users (user_id);
CREATE INDEX IF NOT EXISTS idx_users_locale ON public.users (locale);

COMMENT ON TABLE public.users IS 'Demo user profiles; served at /api/[locale]/[version]/users. Not auth.users. Seeded from manage dashboard.';
