
-- 1. Function to toggle admin role (fixes the "Remove Admin" button)
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
END;
$$;

-- 2. Function for team check-in (any team member can check in colleagues)
CREATE OR REPLACE FUNCTION public.handle_team_checkin(
  p_assignment_id uuid,
  p_km_inicial numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignment event_assignments%ROWTYPE;
BEGIN
  SELECT * INTO v_assignment FROM event_assignments WHERE id = p_assignment_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Assignment not found');
  END IF;

  IF v_assignment.checkin_at IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'Already checked in');
  END IF;

  IF NOT is_assigned_to_event(v_assignment.event_id) AND NOT is_admin() THEN
    RETURN jsonb_build_object('error', 'Not authorized');
  END IF;

  UPDATE event_assignments
  SET checkin_at = now(),
      km_inicial = COALESCE(p_km_inicial, km_inicial)
  WHERE id = p_assignment_id;

  RETURN jsonb_build_object('success', true, 'checkin_at', now()::text);
END;
$$;

-- 3. Function for team checkout with automatic payment calculation
CREATE OR REPLACE FUNCTION public.handle_team_checkout(
  p_assignment_id uuid,
  p_km_final numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignment event_assignments%ROWTYPE;
  v_event events%ROWTYPE;
  v_rate professional_rates%ROWTYPE;
  v_hours numeric;
  v_payment_value numeric;
BEGIN
  SELECT * INTO v_assignment FROM event_assignments WHERE id = p_assignment_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Assignment not found');
  END IF;

  IF v_assignment.checkout_at IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'Already checked out');
  END IF;

  IF v_assignment.checkin_at IS NULL THEN
    RETURN jsonb_build_object('error', 'Must check in first');
  END IF;

  IF NOT is_assigned_to_event(v_assignment.event_id) AND NOT is_admin() THEN
    RETURN jsonb_build_object('error', 'Not authorized');
  END IF;

  -- Update assignment with checkout
  UPDATE event_assignments
  SET checkout_at = now(),
      km_final = COALESCE(p_km_final, km_final)
  WHERE id = p_assignment_id;

  -- Get event info
  SELECT * INTO v_event FROM events WHERE id = v_assignment.event_id;

  -- Calculate hours worked
  v_hours := EXTRACT(EPOCH FROM (now() - v_assignment.checkin_at)) / 3600.0;

  -- Get professional rate
  SELECT * INTO v_rate FROM professional_rates WHERE profile_id = v_assignment.profile_id;

  v_payment_value := 0;
  IF v_rate IS NOT NULL THEN
    IF v_rate.valor_hora > 0 THEN
      v_payment_value := ROUND((v_hours * v_rate.valor_hora)::numeric, 2);
    ELSIF v_rate.valor_evento > 0 THEN
      v_payment_value := v_rate.valor_evento;
    END IF;
  END IF;

  -- Create payment if value > 0
  IF v_payment_value > 0 THEN
    INSERT INTO professional_payments (profile_id, event_id, valor, tipo_pagamento, status, descricao)
    VALUES (
      v_assignment.profile_id,
      v_assignment.event_id,
      v_payment_value,
      'pix',
      'pendente',
      CASE
        WHEN v_rate.valor_hora > 0 THEN
          format('Evento: %s — %s horas trabalhadas', v_event.nome_evento, ROUND(v_hours, 1)::text)
        ELSE
          format('Evento: %s', v_event.nome_evento)
      END
    );
  END IF;

  -- Check and release vehicle
  PERFORM check_and_release_vehicle(v_assignment.event_id);

  RETURN jsonb_build_object(
    'success', true,
    'hours', ROUND(v_hours, 1),
    'payment_value', v_payment_value,
    'checkout_at', now()::text
  );
END;
$$;

-- 4. Allow team members to view all assignments for events they're assigned to
CREATE POLICY "Team members can view event assignments"
ON public.event_assignments
FOR SELECT
TO authenticated
USING (is_assigned_to_event(event_id));
