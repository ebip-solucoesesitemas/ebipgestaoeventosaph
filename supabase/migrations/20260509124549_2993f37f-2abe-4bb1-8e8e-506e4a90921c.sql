
-- Checklist categories
CREATE TABLE public.checklist_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.checklist_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view checklist categories" ON public.checklist_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage checklist categories" ON public.checklist_categories FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE TRIGGER trg_checklist_categories_updated BEFORE UPDATE ON public.checklist_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Checklist items
CREATE TABLE public.checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.checklist_categories(id) ON DELETE CASCADE,
  nome text NOT NULL,
  quantidade_ideal integer NOT NULL DEFAULT 1,
  unidade text,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_checklist_items_category ON public.checklist_items(category_id);
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view checklist items" ON public.checklist_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage checklist items" ON public.checklist_items FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE TRIGGER trg_checklist_items_updated BEFORE UPDATE ON public.checklist_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Submissions
CREATE TABLE public.checklist_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL,
  base_id uuid,
  vehicle_id uuid,
  event_id uuid,
  tipo text NOT NULL DEFAULT 'diario',
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_checklist_submissions_profile ON public.checklist_submissions(profile_id);
CREATE INDEX idx_checklist_submissions_created ON public.checklist_submissions(created_at DESC);
ALTER TABLE public.checklist_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view all submissions" ON public.checklist_submissions FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY "Users view own submissions" ON public.checklist_submissions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = checklist_submissions.profile_id AND p.user_id = auth.uid()));
CREATE POLICY "Users insert own submissions" ON public.checklist_submissions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = checklist_submissions.profile_id AND p.user_id = auth.uid()));
CREATE POLICY "Admins manage submissions" ON public.checklist_submissions FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Submission items
CREATE TABLE public.checklist_submission_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.checklist_submissions(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.checklist_items(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'ok',
  quantidade_atual integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_checklist_sub_items_submission ON public.checklist_submission_items(submission_id);
ALTER TABLE public.checklist_submission_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View sub items if can view submission" ON public.checklist_submission_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM checklist_submissions s
    LEFT JOIN profiles p ON p.id = s.profile_id
    WHERE s.id = checklist_submission_items.submission_id
      AND (is_admin() OR p.user_id = auth.uid())
  ));
CREATE POLICY "Insert sub items for own submission" ON public.checklist_submission_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM checklist_submissions s
    JOIN profiles p ON p.id = s.profile_id
    WHERE s.id = checklist_submission_items.submission_id
      AND p.user_id = auth.uid()
  ));
CREATE POLICY "Admins manage sub items" ON public.checklist_submission_items FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Add CRM/COREN signature columns to clinical_attendances
ALTER TABLE public.clinical_attendances
  ADD COLUMN IF NOT EXISTS medico_nome text,
  ADD COLUMN IF NOT EXISTS medico_crm text,
  ADD COLUMN IF NOT EXISTS enfermeiro_nome text,
  ADD COLUMN IF NOT EXISTS enfermeiro_coren text;
