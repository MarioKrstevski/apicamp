-- apicamp: table for paid-users' own logical tables (they do not get real DB tables).
-- Platform demo data (products, users) use separate tables — see schema-platform-tables.sql.
-- Run this in Supabase SQL Editor once.

-- Drop if re-running (optional; remove next line in production)
-- DROP TABLE IF EXISTS public.user_rows;

CREATE TABLE IF NOT EXISTS public.user_rows (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category    text NOT NULL,
  locale      text NOT NULL DEFAULT 'en',
  is_system   boolean NOT NULL DEFAULT false,
  data        jsonb NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common filters (category, ownership, locale)
CREATE INDEX IF NOT EXISTS idx_user_rows_category ON public.user_rows (category);
CREATE INDEX IF NOT EXISTS idx_user_rows_user_category ON public.user_rows (user_id, category);
CREATE INDEX IF NOT EXISTS idx_user_rows_locale ON public.user_rows (locale);

-- RLS: enable and add policies as needed. Example (adjust for your auth):
-- ALTER TABLE public.user_rows ENABLE ROW LEVEL SECURITY;
-- Policy: users can read rows they own or system rows for their locale
-- Policy: service role / app can insert/update/delete (e.g. via backend using service role key)

COMMENT ON TABLE public.user_rows IS 'Paid-users’ own logical tables; category = their table name. Platform tables (products, users) are separate.';
