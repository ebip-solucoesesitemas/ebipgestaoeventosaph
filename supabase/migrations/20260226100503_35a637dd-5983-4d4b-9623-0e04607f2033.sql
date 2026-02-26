
-- Add patient disposition columns to clinical_attendances
ALTER TABLE public.clinical_attendances
ADD COLUMN IF NOT EXISTS desfecho text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS hospital_destino text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS crm_receptor text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS nome_receptor text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS data_remocao timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS assinatura_receptor_url text DEFAULT NULL;

-- Create regulation phones table
CREATE TABLE IF NOT EXISTS public.regulation_phones (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  telefone text NOT NULL,
  descricao text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.regulation_phones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage regulation phones"
ON public.regulation_phones FOR ALL
USING (is_admin());

CREATE POLICY "Authenticated users can view regulation phones"
ON public.regulation_phones FOR SELECT
USING (true);
