-- Fix client_contracts: restrict SELECT to admins only
DROP POLICY IF EXISTS "Authenticated users can view client contracts" ON public.client_contracts;

-- Fix regulation_phones: restrict to authenticated role
DROP POLICY IF EXISTS "Authenticated users can view regulation phones" ON public.regulation_phones;
CREATE POLICY "Authenticated users can view regulation phones" ON public.regulation_phones FOR SELECT TO authenticated USING (true);

-- Fix contract_templates: restrict to authenticated role  
DROP POLICY IF EXISTS "Authenticated users can view contract templates" ON public.contract_templates;
CREATE POLICY "Authenticated users can view contract templates" ON public.contract_templates FOR SELECT TO authenticated USING (true);

-- Fix role_permissions: restrict SELECT to admins
DROP POLICY IF EXISTS "Authenticated users can view permissions" ON public.role_permissions;
CREATE POLICY "Authenticated users can view permissions" ON public.role_permissions FOR SELECT TO authenticated USING (is_admin());