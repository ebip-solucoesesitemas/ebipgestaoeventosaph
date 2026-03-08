

# Sistema de Chamados (Tickets de Suporte)

## Resumo

Criar um sistema completo de chamados com duas tabelas no banco, RLS seguro, realtime para mensagens, e uma página frontend com lista, criação e detalhes de tickets.

## 1. Migration SQL

Criar as seguintes estruturas:

- **Função `is_super_admin()`** — SECURITY DEFINER que verifica `profiles.hidden = true AND user_id = auth.uid()`
- **Tabela `support_tickets`** — com `ticket_number` (serial), title, description, category, priority (default 'medium'), status (default 'open'), created_by, assigned_to, timestamps
- **Tabela `ticket_messages`** — com ticket_id (FK), user_id, message, is_internal (default false), created_at
- **RLS Policies para `support_tickets`**:
  - SELECT: `created_by = auth.uid() OR is_super_admin()`
  - INSERT: `created_by = auth.uid()` (admin/gestor verificado no frontend)
  - UPDATE: `is_super_admin()` only
  - DELETE: `is_super_admin()` only
- **RLS Policies para `ticket_messages`**:
  - SELECT: pode ver se tem acesso ao ticket (via subquery) + filtro `is_internal` apenas para super_admin
  - INSERT: pode inserir se tem acesso ao ticket
  - UPDATE/DELETE: `is_super_admin()` only
- **Realtime**: `ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_messages;`
- **Trigger** `update_updated_at` na `support_tickets`

## 2. Nova Página `src/pages/SupportTickets.tsx`

Página completa com:

- **Lista de tickets** em tabela: nº, título, categoria (badge), prioridade (badge colorido), status (badge), data
- **Filtros** por status e categoria
- **Dialog de criação**: título, categoria (select: bug/feature_request/question/other), descrição (textarea). Sem campo de prioridade.
- **Dialog de detalhes**:
  - Info do ticket (título, descrição, categoria, prioridade, status)
  - Super_admin: selects para alterar status, prioridade; botão "Atribuir a mim"
  - Timeline de mensagens estilo chat com `h-[250px]` fixo no ScrollArea
  - Auto-scroll para última mensagem via `useEffect` + ref
  - `loadMessages()` chamado imediatamente após envio (não depende apenas do realtime)
  - Realtime subscription para novas mensagens
  - Mensagens `is_internal` visíveis apenas para super_admin (badge "Interno")

## 3. Modificar `src/App.tsx`

- Importar `SupportTickets`
- Adicionar rota `/tickets` com `ProtectedRoute`

## 4. Modificar `src/components/AppSidebar.tsx`

- Importar `MessageSquare` do lucide-react
- Adicionar item "Chamados" (`/tickets`) visível para todos (admin vê na seção Configurações, equipe vê no Menu)

## 5. Arquivos Modificados/Criados

| Arquivo | Ação |
|---------|------|
| Migration SQL | Criar tabelas + RLS + realtime + function |
| `src/pages/SupportTickets.tsx` | CRIAR |
| `src/App.tsx` | Adicionar rota `/tickets` |
| `src/components/AppSidebar.tsx` | Adicionar item "Chamados" |

