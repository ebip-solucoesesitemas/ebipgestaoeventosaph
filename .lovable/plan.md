

# Adicionar "Tipo de Unidade", "Responsável" e "Telefone" ao cadastro e detalhes de eventos

## Problema

O campo **Tipo de Unidade** (USB, USA, etc.) só aparece no formulário de orçamento, mas não no cadastro direto de eventos. O mesmo ocorre com o **nome do responsável** e **telefone** — só visíveis no orçamento. Esses dados precisam estar disponíveis no cadastro de eventos e nas telas de detalhes (admin e equipe).

## Alterações

### 1. Migration: adicionar coluna `tipo_unidade` na tabela `events`

```sql
ALTER TABLE public.events ADD COLUMN tipo_unidade text;
```

A tabela `events` já possui `user_id` (responsável) e `client_id`, então não precisa de novas colunas para responsável/telefone — basta buscar o perfil vinculado ao `user_id`.

### 2. Formulário de criação/edição de eventos (`src/pages/admin/Events.tsx`)

- Adicionar `tipo_unidade` ao `formData` e `resetForm`
- Adicionar campo Select com as opções (USB, USA, Semi Presencial, etc.) no formulário
- Incluir `tipo_unidade` no `eventData` enviado ao banco
- Carregar `tipo_unidade` ao editar evento existente

### 3. Formulário na tela de base (`src/pages/admin/base/BaseEvents.tsx`)

- Mesmo tratamento: adicionar campo `tipo_unidade` ao formulário de criação/edição

### 4. Detalhes do evento admin (`src/pages/admin/EventDetail.tsx`)

- Buscar `tipo_unidade` do evento e exibir como Badge no header
- Buscar `telefone` do perfil responsável (já busca `nome` via `user_id`) e exibir junto ao nome do responsável

### 5. Detalhes do evento equipe (`src/pages/team/EventDetail.tsx`)

- Buscar perfil responsável (nome + telefone) via `user_id` do evento
- Exibir nome do responsável e telefone no header
- Buscar e exibir `tipo_unidade`

| Arquivo | Alteração |
|---------|-----------|
| Migration SQL | `ALTER TABLE events ADD COLUMN tipo_unidade text` |
| `src/pages/admin/Events.tsx` | Campo tipo_unidade no form + salvar/carregar |
| `src/pages/admin/base/BaseEvents.tsx` | Campo tipo_unidade no form + salvar/carregar |
| `src/pages/admin/EventDetail.tsx` | Exibir tipo_unidade + telefone do responsável |
| `src/pages/team/EventDetail.tsx` | Exibir tipo_unidade + responsável (nome + telefone) |

