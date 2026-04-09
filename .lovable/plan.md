

# Plano: Telefone do responsável, Cancelamento de evento e Correções de segurança

## 1. Migração SQL

```sql
-- Telefone do responsável do evento
ALTER TABLE events ADD COLUMN responsavel_telefone TEXT;

-- Motivo do cancelamento
ALTER TABLE events ADD COLUMN motivo_cancelamento TEXT;

-- SEGURANÇA: Restringir profiles para que anônimos não leiam dados sensíveis
-- Trocar policies de profiles que usam {public} para {authenticated}
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
CREATE POLICY "Admins can manage all profiles" ON profiles FOR ALL TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
-- (redundante com a ALL acima, pode remover)

DROP POLICY IF EXISTS "Users can view profiles of event teammates" ON profiles;
CREATE POLICY "Users can view profiles of event teammates" ON profiles FOR SELECT TO authenticated USING (is_event_teammate(id));

DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT TO authenticated USING (user_id = auth.uid());

-- SEGURANÇA: Impedir que usuário altere hidden/cargo/is_account_only no UPDATE
-- A policy atual já impede via subquery, mas reforçar para authenticated apenas
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND hidden = (SELECT p.hidden FROM profiles p WHERE p.user_id = auth.uid() LIMIT 1)
    AND cargo = (SELECT p.cargo FROM profiles p WHERE p.user_id = auth.uid() LIMIT 1)
    AND is_account_only = (SELECT p.is_account_only FROM profiles p WHERE p.user_id = auth.uid() LIMIT 1)
  );
```

## 2. Campo telefone do responsável do evento

**`Events.tsx`** e **`BaseEvents.tsx`**:
- Adicionar `responsavel_telefone: ""` no formData
- Adicionar Input "Telefone do Responsável" ao lado do campo "Responsável do Evento"
- Incluir no eventData ao salvar, carregar no openEditDialog e duplicateEvent

**`TeamEvents.tsx`**: exibir telefone junto ao responsável (com link `tel:`)

**`team/EventDetail.tsx`**: exibir telefone com link clicável

## 3. Botão de cancelamento de evento com motivo

**`Events.tsx`** e **`BaseEvents.tsx`**:
- Adicionar estado `cancelDialog` para controlar Dialog de cancelamento
- Adicionar estado `motivoCancelamento` para capturar o motivo
- Novo Dialog com:
  - Textarea "Motivo do cancelamento" (obrigatório)
  - Botão "Confirmar Cancelamento"
- Ao confirmar: `update({ status: 'cancelado', motivo_cancelamento })` + liberar viatura se houver
- Botão vermelho "Cancelar Evento" nos cards (ao lado de editar/excluir), visível apenas se status != cancelado e != finalizado

**`team/EventDetail.tsx`**: exibir motivo do cancelamento no banner vermelho

## 4. Correções de segurança

### Profiles legíveis por anônimos
- Todas as policies da tabela `profiles` que usam `TO {public}` serão trocadas para `TO authenticated`
- Isso impede que usuários não autenticados leiam CPF, telefone, chave PIX etc.

### Escalação de privilégio via hidden flag
- A policy de UPDATE já bloqueia alteração de `hidden`, `cargo` e `is_account_only` via subquery
- Reforçar trocando para `TO authenticated` (hoje está `TO public`)
- Isso já resolve os 2 findings de escalação de privilégio

### Realtime channels
- A questão de Realtime é que `support_tickets`, `ticket_messages` e `system_notices` estão publicados no Realtime
- As tabelas já têm RLS correto (tickets só para criador/super-admin, notices para todos auth)
- O Realtime do Supabase respeita RLS por padrão em `postgres_changes` — os dados só chegam se o usuário passa na policy SELECT
- Vou marcar esse finding como resolvido (o RLS já filtra os dados)

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| Migração SQL | 2 colunas novas + policies corrigidas |
| `Events.tsx` | Telefone responsável + Dialog cancelamento |
| `BaseEvents.tsx` | Telefone responsável + Dialog cancelamento |
| `TeamEvents.tsx` | Exibir telefone responsável |
| `team/EventDetail.tsx` | Telefone responsável + motivo cancelamento |

