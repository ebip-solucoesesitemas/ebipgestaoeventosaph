
-- Create bases table
CREATE TABLE public.bases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  sigla TEXT NOT NULL UNIQUE,
  endereco TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage bases" ON public.bases FOR ALL USING (is_admin());
CREATE POLICY "Authenticated users can view bases" ON public.bases FOR SELECT USING (true);

-- Add base_id to events
ALTER TABLE public.events ADD COLUMN base_id UUID REFERENCES public.bases(id);

-- Add forma_cobranca to event_budgets
CREATE TYPE public.forma_cobranca AS ENUM ('boleto', 'pix', 'emissao_nf', 'empenho', 'nao_cobrar', 'patrocinio');
ALTER TABLE public.event_budgets ADD COLUMN forma_cobranca public.forma_cobranca;

-- Trigger for bases updated_at
CREATE TRIGGER update_bases_updated_at
BEFORE UPDATE ON public.bases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
