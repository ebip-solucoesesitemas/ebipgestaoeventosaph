
-- Fix security vulnerability: prevent users from modifying their own 'hidden' field
-- Drop and recreate the UPDATE policy for profiles
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  (user_id = auth.uid())
  AND (is_account_only = (SELECT p.is_account_only FROM profiles p WHERE p.user_id = auth.uid() LIMIT 1))
  AND (cargo = (SELECT p.cargo FROM profiles p WHERE p.user_id = auth.uid() LIMIT 1))
  AND (hidden = (SELECT p.hidden FROM profiles p WHERE p.user_id = auth.uid() LIMIT 1))
);
