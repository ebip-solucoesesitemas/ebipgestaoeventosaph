

# Fix: Dropdown "Conta Responsável" não aparece nos formulários de evento

## Problema

Existem dois problemas:

1. **Events.tsx (linha 165)**: A query de "Conta Responsável" filtra `cargo = 'equipe'`, excluindo usuários com outros cargos (operacional, gestor, etc.). Se não houver perfis com cargo equipe que tenham `user_id`, o dropdown fica vazio.

2. **BaseEvents.tsx**: O formulário de criação/edição de eventos por base **não tem** o campo "Conta Responsável" (`user_id`). Eventos criados por esta tela ficam sem `user_id`, e portanto o usuário "somente acesso" nunca consegue ver o evento.

## Correções

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/admin/Events.tsx` (linha 165) | Remover `.eq('cargo', 'equipe')` e adicionar `.eq('hidden', false)` para incluir todos os cargos com conta ativa |
| `src/pages/admin/base/BaseEvents.tsx` | Adicionar campo "Conta Responsável" no formulário, buscar userAccounts, e salvar `user_id` no evento |

### 1. Events.tsx — Corrigir filtro da query

Linha 161-166, alterar para:
```typescript
const { data: accountsData } = await supabase
  .from('profiles')
  .select('id, nome, user_id')
  .not('user_id', 'is', null)
  .eq('hidden', false)
  .order('nome');
```

### 2. BaseEvents.tsx — Adicionar campo "Conta Responsável"

- Adicionar estado `userAccounts` e tipo `UserAccount`
- Buscar perfis com `user_id` não nulo (mesma query corrigida)
- Adicionar `user_id` ao `formData`
- Adicionar dropdown "Conta Responsável" no formulário (entre Cliente e Viatura)
- Incluir `user_id` no `eventData` enviado ao banco
- No `openEditDialog`, carregar o `user_id` do evento existente

