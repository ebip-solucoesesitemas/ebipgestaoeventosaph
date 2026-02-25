
-- Add new columns to event_budgets for valor_hora and quantidade_horas
ALTER TABLE public.event_budgets 
  ADD COLUMN IF NOT EXISTS valor_hora numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quantidade_horas numeric DEFAULT 0;
