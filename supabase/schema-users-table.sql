-- public.users: one column per field from src/config/categories/users.ts
-- Paste this in Supabase SQL Editor to create the table.
--
-- If the table already exists without created_by, run instead:
--   ALTER TABLE public.users ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE;
--   UPDATE public.users SET created_by = (SELECT id FROM auth.users LIMIT 1) WHERE created_by IS NULL;
--   ALTER TABLE public.users ALTER COLUMN created_by SET NOT NULL;
--   CREATE UNIQUE INDEX IF NOT EXISTS idx_users_created_by_email ON public.users (created_by, email);

CREATE TABLE IF NOT EXISTS public.users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        varchar(100) NOT NULL,
  first_name  varchar(50) NOT NULL,
  last_name   varchar(50) NOT NULL,
  email       varchar(255) NOT NULL,
  age         integer CHECK (age IS NULL OR (age >= 1 AND age <= 120)),
  avatar      text,
  phone       text,
  is_active   boolean NOT NULL DEFAULT true,
  role        text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user', 'moderator', 'guest')),
  address     jsonb,
  tags        jsonb,
  social_links jsonb,
  birth_date  date,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Unique email per creator (same email can exist for different created_by)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_created_by_email ON public.users (created_by, email);

COMMENT ON TABLE public.users IS 'Demo user profiles (from config users.ts). Not auth.users.';
