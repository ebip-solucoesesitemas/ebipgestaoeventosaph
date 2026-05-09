
-- Make event checklist shared across the assigned team (one per event, not per profile)
DROP INDEX IF EXISTS public.uniq_checklist_submission_per_event_profile;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_checklist_submission_per_event
  ON public.checklist_submissions (event_id)
  WHERE event_id IS NOT NULL AND status IN ('rascunho','finalizado');

-- Allow any assigned teammate (or event owner / admin) to update or delete the event's checklist
DROP POLICY IF EXISTS "Teammates update event submissions" ON public.checklist_submissions;
CREATE POLICY "Teammates update event submissions"
  ON public.checklist_submissions
  FOR UPDATE
  TO authenticated
  USING (event_id IS NOT NULL AND public.is_assigned_to_event(event_id))
  WITH CHECK (event_id IS NOT NULL AND public.is_assigned_to_event(event_id));

DROP POLICY IF EXISTS "Teammates view event submissions" ON public.checklist_submissions;
CREATE POLICY "Teammates view event submissions"
  ON public.checklist_submissions
  FOR SELECT
  TO authenticated
  USING (event_id IS NOT NULL AND public.is_assigned_to_event(event_id));

DROP POLICY IF EXISTS "Teammates insert event submissions" ON public.checklist_submissions;
CREATE POLICY "Teammates insert event submissions"
  ON public.checklist_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (event_id IS NOT NULL AND public.is_assigned_to_event(event_id));

-- Same for the items table
DROP POLICY IF EXISTS "Teammates manage event sub items" ON public.checklist_submission_items;
CREATE POLICY "Teammates manage event sub items"
  ON public.checklist_submission_items
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.checklist_submissions s
    WHERE s.id = checklist_submission_items.submission_id
      AND s.event_id IS NOT NULL
      AND public.is_assigned_to_event(s.event_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.checklist_submissions s
    WHERE s.id = checklist_submission_items.submission_id
      AND s.event_id IS NOT NULL
      AND public.is_assigned_to_event(s.event_id)
  ));
