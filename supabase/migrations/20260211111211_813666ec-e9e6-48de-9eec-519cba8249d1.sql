
-- Drop the recursive policy
DROP POLICY IF EXISTS "Users can view profiles of event teammates" ON public.profiles;

-- Recreate using a security definer function to avoid recursion
CREATE OR REPLACE FUNCTION public.is_event_teammate(p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM event_assignments ea1
    JOIN event_assignments ea2 ON ea1.event_id = ea2.event_id
    JOIN profiles my_profile ON my_profile.id = ea2.profile_id AND my_profile.user_id = auth.uid()
    WHERE ea1.profile_id = p_profile_id
  );
$$;

-- Recreate policy using the function
CREATE POLICY "Users can view profiles of event teammates"
ON public.profiles
FOR SELECT
USING (public.is_event_teammate(id));
