
ALTER TABLE public.events ADD COLUMN user_id uuid REFERENCES auth.users(id);

-- Atualizar RLS para permitir que o usuario atribuido veja o evento
DROP POLICY IF EXISTS "Users can view assigned events" ON public.events;
CREATE POLICY "Users can view assigned events" ON public.events
FOR SELECT USING (
  is_admin() OR is_assigned_to_event(id) OR user_id = auth.uid()
);
