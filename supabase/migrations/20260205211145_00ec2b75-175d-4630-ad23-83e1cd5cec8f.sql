-- Drop existing restrictive policies on profiles
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create PERMISSIVE policies (default behavior)
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (is_admin());

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all profiles"
ON public.profiles FOR ALL
TO authenticated
USING (is_admin());

-- Fix other tables with same issue
DROP POLICY IF EXISTS "Admins can view all attendances" ON public.clinical_attendances;
DROP POLICY IF EXISTS "Assigned users can manage attendances" ON public.clinical_attendances;

CREATE POLICY "Admins can manage all attendances"
ON public.clinical_attendances FOR ALL
TO authenticated
USING (is_admin());

CREATE POLICY "Assigned users can manage attendances"
ON public.clinical_attendances FOR ALL
TO authenticated
USING (is_assigned_to_event(event_id));

-- Fix events policies
DROP POLICY IF EXISTS "Admins can manage all events" ON public.events;
DROP POLICY IF EXISTS "Users can view assigned events" ON public.events;

CREATE POLICY "Admins can manage all events"
ON public.events FOR ALL
TO authenticated
USING (is_admin());

CREATE POLICY "Users can view assigned events"
ON public.events FOR SELECT
TO authenticated
USING (is_assigned_to_event(id));

-- Fix event_assignments policies
DROP POLICY IF EXISTS "Admins can manage assignments" ON public.event_assignments;
DROP POLICY IF EXISTS "Users can view their assignments" ON public.event_assignments;

CREATE POLICY "Admins can manage assignments"
ON public.event_assignments FOR ALL
TO authenticated
USING (is_admin());

CREATE POLICY "Users can view their assignments"
ON public.event_assignments FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = event_assignments.profile_id
  AND profiles.user_id = auth.uid()
));

-- Fix vehicles policies
DROP POLICY IF EXISTS "Admins can manage vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated users can view vehicles" ON public.vehicles;

CREATE POLICY "Admins can manage vehicles"
ON public.vehicles FOR ALL
TO authenticated
USING (is_admin());

CREATE POLICY "Authenticated users can view vehicles"
ON public.vehicles FOR SELECT
TO authenticated
USING (true);

-- Fix vital_signs policies
DROP POLICY IF EXISTS "Users can manage vital signs of their attendances" ON public.vital_signs;

CREATE POLICY "Users can manage vital signs"
ON public.vital_signs FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM clinical_attendances ca
  WHERE ca.id = vital_signs.attendance_id
  AND (is_assigned_to_event(ca.event_id) OR is_admin())
));

-- Fix signatures policies
DROP POLICY IF EXISTS "Users can manage signatures of their attendances" ON public.signatures;

CREATE POLICY "Users can manage signatures"
ON public.signatures FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM clinical_attendances ca
  WHERE ca.id = signatures.attendance_id
  AND (is_assigned_to_event(ca.event_id) OR is_admin())
));