
-- Tighten signatures bucket policies. New signatures are stored as base64 in DB
-- (no code path uploads to this bucket anymore); only legacy files remain.
-- Restrict writes to admins; restrict reads to admins or users that participate
-- in at least one event assignment (legacy report viewers).

DROP POLICY IF EXISTS "Authenticated users can view signatures" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload signatures" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update signatures" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete signatures" ON storage.objects;
DROP POLICY IF EXISTS "Signatures select for admins or event participants" ON storage.objects;
DROP POLICY IF EXISTS "Signatures insert for admins only" ON storage.objects;
DROP POLICY IF EXISTS "Signatures update for admins only" ON storage.objects;
DROP POLICY IF EXISTS "Signatures delete for admins only" ON storage.objects;

CREATE POLICY "Signatures select for admins or event participants"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'signatures'
  AND (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.event_assignments ea
      JOIN public.profiles p ON p.id = ea.profile_id
      WHERE p.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Signatures insert for admins only"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'signatures' AND public.is_admin());

CREATE POLICY "Signatures update for admins only"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'signatures' AND public.is_admin())
WITH CHECK (bucket_id = 'signatures' AND public.is_admin());

CREATE POLICY "Signatures delete for admins only"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'signatures' AND public.is_admin());
