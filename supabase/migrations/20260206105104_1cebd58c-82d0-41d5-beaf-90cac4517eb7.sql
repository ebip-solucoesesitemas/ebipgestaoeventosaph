-- Add policy for team members to update their own assignments (check-in/checkout)
CREATE POLICY "Users can update their own assignments"
ON public.event_assignments
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = event_assignments.profile_id
    AND profiles.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = event_assignments.profile_id
    AND profiles.user_id = auth.uid()
  )
);