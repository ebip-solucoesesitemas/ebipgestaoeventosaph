

# Fix: Gestor não consegue cadastrar/excluir usuários

## Problema

As edge functions `create-user` e `delete-user` verificam permissão de admin checando diretamente a tabela `user_roles` por `role = 'admin'`. O gestor não tem essa role — ele tem apenas `role = 'equipe'` em `user_roles`, e seu cargo `gestor` está na tabela `profiles`.

A função `is_admin()` no banco já foi atualizada para incluir gestores, mas as edge functions **não usam** essa função — fazem a verificação manualmente.

## Solução

Atualizar a verificação de admin nas edge functions `create-user` e `delete-user` para também aceitar o cargo `gestor` da tabela `profiles`.

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/create-user/index.ts` | Após checar `user_roles`, também checar `profiles.cargo = 'gestor'` |
| `supabase/functions/delete-user/index.ts` | Mesma lógica — aceitar gestor como admin |

### Lógica de verificação (ambas as functions)

Substituir a checagem atual:
```typescript
// ANTES: só checa user_roles.role = 'admin'
const { data: adminRole } = await supabaseAdmin
  .from("user_roles").select("role")
  .eq("user_id", userId).eq("role", "admin").maybeSingle();
if (!adminRole) { return 403; }
```

Por:
```typescript
// DEPOIS: checa user_roles OU profiles.cargo = 'gestor'
const { data: adminRole } = await supabaseAdmin
  .from("user_roles").select("role")
  .eq("user_id", userId).eq("role", "admin").maybeSingle();

if (!adminRole) {
  const { data: gestorProfile } = await supabaseAdmin
    .from("profiles").select("cargo")
    .eq("user_id", userId).eq("cargo", "gestor").maybeSingle();
  if (!gestorProfile) { return 403; }
}
```

A função `reset-user-password` permanece como está — é exclusiva de super-admin (`hidden = true`), e o gestor não deve ter acesso a ela.

