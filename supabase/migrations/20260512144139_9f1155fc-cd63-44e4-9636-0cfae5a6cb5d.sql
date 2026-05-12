DROP POLICY IF EXISTS "Users can view own tickets or super_admin sees all" ON public.support_tickets;
CREATE POLICY "View tickets: own, admin, gestor or super_admin"
ON public.support_tickets FOR SELECT
USING (
  created_by = auth.uid()
  OR is_super_admin()
  OR has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.cargo = 'gestor'::public.cargo_tipo)
);

DROP POLICY IF EXISTS "Users view messages of own tickets or super_admin all" ON public.ticket_messages;
DROP POLICY IF EXISTS "Users can view ticket messages" ON public.ticket_messages;
CREATE POLICY "View ticket messages: own, admin, gestor, super_admin"
ON public.ticket_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = ticket_messages.ticket_id
      AND (
        t.created_by = auth.uid()
        OR is_super_admin()
        OR has_role(auth.uid(), 'admin'::public.app_role)
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.cargo = 'gestor'::public.cargo_tipo)
      )
  )
);