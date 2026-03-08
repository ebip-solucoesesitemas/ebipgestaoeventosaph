
-- Create trigger to auto-release vehicle when event is finalized
CREATE OR REPLACE FUNCTION public.release_vehicle_on_event_finalize()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When event status changes to 'finalizado' and has a viatura_id
  IF NEW.status = 'finalizado' AND OLD.status <> 'finalizado' AND NEW.viatura_id IS NOT NULL THEN
    -- Check if no other non-finalized events use this vehicle
    IF NOT EXISTS (
      SELECT 1 FROM public.events
      WHERE viatura_id = NEW.viatura_id
        AND id <> NEW.id
        AND status <> 'finalizado'
    ) THEN
      UPDATE public.vehicles SET status = 'disponivel' WHERE id = NEW.viatura_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Drop if exists and recreate
DROP TRIGGER IF EXISTS trg_release_vehicle_on_finalize ON public.events;
CREATE TRIGGER trg_release_vehicle_on_finalize
  AFTER UPDATE ON public.events
  FOR EACH ROW
  WHEN (NEW.status = 'finalizado' AND OLD.status IS DISTINCT FROM 'finalizado')
  EXECUTE FUNCTION public.release_vehicle_on_event_finalize();
