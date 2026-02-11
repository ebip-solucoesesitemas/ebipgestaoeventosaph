
# Plano: Vincular Eventos a Contas de Usuario

## Resumo

Atualmente, eventos nao tem vinculo direto com uma conta de usuario (login). O plano e adicionar um campo `user_id` na tabela `events` para que cada evento seja atribuido a uma conta de viatura/equipe (ex: basevtr66@gmail.com). Os profissionais da equipe continuam sendo gerenciados separadamente via `event_assignments`.

## Fluxo desejado

1. Admin cria evento e seleciona a **conta de usuario** responsavel (ex: Vtr-66)
2. Admin seleciona a viatura e os profissionais da equipe
3. Quando o usuario Vtr-66 faz login, ve os eventos atribuidos a ele
4. Dentro do evento, os profissionais escalados aparecem para check-in/checkout

## O que sera feito

### 1. Migrar banco de dados

- Adicionar coluna `user_id` (uuid, nullable) na tabela `events`, referenciando `auth.users(id)`
- Atualizar a politica RLS de SELECT para que usuarios vejam eventos onde `events.user_id = auth.uid()` (alem do check existente via `is_assigned_to_event`)

### 2. Atualizar formulario de criacao de evento (`Events.tsx`)

- Adicionar campo **"Conta Responsavel"** (select) que lista apenas usuarios com login (perfis com `user_id` nao nulo e cargo = "equipe")
- Ao salvar o evento, gravar o `user_id` selecionado
- Na lista de profissionais para escalar, **excluir** o perfil do usuario responsavel (ele nao precisa estar na equipe escalada, pois ja e o "dono" do evento)

### 3. Atualizar detalhes do evento

- Mostrar qual conta de usuario e responsavel pelo evento
- Garantir que a conta responsavel consegue ver o evento mesmo sem estar em `event_assignments`

### 4. Atualizar pagina da equipe (`TeamEvents.tsx` / `team/EventDetail.tsx`)

- Atualizar a query para tambem buscar eventos onde `user_id = auth.uid()`, garantindo que o usuario da viatura veja seus eventos

## Detalhes Tecnicos

### Migracao SQL

```sql
ALTER TABLE public.events ADD COLUMN user_id uuid REFERENCES auth.users(id);

-- Atualizar RLS para permitir que o usuario atribuido veja o evento
DROP POLICY IF EXISTS "Users can view assigned events" ON public.events;
CREATE POLICY "Users can view assigned events" ON public.events
FOR SELECT USING (
  is_admin() OR is_assigned_to_event(id) OR user_id = auth.uid()
);
```

### Formulario - Campo "Conta Responsavel"

Buscar perfis com `user_id IS NOT NULL` e `cargo = 'equipe'` para popular o select. Gravar o `user_id` do perfil selecionado na coluna `events.user_id`.

### Arquivos a modificar

1. **Migracao**: Nova migracao SQL para adicionar `user_id` e atualizar RLS
2. **`src/pages/admin/Events.tsx`**: Adicionar select de conta responsavel no formulario
3. **`src/pages/team/TeamEvents.tsx`**: Atualizar query para incluir eventos por `user_id`
4. **`src/pages/admin/EventDetail.tsx`**: Mostrar conta responsavel no cabecalho
