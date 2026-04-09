-- Tornar o bucket público para que getPublicUrl funcione
UPDATE storage.buckets SET public = true WHERE id = 'signatures';

-- Adicionar policy de UPDATE para permitir upsert
CREATE POLICY "Authenticated users can update signatures"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'signatures');