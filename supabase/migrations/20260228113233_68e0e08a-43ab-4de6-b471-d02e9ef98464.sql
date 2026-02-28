
-- Tabela de auditoria
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  target_id text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Somente admins podem visualizar
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Ninguém insere diretamente (apenas via SECURITY DEFINER function)
-- Nenhuma policy de INSERT para usuários normais

-- Função SECURITY DEFINER para inserir logs
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_user_id uuid,
  p_action text,
  p_target_id text DEFAULT NULL,
  p_details jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, target_id, details)
  VALUES (p_user_id, p_action, p_target_id, p_details);
END;
$$;

-- Atualizar toggle_user_role para incluir log de auditoria
CREATE OR REPLACE FUNCTION public.toggle_user_role(p_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_current_cargo cargo_tipo;
  v_new_cargo cargo_tipo;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can toggle roles';
  END IF;

  SELECT user_id, cargo INTO v_user_id, v_current_cargo
  FROM profiles WHERE id = p_profile_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  v_new_cargo := CASE WHEN v_current_cargo = 'admin' THEN 'equipe'::cargo_tipo ELSE 'admin'::cargo_tipo END;

  UPDATE profiles SET cargo = v_new_cargo WHERE id = p_profile_id;

  IF v_user_id IS NOT NULL THEN
    IF v_new_cargo = 'admin' THEN
      INSERT INTO user_roles (user_id, role)
      SELECT v_user_id, 'admin'::app_role
      WHERE NOT EXISTS (
        SELECT 1 FROM user_roles WHERE user_id = v_user_id AND role = 'admin'::app_role
      );
    ELSE
      DELETE FROM user_roles WHERE user_id = v_user_id AND role = 'admin'::app_role;
    END IF;
  END IF;

  -- Log de auditoria
  PERFORM log_audit_event(
    auth.uid(),
    'change_role',
    p_profile_id::text,
    jsonb_build_object('cargo_anterior', v_current_cargo::text, 'cargo_novo', v_new_cargo::text)
  );
END;
$$;

-- Corrigir RLS: clients SELECT somente para admins
DROP POLICY IF EXISTS "Users can view clients" ON public.clients;

-- Corrigir RLS: client_payments já está correto (somente admin ALL), sem policy SELECT pública
