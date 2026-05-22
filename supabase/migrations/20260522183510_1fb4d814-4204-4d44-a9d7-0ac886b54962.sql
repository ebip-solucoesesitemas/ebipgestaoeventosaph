
-- Create profile_private table for sensitive PII (cpf, chave_pix, phone numbers)
CREATE TABLE public.profile_private (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  cpf TEXT,
  chave_pix TEXT,
  telefone TEXT,
  telefone_celular TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profile_private ENABLE ROW LEVEL SECURITY;

-- Admins (admin/gestor/operacional via is_admin()) can manage all
CREATE POLICY "Admins manage profile private"
  ON public.profile_private
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Profile owner can view their own private record
CREATE POLICY "Owners can view own private"
  ON public.profile_private
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_private.profile_id
        AND p.user_id = auth.uid()
    )
  );

-- Profile owner can update their own private record
CREATE POLICY "Owners can update own private"
  ON public.profile_private
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_private.profile_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = profile_private.profile_id
        AND p.user_id = auth.uid()
    )
  );

-- Migrate existing data
INSERT INTO public.profile_private (profile_id, cpf, chave_pix, telefone, telefone_celular)
SELECT id, cpf, chave_pix, telefone, telefone_celular FROM public.profiles
ON CONFLICT (profile_id) DO NOTHING;

-- updated_at trigger
CREATE TRIGGER update_profile_private_updated_at
BEFORE UPDATE ON public.profile_private
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Drop sensitive columns from profiles to eliminate exposure via teammate view policy
ALTER TABLE public.profiles
  DROP COLUMN cpf,
  DROP COLUMN chave_pix,
  DROP COLUMN telefone,
  DROP COLUMN telefone_celular;
