
CREATE TABLE public.system_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  color text NOT NULL DEFAULT 'yellow',
  status text NOT NULL DEFAULT 'active',
  finished_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.system_notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view notices" ON public.system_notices
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super admins can manage notices" ON public.system_notices
  FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

ALTER PUBLICATION supabase_realtime ADD TABLE public.system_notices;
