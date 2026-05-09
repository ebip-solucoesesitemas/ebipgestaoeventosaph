-- Add escopo column to checklist submissions
ALTER TABLE public.checklist_submissions
  ADD COLUMN IF NOT EXISTS escopo text NOT NULL DEFAULT 'medico';

-- Backfill: infer escopo from the first item's category if available
UPDATE public.checklist_submissions s
SET escopo = sub.escopo
FROM (
  SELECT DISTINCT ON (csi.submission_id)
    csi.submission_id,
    cc.escopo
  FROM public.checklist_submission_items csi
  JOIN public.checklist_items ci ON ci.id = csi.item_id
  JOIN public.checklist_categories cc ON cc.id = ci.category_id
  WHERE cc.escopo IS NOT NULL
) AS sub
WHERE sub.submission_id = s.id;

-- Replace unique index: now per (event_id, escopo) instead of just event_id
DROP INDEX IF EXISTS public.uniq_checklist_submission_per_event;

CREATE UNIQUE INDEX uniq_checklist_submission_per_event_escopo
  ON public.checklist_submissions (event_id, escopo)
  WHERE event_id IS NOT NULL AND status IN ('rascunho', 'finalizado');