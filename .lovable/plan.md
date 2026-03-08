

## Problema

A query de profissionais filtra apenas `hidden = false`, mas não filtra `is_account_only`. Usuários como VTR-01 e VTR-02 (criados apenas para acesso/login) aparecem na listagem.

## Correção

Adicionar `.eq('is_account_only', false)` na query do `fetchProfiles` em `src/pages/admin/Professionals.tsx`, linha 66:

```typescript
const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('hidden', false)
  .eq('is_account_only', false)
  .order('nome');
```

Uma linha de código. Sem mudanças no banco de dados.

