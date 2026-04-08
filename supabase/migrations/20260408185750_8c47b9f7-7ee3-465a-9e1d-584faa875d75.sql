-- Evolução médica na ficha APH
ALTER TABLE clinical_attendances ADD COLUMN evolucao_medica TEXT;

-- Responsável do evento
ALTER TABLE events ADD COLUMN responsavel_evento TEXT;

-- Tipo do aviso (aviso comum ou melhoria/alteração)
ALTER TABLE system_notices ADD COLUMN tipo TEXT NOT NULL DEFAULT 'aviso';

-- Tabela de confirmações dos usuários para avisos tipo melhoria/alteração
CREATE TABLE notice_acknowledgements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notice_id UUID NOT NULL REFERENCES system_notices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(notice_id, user_id)
);

ALTER TABLE notice_acknowledgements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own ack"
  ON notice_acknowledgements FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own ack"
  ON notice_acknowledgements FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all acks"
  ON notice_acknowledgements FOR SELECT TO authenticated
  USING (is_admin());