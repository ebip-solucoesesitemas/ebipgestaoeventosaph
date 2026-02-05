-- Create enum for financial status
CREATE TYPE public.status_financeiro AS ENUM ('pendente', 'pago', 'cancelado', 'atrasado');

-- Create enum for expense category
CREATE TYPE public.categoria_despesa AS ENUM ('combustivel', 'equipamento', 'diaria', 'alimentacao', 'hospedagem', 'transporte', 'outros');

-- Create enum for payment type
CREATE TYPE public.tipo_pagamento AS ENUM ('pix', 'transferencia', 'boleto', 'cartao', 'dinheiro', 'cheque');

-- Clients table (who contracts the services)
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  documento TEXT, -- CNPJ/CPF
  email TEXT,
  telefone TEXT,
  endereco TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage clients"
ON public.clients FOR ALL
TO authenticated
USING (is_admin());

CREATE POLICY "Users can view clients"
ON public.clients FOR SELECT
TO authenticated
USING (true);

-- Event budgets (orçamento do evento)
CREATE TABLE public.event_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  valor_contrato DECIMAL(12,2) NOT NULL DEFAULT 0,
  descricao TEXT,
  status status_financeiro DEFAULT 'pendente',
  data_vencimento DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.event_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage budgets"
ON public.event_budgets FOR ALL
TO authenticated
USING (is_admin());

CREATE POLICY "Assigned users can view budgets"
ON public.event_budgets FOR SELECT
TO authenticated
USING (is_assigned_to_event(event_id));

-- Event expenses (despesas do evento)
CREATE TABLE public.event_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  categoria categoria_despesa NOT NULL,
  descricao TEXT NOT NULL,
  valor DECIMAL(12,2) NOT NULL,
  data_despesa DATE NOT NULL DEFAULT CURRENT_DATE,
  comprovante_url TEXT,
  registrado_por UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.event_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage expenses"
ON public.event_expenses FOR ALL
TO authenticated
USING (is_admin());

CREATE POLICY "Assigned users can view and add expenses"
ON public.event_expenses FOR ALL
TO authenticated
USING (is_assigned_to_event(event_id));

-- Client payments (pagamentos recebidos)
CREATE TABLE public.client_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID REFERENCES public.event_budgets(id) ON DELETE CASCADE NOT NULL,
  valor DECIMAL(12,2) NOT NULL,
  tipo_pagamento tipo_pagamento NOT NULL,
  data_pagamento DATE NOT NULL DEFAULT CURRENT_DATE,
  comprovante_url TEXT,
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.client_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage client payments"
ON public.client_payments FOR ALL
TO authenticated
USING (is_admin());

-- Professional payments (pagamento aos profissionais)
CREATE TABLE public.professional_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  valor DECIMAL(12,2) NOT NULL,
  tipo_pagamento tipo_pagamento NOT NULL,
  data_pagamento DATE,
  status status_financeiro DEFAULT 'pendente',
  descricao TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.professional_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage professional payments"
ON public.professional_payments FOR ALL
TO authenticated
USING (is_admin());

CREATE POLICY "Users can view their own payments"
ON public.professional_payments FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = professional_payments.profile_id
  AND profiles.user_id = auth.uid()
));

-- Add triggers for updated_at
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_event_budgets_updated_at
  BEFORE UPDATE ON public.event_budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_professional_payments_updated_at
  BEFORE UPDATE ON public.professional_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();