

# Fix: Super-admin aparecendo na lista de escalação de equipe

## Problema

Na página `src/pages/admin/Events.tsx`, a query de profiles (linha 129) não filtra `hidden` nem `is_account_only`:

```typescript
supabase.from('profiles').select('*').order('nome')
```

Isso faz com que o perfil "Sistema EBIP" (super-admin com `hidden = true`) e contas técnicas apareçam na lista de seleção de equipe.

## Correção

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/admin/Events.tsx` (linha 129) | Adicionar `.eq('hidden', false).eq('is_account_only', false)` à query de profiles |

```typescript
supabase.from('profiles').select('*').eq('hidden', false).eq('is_account_only', false).order('nome')
```

Apenas uma linha alterada. Perfis super-admin e contas técnicas deixarão de aparecer na lista de escalação.

