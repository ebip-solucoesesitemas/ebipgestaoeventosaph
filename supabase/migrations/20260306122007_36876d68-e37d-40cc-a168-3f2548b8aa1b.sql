
-- Permissions table to control feature access per role
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role public.cargo_tipo NOT NULL,
  permission_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role, permission_key)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage permissions" ON public.role_permissions
  FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Authenticated users can view permissions" ON public.role_permissions
  FOR SELECT TO authenticated USING (true);

-- Seed default permissions
INSERT INTO public.role_permissions (role, permission_key, enabled) VALUES
  -- Admin permissions (all enabled)
  ('admin', 'events.view', true),
  ('admin', 'events.manage', true),
  ('admin', 'events.report', true),
  ('admin', 'professionals.view', true),
  ('admin', 'professionals.manage', true),
  ('admin', 'vehicles.view', true),
  ('admin', 'vehicles.manage', true),
  ('admin', 'clients.view', true),
  ('admin', 'clients.manage', true),
  ('admin', 'finance.view', true),
  ('admin', 'finance.manage', true),
  ('admin', 'payroll.view', true),
  ('admin', 'payroll.manage', true),
  ('admin', 'users.view', true),
  ('admin', 'users.manage', true),
  ('admin', 'bases.view', true),
  ('admin', 'bases.manage', true),
  ('admin', 'contracts.view', true),
  ('admin', 'contracts.manage', true),
  ('admin', 'audit_logs.view', true),
  ('admin', 'settings.manage', true),
  -- Gestor permissions
  ('gestor', 'events.view', true),
  ('gestor', 'events.manage', true),
  ('gestor', 'events.report', true),
  ('gestor', 'professionals.view', true),
  ('gestor', 'professionals.manage', false),
  ('gestor', 'vehicles.view', true),
  ('gestor', 'vehicles.manage', false),
  ('gestor', 'clients.view', true),
  ('gestor', 'clients.manage', false),
  ('gestor', 'finance.view', true),
  ('gestor', 'finance.manage', false),
  ('gestor', 'payroll.view', true),
  ('gestor', 'payroll.manage', false),
  ('gestor', 'users.view', true),
  ('gestor', 'users.manage', false),
  ('gestor', 'bases.view', true),
  ('gestor', 'bases.manage', false),
  ('gestor', 'contracts.view', true),
  ('gestor', 'contracts.manage', false),
  ('gestor', 'audit_logs.view', false),
  ('gestor', 'settings.manage', false),
  -- Equipe permissions
  ('equipe', 'events.view', true),
  ('equipe', 'events.manage', false),
  ('equipe', 'events.report', false),
  ('equipe', 'professionals.view', false),
  ('equipe', 'professionals.manage', false),
  ('equipe', 'vehicles.view', false),
  ('equipe', 'vehicles.manage', false),
  ('equipe', 'clients.view', false),
  ('equipe', 'clients.manage', false),
  ('equipe', 'finance.view', false),
  ('equipe', 'finance.manage', false),
  ('equipe', 'payroll.view', false),
  ('equipe', 'payroll.manage', false),
  ('equipe', 'users.view', false),
  ('equipe', 'users.manage', false),
  ('equipe', 'bases.view', false),
  ('equipe', 'bases.manage', false),
  ('equipe', 'contracts.view', false),
  ('equipe', 'contracts.manage', false),
  ('equipe', 'audit_logs.view', false),
  ('equipe', 'settings.manage', false);
