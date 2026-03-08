
-- 1. Function is_super_admin()
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
      AND hidden = true
  )
$$;

-- 2. Table support_tickets
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number serial NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  created_by uuid NOT NULL,
  assigned_to uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz NULL
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- 3. Table ticket_messages
CREATE TABLE public.ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  message text NOT NULL,
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- 4. Trigger updated_at on support_tickets
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. RLS Policies for support_tickets
CREATE POLICY "Users can view own tickets or super_admin sees all"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR is_super_admin());

CREATE POLICY "Authenticated users can create tickets"
  ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Only super_admin can update tickets"
  ON public.support_tickets FOR UPDATE TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "Only super_admin can delete tickets"
  ON public.support_tickets FOR DELETE TO authenticated
  USING (is_super_admin());

-- 6. RLS Policies for ticket_messages
CREATE POLICY "Users can view messages of accessible tickets"
  ON public.ticket_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets st
      WHERE st.id = ticket_messages.ticket_id
        AND (st.created_by = auth.uid() OR is_super_admin())
    )
    AND (is_internal = false OR is_super_admin())
  );

CREATE POLICY "Users can insert messages on accessible tickets"
  ON public.ticket_messages FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.support_tickets st
      WHERE st.id = ticket_messages.ticket_id
        AND (st.created_by = auth.uid() OR is_super_admin())
    )
  );

CREATE POLICY "Only super_admin can update messages"
  ON public.ticket_messages FOR UPDATE TO authenticated
  USING (is_super_admin());

CREATE POLICY "Only super_admin can delete messages"
  ON public.ticket_messages FOR DELETE TO authenticated
  USING (is_super_admin());

-- 7. Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_messages;
