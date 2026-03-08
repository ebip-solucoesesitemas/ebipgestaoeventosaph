DROP POLICY "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile" ON public.profiles
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND is_account_only = (SELECT p.is_account_only FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1)
    AND cargo = (SELECT p.cargo FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1)
  );