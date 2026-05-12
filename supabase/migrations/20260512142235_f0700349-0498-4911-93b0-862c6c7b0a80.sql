
-- Enable extensions for cron + http
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Private bucket for system backups
INSERT INTO storage.buckets (id, name, public)
VALUES ('system-backups', 'system-backups', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: only super-admin can read/delete via client; service role bypasses RLS
CREATE POLICY "Super-admin can read system-backups"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'system-backups' AND public.is_super_admin());

CREATE POLICY "Super-admin can delete system-backups"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'system-backups' AND public.is_super_admin());

-- Backups history table
CREATE TABLE public.system_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,
  source text NOT NULL CHECK (source IN ('auto','manual')),
  storage_path text NOT NULL,
  file_size_bytes bigint NOT NULL DEFAULT 0,
  total_rows integer NOT NULL DEFAULT 0,
  tables_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'success' CHECK (status IN ('success','partial','failed')),
  error_message text NULL,
  manifest jsonb NULL
);

CREATE INDEX idx_system_backups_created_at ON public.system_backups (created_at DESC);

ALTER TABLE public.system_backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super-admin can view backups"
ON public.system_backups FOR SELECT TO authenticated
USING (public.is_super_admin());

CREATE POLICY "Super-admin can delete backups"
ON public.system_backups FOR DELETE TO authenticated
USING (public.is_super_admin());

-- INSERT/UPDATE intentionally not granted: only the edge function (service role) writes.
