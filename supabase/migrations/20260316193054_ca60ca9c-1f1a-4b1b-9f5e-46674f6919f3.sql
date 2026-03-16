
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
      AND cargo IN ('gestor'::public.cargo_tipo, 'operacional'::public.cargo_tipo)
  )
$$;
