
-- Fix vehicles currently stuck as em_uso with no active events
UPDATE public.vehicles v
SET status = 'disponivel'
WHERE v.status = 'em_uso'
  AND NOT EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.viatura_id = v.id
      AND e.status <> 'finalizado'
  );
