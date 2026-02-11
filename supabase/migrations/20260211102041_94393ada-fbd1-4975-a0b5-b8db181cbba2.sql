
-- Allow authenticated users to view profiles of people assigned to the same events
CREATE POLICY "Users can view profiles of event teammates"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM event_assignments ea1
    JOIN event_assignments ea2 ON ea1.event_id = ea2.event_id
    JOIN profiles my_profile ON my_profile.id = ea2.profile_id AND my_profile.user_id = auth.uid()
    WHERE ea1.profile_id = profiles.id
  )
);
