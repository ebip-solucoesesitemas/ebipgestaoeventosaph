-- Enum para especialidades
CREATE TYPE public.especialidade_tipo AS ENUM ('Médico', 'Enfermeiro', 'Técnico', 'Socorrista');

-- Enum para cargos
CREATE TYPE public.cargo_tipo AS ENUM ('admin', 'equipe');

-- Enum para status de viatura
CREATE TYPE public.status_viatura AS ENUM ('disponivel', 'em_uso', 'manutencao');

-- Tabela de perfis de profissionais
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  especialidade especialidade_tipo NOT NULL,
  registro_profissional TEXT NOT NULL,
  cargo cargo_tipo NOT NULL DEFAULT 'equipe',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de viaturas
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modelo TEXT NOT NULL,
  placa TEXT NOT NULL UNIQUE,
  prefixo TEXT NOT NULL,
  status status_viatura NOT NULL DEFAULT 'disponivel',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de eventos
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_evento TEXT NOT NULL,
  data_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
  data_fim TIMESTAMP WITH TIME ZONE NOT NULL,
  local TEXT NOT NULL,
  viatura_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de vinculação de profissionais a eventos
CREATE TABLE public.event_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(event_id, profile_id)
);

-- Tabela de atendimentos clínicos
CREATE TABLE public.clinical_attendances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  profissional_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
  nome_paciente TEXT NOT NULL,
  documento TEXT,
  idade INTEGER,
  sexo TEXT,
  queixa_principal TEXT NOT NULL,
  evolucao_clinica TEXT,
  status TEXT DEFAULT 'em_andamento',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de sinais vitais
CREATE TABLE public.vital_signs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_id UUID REFERENCES public.clinical_attendances(id) ON DELETE CASCADE NOT NULL,
  pa_sistolica INTEGER,
  pa_diastolica INTEGER,
  frequencia_cardiaca INTEGER,
  frequencia_respiratoria INTEGER,
  saturacao_o2 INTEGER,
  temperatura DECIMAL(4,1),
  glicemia INTEGER,
  horario TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de assinaturas (armazena URLs do storage)
CREATE TABLE public.signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_id UUID REFERENCES public.clinical_attendances(id) ON DELETE CASCADE NOT NULL UNIQUE,
  assinatura_paciente_url TEXT,
  assinatura_profissional_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Storage bucket para assinaturas
INSERT INTO storage.buckets (id, name, public) VALUES ('signatures', 'signatures', false);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vital_signs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;

-- Function para verificar se é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND cargo = 'admin'
  )
$$;

-- Function para verificar se está escalado no evento
CREATE OR REPLACE FUNCTION public.is_assigned_to_event(event_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.event_assignments ea
    JOIN public.profiles p ON ea.profile_id = p.id
    WHERE ea.event_id = event_uuid AND p.user_id = auth.uid()
  )
$$;

-- RLS Policies para profiles
CREATE POLICY "Admins can manage all profiles" ON public.profiles FOR ALL USING (public.is_admin());
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies para vehicles
CREATE POLICY "Admins can manage vehicles" ON public.vehicles FOR ALL USING (public.is_admin());
CREATE POLICY "Authenticated users can view vehicles" ON public.vehicles FOR SELECT TO authenticated USING (true);

-- RLS Policies para events
CREATE POLICY "Admins can manage all events" ON public.events FOR ALL USING (public.is_admin());
CREATE POLICY "Users can view assigned events" ON public.events FOR SELECT USING (public.is_assigned_to_event(id) OR public.is_admin());

-- RLS Policies para event_assignments
CREATE POLICY "Admins can manage assignments" ON public.event_assignments FOR ALL USING (public.is_admin());
CREATE POLICY "Users can view their assignments" ON public.event_assignments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = event_assignments.profile_id AND user_id = auth.uid())
  OR public.is_admin()
);

-- RLS Policies para clinical_attendances
CREATE POLICY "Admins can view all attendances" ON public.clinical_attendances FOR SELECT USING (public.is_admin());
CREATE POLICY "Assigned users can manage attendances" ON public.clinical_attendances FOR ALL USING (
  public.is_assigned_to_event(event_id)
);

-- RLS Policies para vital_signs
CREATE POLICY "Users can manage vital signs of their attendances" ON public.vital_signs FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.clinical_attendances ca
    WHERE ca.id = vital_signs.attendance_id
    AND (public.is_assigned_to_event(ca.event_id) OR public.is_admin())
  )
);

-- RLS Policies para signatures
CREATE POLICY "Users can manage signatures of their attendances" ON public.signatures FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.clinical_attendances ca
    WHERE ca.id = signatures.attendance_id
    AND (public.is_assigned_to_event(ca.event_id) OR public.is_admin())
  )
);

-- Storage policies para signatures bucket
CREATE POLICY "Authenticated users can upload signatures" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'signatures');
CREATE POLICY "Authenticated users can view signatures" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'signatures');

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clinical_attendances_updated_at BEFORE UPDATE ON public.clinical_attendances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();