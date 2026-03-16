CREATE OR REPLACE FUNCTION public.handle_team_checkout(p_assignment_id uuid, p_km_final numeric DEFAULT NULL::numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_assignment event_assignments%ROWTYPE;
  v_event events%ROWTYPE;
  v_rate professional_rates%ROWTYPE;
  v_hours numeric;
  v_total_minutes integer;
  v_display_hours integer;
  v_display_minutes integer;
  v_payment_value numeric;
  v_time_description text;
  v_ajuda_custo numeric;
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

  UPDATE event_assignments
  SET checkout_at = now(),
      km_final = COALESCE(p_km_final, km_final)
  WHERE id = p_assignment_id;

  SELECT * INTO v_event FROM events WHERE id = v_assignment.event_id;

  -- Calculate hours and minutes
  v_hours := EXTRACT(EPOCH FROM (now() - v_assignment.checkin_at)) / 3600.0;
  v_total_minutes := ROUND(EXTRACT(EPOCH FROM (now() - v_assignment.checkin_at)) / 60.0)::integer;
  v_display_hours := v_total_minutes / 60;
  v_display_minutes := v_total_minutes % 60;

  -- Build time description
  IF v_display_hours > 0 AND v_display_minutes > 0 THEN
    v_time_description := format('%sh %smin', v_display_hours, v_display_minutes);
  ELSIF v_display_hours > 0 THEN
    v_time_description := format('%sh', v_display_hours);
  ELSE
    v_time_description := format('%smin', v_display_minutes);
  END IF;

  SELECT * INTO v_rate FROM professional_rates WHERE profile_id = v_assignment.profile_id;

  -- Fetch ajuda de custo value
  v_ajuda_custo := 0;
  IF v_hours > 6 THEN
    SELECT COALESCE(valor, 0) INTO v_ajuda_custo
    FROM operational_rates WHERE tipo = 'ajuda_custo_6h' LIMIT 1;
  END IF;

  v_payment_value := 0;
  IF v_rate IS NOT NULL THEN
    IF v_rate.valor_hora > 0 THEN
      v_payment_value := ROUND((v_hours * v_rate.valor_hora)::numeric, 2);
    ELSIF v_rate.valor_evento > 0 THEN
      v_payment_value := v_rate.valor_evento;
    END IF;
  END IF;

  -- Add ajuda de custo
  v_payment_value := v_payment_value + v_ajuda_custo;

  IF v_payment_value > 0 THEN
    INSERT INTO professional_payments (profile_id, event_id, valor, tipo_pagamento, status, descricao)
    VALUES (
      v_assignment.profile_id,
      v_assignment.event_id,
      v_payment_value,
      'pix',
      'pendente',
      CASE
        WHEN v_rate IS NOT NULL AND v_rate.valor_hora > 0 AND v_ajuda_custo > 0 THEN
          format('Evento: %s — %s trabalhados + Ajuda de custo R$ %s', v_event.nome_evento, v_time_description, v_ajuda_custo)
        WHEN v_rate IS NOT NULL AND v_rate.valor_hora > 0 THEN
          format('Evento: %s — %s trabalhados', v_event.nome_evento, v_time_description)
        WHEN v_ajuda_custo > 0 THEN
          format('Evento: %s + Ajuda de custo R$ %s', v_event.nome_evento, v_ajuda_custo)
        ELSE
          format('Evento: %s', v_event.nome_evento)
      END
    );
  END IF;

  PERFORM check_and_release_vehicle(v_assignment.event_id);

  RETURN jsonb_build_object(
    'success', true,
    'hours', ROUND(v_hours, 1),
    'total_minutes', v_total_minutes,
    'display_hours', v_display_hours,
    'display_minutes', v_display_minutes,
    'time_description', v_time_description,
    'payment_value', v_payment_value,
    'ajuda_custo', v_ajuda_custo,
    'checkout_at', now()::text
  );
END;
$function$;