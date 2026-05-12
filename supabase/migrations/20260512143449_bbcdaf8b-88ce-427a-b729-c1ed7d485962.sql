DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Super admins can view audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (public.is_super_admin());