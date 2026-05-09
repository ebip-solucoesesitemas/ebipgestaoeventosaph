
ALTER TABLE public.checklist_categories ADD COLUMN IF NOT EXISTS base_id uuid REFERENCES public.bases(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_checklist_categories_base_id ON public.checklist_categories(base_id);

DROP POLICY IF EXISTS "Authenticated can view checklist categories" ON public.checklist_categories;
CREATE POLICY "View checklist categories by base"
ON public.checklist_categories
FOR SELECT
TO authenticated
USING (
  is_admin()
  OR base_id IS NULL
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.base_id = checklist_categories.base_id
  )
);

DROP POLICY IF EXISTS "Authenticated can view checklist items" ON public.checklist_items;
CREATE POLICY "View checklist items by base"
ON public.checklist_items
FOR SELECT
TO authenticated
USING (
  is_admin()
  OR EXISTS (
    SELECT 1 FROM public.checklist_categories c
    LEFT JOIN public.profiles p ON p.user_id = auth.uid()
    WHERE c.id = checklist_items.category_id
      AND (c.base_id IS NULL OR c.base_id = p.base_id)
  )
);
