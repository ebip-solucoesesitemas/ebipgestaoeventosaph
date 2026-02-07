
-- Adicionar colunas nome_evento e tipo_unidade na tabela event_budgets
ALTER TABLE public.event_budgets ADD COLUMN IF NOT EXISTS nome_evento TEXT;
ALTER TABLE public.event_budgets ADD COLUMN IF NOT EXISTS tipo_unidade TEXT;

-- Criar função SECURITY DEFINER para verificar e liberar viatura após checkout
CREATE OR REPLACE FUNCTION public.check_and_release_vehicle(event_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _viatura_id UUID;
  _all_checked_out BOOLEAN;
  _has_assignments BOOLEAN;
BEGIN
  -- Buscar viatura_id do evento
  SELECT viatura_id INTO _viatura_id
  FROM public.events
  WHERE id = event_uuid;

  -- Se não tem viatura, não faz nada
  IF _viatura_id IS NULL THEN
    RETURN;
  END IF;

  -- Verificar se existem assignments para o evento
  SELECT EXISTS (
    SELECT 1 FROM public.event_assignments WHERE event_id = event_uuid
  ) INTO _has_assignments;

  IF NOT _has_assignments THEN
    RETURN;
  END IF;

  -- Verificar se TODOS os membros fizeram checkout (bypassando RLS)
  SELECT NOT EXISTS (
    SELECT 1 FROM public.event_assignments 
    WHERE event_id = event_uuid AND checkout_at IS NULL
  ) INTO _all_checked_out;

  -- Se todos fizeram checkout, liberar a viatura
  IF _all_checked_out THEN
    UPDATE public.vehicles 
    SET status = 'disponivel', updated_at = now()
    WHERE id = _viatura_id;
  END IF;
END;
$$;
