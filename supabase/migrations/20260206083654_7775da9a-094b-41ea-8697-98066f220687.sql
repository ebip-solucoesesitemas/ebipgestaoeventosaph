-- Add mileage tracking fields to event_assignments
ALTER TABLE public.event_assignments
ADD COLUMN km_inicial numeric DEFAULT NULL,
ADD COLUMN km_final numeric DEFAULT NULL;

-- Add fuel price to events table for cost calculation
ALTER TABLE public.events
ADD COLUMN valor_litro_combustivel numeric DEFAULT NULL,
ADD COLUMN consumo_medio_km_litro numeric DEFAULT 10;

-- Add comment explaining the fields
COMMENT ON COLUMN public.event_assignments.km_inicial IS 'Initial mileage when team member starts';
COMMENT ON COLUMN public.event_assignments.km_final IS 'Final mileage when team member finishes';
COMMENT ON COLUMN public.events.valor_litro_combustivel IS 'Fuel price per liter for cost calculation';
COMMENT ON COLUMN public.events.consumo_medio_km_litro IS 'Average km per liter (default 10 km/L)';