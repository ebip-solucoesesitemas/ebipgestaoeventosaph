
ALTER TABLE public.checklist_submissions
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'rascunho',
  ADD COLUMN IF NOT EXISTS intercorrencias text;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_checklist_submission_per_event_profile
  ON public.checklist_submissions (event_id, profile_id)
  WHERE event_id IS NOT NULL AND status IN ('rascunho','finalizado');

CREATE POLICY "Users update own submissions"
  ON public.checklist_submissions
  FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = checklist_submissions.profile_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = checklist_submissions.profile_id AND p.user_id = auth.uid()));

CREATE POLICY "Users delete own sub items"
  ON public.checklist_submission_items
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM checklist_submissions s
    JOIN profiles p ON p.id = s.profile_id
    WHERE s.id = checklist_submission_items.submission_id AND p.user_id = auth.uid()
  ));
