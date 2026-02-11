
-- Assinaturas de chegada/saída da equipe no evento (assinadas pelo representante do cliente)
CREATE TABLE public.event_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('chegada', 'saida')),
  nome_responsavel TEXT NOT NULL,
  assinatura_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, tipo)
);

ALTER TABLE public.event_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage event signatures"
ON public.event_signatures FOR ALL
USING (is_admin());

CREATE POLICY "Assigned users can manage event signatures"
ON public.event_signatures FOR ALL
USING (is_assigned_to_event(event_id));
