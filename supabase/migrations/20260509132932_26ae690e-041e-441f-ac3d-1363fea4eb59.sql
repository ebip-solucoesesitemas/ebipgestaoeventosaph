-- Add foreign keys (fixes PostgREST relationship cache error)
ALTER TABLE public.checklist_categories
  ADD CONSTRAINT checklist_categories_base_fk
  FOREIGN KEY (base_id) REFERENCES public.bases(id) ON DELETE SET NULL;

ALTER TABLE public.checklist_items
  ADD CONSTRAINT checklist_items_category_fk
  FOREIGN KEY (category_id) REFERENCES public.checklist_categories(id) ON DELETE CASCADE;

ALTER TABLE public.checklist_submissions
  ADD CONSTRAINT checklist_submissions_profile_fk
    FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.checklist_submissions
  ADD CONSTRAINT checklist_submissions_event_fk
    FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;
ALTER TABLE public.checklist_submissions
  ADD CONSTRAINT checklist_submissions_vehicle_fk
    FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL;
ALTER TABLE public.checklist_submissions
  ADD CONSTRAINT checklist_submissions_base_fk
    FOREIGN KEY (base_id) REFERENCES public.bases(id) ON DELETE SET NULL;

ALTER TABLE public.checklist_submission_items
  ADD CONSTRAINT csi_submission_fk
    FOREIGN KEY (submission_id) REFERENCES public.checklist_submissions(id) ON DELETE CASCADE;
ALTER TABLE public.checklist_submission_items
  ADD CONSTRAINT csi_item_fk
    FOREIGN KEY (item_id) REFERENCES public.checklist_items(id) ON DELETE CASCADE;

-- Scope: medical kit vs vehicle inspection
ALTER TABLE public.checklist_categories
  ADD COLUMN escopo text NOT NULL DEFAULT 'medico';

ALTER TABLE public.checklist_items
  ADD COLUMN tipo_resposta text NOT NULL DEFAULT 'quantidade';

ALTER TABLE public.checklist_submission_items
  ADD COLUMN observacao text;