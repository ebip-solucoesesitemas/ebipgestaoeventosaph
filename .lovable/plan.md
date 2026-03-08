## Problema Identificado

O VTR-02 não tem nenhum evento vinculado a ele como "Conta Responsável" (`user_id`). Os 3 eventos existentes têm `user_id = null` ou `user_id = VTR-01`.

Mas o pedido é claro: **contas "somente para acesso" (`is_account_only`) devem ver TODOS os eventos**, não apenas os que estão vinculados a elas. Essas contas representam viaturas/unidades operacionais e precisam de visibilidade total.

## Plano de Correção

### 1. Alterar RLS da tabela `events` (migração SQL)

Atualizar a policy SELECT para incluir contas `is_account_only`:

```sql
DROP POLICY "Users can view assigned events" ON public.events;
CREATE POLICY "Users can view assigned events" ON public.events
  FOR SELECT TO authenticated
  USING (
    is_admin()
    OR is_assigned_to_event(id)
    OR (user_id = auth.uid())
    OR (EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_account_only = true
    ))
  );
```

### 2. Atualizar o texto da tela `TeamEvents.tsx`

Mudar a mensagem vazia de "Você não está escalado em nenhum evento" para "Nenhum evento encontrado" (já que contas de acesso veem todos os eventos, a mensagem anterior não faz sentido).

### Impacto

- **Sem risco de quebra** — apenas adiciona uma condição OR à policy existente
- Contas `is_account_only` (VTR-01, VTR-02) passarão a ver todos os eventos não finalizados
- Usuários normais da equipe continuam vendo apenas seus eventos atribuídos  
  
Se eu coloquei a como responsavel ela so verá os eventos em que ela esta como rresponsável né?  
