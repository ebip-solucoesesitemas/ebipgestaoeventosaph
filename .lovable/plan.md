## Objetivo

Permitir que o gestor crie um evento informando apenas o **valor total** (sem precisar abrir o módulo de orçamento), e que esse valor entre automaticamente no financeiro vinculado ao evento.

O fluxo atual de orçamento detalhado **continua existindo** para a funcionária que monta a proposta — nada é removido.

## Mudanças

### 1. Formulário "Novo Evento" (`src/pages/admin/Events.tsx` e `src/pages/admin/base/BaseEvents.tsx`)

Adicionar uma seção opcional **"Financeiro (opcional)"** no diálogo de criação/edição de evento, com:

- **Valor total do evento** (R$) — campo numérico, opcional
- **Cliente** — select dos clientes existentes, opcional (já existe `client_id` no form, apenas reaproveitar)
- **Forma de cobrança** — select (Boleto, PIX, Emissão NF, Empenho, Não Cobrar, Patrocínio), opcional
- **Data de vencimento** — date, opcional
- **Status inicial**: Pendente (padrão)

A seção fica recolhida/discreta para não poluir o form de quem não vai usar.

### 2. Lógica de salvamento

Ao criar evento (não editar):
- Se `valor_total > 0` **e** não existe `pendingBudgetId` (não veio de orçamento), criar automaticamente um registro em `event_budgets` com:
  - `event_id` = id do evento recém-criado
  - `nome_evento` = nome do evento
  - `valor_contrato` = valor informado
  - `client_id`, `forma_cobranca`, `data_vencimento` = se preenchidos
  - `base_id`, `data_inicio`, `data_fim`, `endereco_evento` = espelhados do evento
  - `status` = 'pendente'
  - `descricao` = "Lançamento direto via cadastro de evento"

Ao editar evento existente:
- Se já existe orçamento vinculado, mostrar o valor atual no campo (read-only ou editável conforme decisão — proposta: editável, atualizando o orçamento existente).
- Se não existe e o gestor preencher valor, criar novo igual ao fluxo de criação.

### 3. Exibição no card do evento

Mostrar o valor do evento (se houver orçamento vinculado) no card da lista de eventos, próximo ao status.

## Não muda

- Tela de Orçamentos (`/admin/finance`) e seu fluxo detalhado continuam idênticos.
- Permissões/RLS de `event_budgets` já permitem admin/gestor — sem migration necessária.
- Conversão "orçamento → evento" continua funcionando como hoje.

## Detalhes técnicos

- Sem alteração de schema: a tabela `event_budgets` já tem todos os campos necessários (`event_id`, `valor_contrato`, `nome_evento`, `client_id`, `forma_cobranca`, `data_vencimento`, `base_id`, `data_inicio`, `data_fim`).
- Sem migration; apenas mudanças em frontend (`Events.tsx` e `BaseEvents.tsx`).
- Tipos do Supabase já cobrem os campos.
