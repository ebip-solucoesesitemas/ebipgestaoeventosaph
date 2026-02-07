
-- Add budget-specific fields (independent of events)
ALTER TABLE public.event_budgets
  ADD COLUMN IF NOT EXISTS endereco_evento text,
  ADD COLUMN IF NOT EXISTS data_inicio timestamp with time zone,
  ADD COLUMN IF NOT EXISTS data_fim timestamp with time zone,
  ADD COLUMN IF NOT EXISTS base_id uuid REFERENCES public.bases(id),
  ADD COLUMN IF NOT EXISTS km_estimado numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_km numeric DEFAULT 0;

-- Make event_id nullable (budget is now independent)
ALTER TABLE public.event_budgets ALTER COLUMN event_id DROP NOT NULL;

-- Create operational_rates table for KM values
CREATE TABLE IF NOT EXISTS public.operational_rates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo text NOT NULL UNIQUE DEFAULT 'km',
  valor numeric NOT NULL DEFAULT 0,
  descricao text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.operational_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage operational rates"
  ON public.operational_rates FOR ALL
  USING (is_admin());

CREATE POLICY "Authenticated users can view operational rates"
  ON public.operational_rates FOR SELECT
  USING (true);

-- Insert default KM rate
INSERT INTO public.operational_rates (tipo, valor, descricao)
VALUES ('km', 0, 'Valor por Quilômetro')
ON CONFLICT (tipo) DO NOTHING;

-- Add trigger for updated_at
CREATE TRIGGER update_operational_rates_updated_at
  BEFORE UPDATE ON public.operational_rates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
