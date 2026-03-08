
-- Add new cargo_tipo values
ALTER TYPE public.cargo_tipo ADD VALUE IF NOT EXISTS 'admin_bnu';
ALTER TYPE public.cargo_tipo ADD VALUE IF NOT EXISTS 'admin_fln';

-- Add new especialidade_tipo value
ALTER TYPE public.especialidade_tipo ADD VALUE IF NOT EXISTS 'VTR';

-- Make registro_profissional nullable (remove NOT NULL)
ALTER TABLE public.profiles ALTER COLUMN registro_profissional SET DEFAULT '';
ALTER TABLE public.profiles ALTER COLUMN registro_profissional DROP NOT NULL;

-- Add is_account_only flag to profiles for access-only accounts
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_account_only boolean NOT NULL DEFAULT false;
