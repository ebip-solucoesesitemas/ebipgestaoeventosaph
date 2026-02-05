-- Add CEP column to clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS cep text;

-- Add professional payment rate table
CREATE TABLE IF NOT EXISTS public.professional_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  valor_hora numeric NOT NULL DEFAULT 0,
  valor_evento numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(profile_id)
);

-- Enable RLS
ALTER TABLE public.professional_rates ENABLE ROW LEVEL SECURITY;

-- RLS policies for professional_rates
CREATE POLICY "Admins can manage professional rates"
ON public.professional_rates
FOR ALL
USING (is_admin());

CREATE POLICY "Users can view their own rates"
ON public.professional_rates
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles WHERE profiles.id = professional_rates.profile_id AND profiles.user_id = auth.uid()
));

-- Add check-in/checkout columns to event_assignments
ALTER TABLE public.event_assignments 
ADD COLUMN IF NOT EXISTS checkin_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS checkout_at timestamp with time zone;

-- Add team complete status to events
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS equipe_completa boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS equipe_minima integer DEFAULT 2;

-- Add event reference to professional_payments (already exists, skip if error)
-- Make sure we can track payments generated from event checkout

-- Create trigger for updated_at on professional_rates
CREATE TRIGGER update_professional_rates_updated_at
BEFORE UPDATE ON public.professional_rates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();