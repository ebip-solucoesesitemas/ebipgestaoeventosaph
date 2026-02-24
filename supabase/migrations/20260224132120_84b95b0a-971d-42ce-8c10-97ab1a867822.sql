-- Allow assigned team members to update events (for KM and finalization)
CREATE POLICY "Assigned users can update events"
ON public.events
FOR UPDATE
USING (is_assigned_to_event(id))
WITH CHECK (is_assigned_to_event(id));