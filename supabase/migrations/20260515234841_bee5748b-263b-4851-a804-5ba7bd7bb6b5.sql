-- 1. contract_templates: restringir SELECT a admins/gestores
DROP POLICY IF EXISTS "Authenticated users can view contract templates" ON public.contract_templates;
-- "Admins can manage contract templates" (ALL com is_admin) já cobre admin/gestor/operacional.
-- Removemos acesso público de leitura.

-- 2. get_event_teammates: adicionar verificação de autorização
CREATE OR REPLACE FUNCTION public.get_event_teammates(p_event_id uuid)
 RETURNS TABLE(id uuid, nome text, especialidade text, registro_profissional text, cargo cargo_tipo, base_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT DISTINCT p.id, p.nome, p.especialidade::text,
    p.registro_profissional, p.cargo, p.base_id
  FROM profiles p
  JOIN event_assignments ea ON ea.profile_id = p.id
  WHERE ea.event_id = p_event_id
    AND (public.is_assigned_to_event(p_event_id) OR public.is_admin());
$function$;

-- 3. log_audit_event: revogar execução de authenticated/anon (mantém service_role para edge functions)
REVOKE EXECUTE ON FUNCTION public.log_audit_event(uuid, text, text, jsonb) FROM PUBLIC, anon, authenticated;

-- 4. toggle_user_role: impedir auto-promoção
CREATE OR REPLACE FUNCTION public.toggle_user_role(p_profile_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_current_cargo cargo_tipo;
  v_new_cargo cargo_tipo;
  v_caller_profile_id uuid;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can toggle roles';
  END IF;

  -- Bloqueia auto-alteração de cargo
  SELECT id INTO v_caller_profile_id FROM profiles WHERE user_id = auth.uid() LIMIT 1;
  IF v_caller_profile_id IS NOT NULL AND v_caller_profile_id = p_profile_id THEN
    RAISE EXCEPTION 'Cannot change your own role';
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

  PERFORM log_audit_event(
    auth.uid(),
    'change_role',
    p_profile_id::text,
    jsonb_build_object('cargo_anterior', v_current_cargo::text, 'cargo_novo', v_new_cargo::text)
  );
END;
$function$;