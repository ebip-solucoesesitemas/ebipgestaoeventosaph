DROP POLICY "Users can view assigned events" ON public.events;
CREATE POLICY "Users can view assigned events" ON public.events
  FOR SELECT TO authenticated
  USING (
    is_admin()
    OR is_assigned_to_event(id)
    OR (user_id = auth.uid())
    OR (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_account_only = true
    ))
  );