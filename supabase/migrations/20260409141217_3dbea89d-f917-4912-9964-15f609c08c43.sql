-- Telefone do responsável do evento
ALTER TABLE events ADD COLUMN responsavel_telefone TEXT;

-- Motivo do cancelamento
ALTER TABLE events ADD COLUMN motivo_cancelamento TEXT;

-- SEGURANÇA: Restringir profiles para authenticated only
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
CREATE POLICY "Admins can manage all profiles" ON profiles FOR ALL TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

DROP POLICY IF EXISTS "Users can view profiles of event teammates" ON profiles;
CREATE POLICY "Users can view profiles of event teammates" ON profiles FOR SELECT TO authenticated USING (is_event_teammate(id));

DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND hidden = (SELECT p.hidden FROM profiles p WHERE p.user_id = auth.uid() LIMIT 1)
    AND cargo = (SELECT p.cargo FROM profiles p WHERE p.user_id = auth.uid() LIMIT 1)
    AND is_account_only = (SELECT p.is_account_only FROM profiles p WHERE p.user_id = auth.uid() LIMIT 1)
  );