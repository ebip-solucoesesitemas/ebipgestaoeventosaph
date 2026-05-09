-- Drop duplicate foreign keys causing PostgREST embed ambiguity
ALTER TABLE public.checklist_submission_items DROP CONSTRAINT IF EXISTS csi_submission_fk;
ALTER TABLE public.checklist_submission_items DROP CONSTRAINT IF EXISTS csi_item_fk;
ALTER TABLE public.checklist_items DROP CONSTRAINT IF EXISTS checklist_items_category_fk;
ALTER TABLE public.checklist_categories DROP CONSTRAINT IF EXISTS checklist_categories_base_fk;