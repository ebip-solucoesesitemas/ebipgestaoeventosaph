
-- 1. Fix INSERT policy to prevent privilege escalation
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND hidden = false AND is_account_only = false);

-- 2. Make signatures bucket private
UPDATE storage.buckets SET public = false WHERE id = 'signatures';

-- 3. Create SECURITY DEFINER function for safe teammate data
CREATE OR REPLACE FUNCTION public.get_event_teammates(p_event_id uuid)
RETURNS TABLE (
  id uuid,
  nome text,
  especialidade text,
  registro_profissional text,
  cargo cargo_tipo,
  base_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT p.id, p.nome, p.especialidade::text,
    p.registro_profissional, p.cargo, p.base_id
  FROM profiles p
  JOIN event_assignments ea ON ea.profile_id = p.id
  WHERE ea.event_id = p_event_id;
$$;
