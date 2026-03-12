DROP POLICY "Authenticated users can view permissions" ON public.role_permissions;
CREATE POLICY "Authenticated users can view permissions"
  ON public.role_permissions FOR SELECT
  TO authenticated
  USING (true);