
-- Update is_assigned_to_event to also check events.user_id
CREATE OR REPLACE FUNCTION public.is_assigned_to_event(event_uuid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.event_assignments ea
    JOIN public.profiles p ON ea.profile_id = p.id
    WHERE ea.event_id = event_uuid AND p.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_uuid AND e.user_id = auth.uid()
  )
$$;
