# Fix: Operacional não vê menus conforme permissões configuradas

## Causa Raiz

O problema principal é que a tabela `role_permissions` tem uma política RLS de SELECT que exige `is_admin()`. Como o cargo "operacional" não é admin nem gestor, a query do `usePermissions` retorna **vazio** — e todos os links do sidebar são ocultados.

Além disso, o `Index.tsx` só mostra o dashboard admin para `isAdmin || gestor`, excluindo o operacional.

## Resumo das Correções


| Local                           | Problema                                                                | Correção                                                        |
| ------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------- |
| RLS `role_permissions`          | SELECT exige `is_admin()` — operacional/equipe não lêem suas permissões | Permitir SELECT para todos os autenticados                      |
| `src/pages/Index.tsx`           | `isAdminLike` não inclui operacional                                    | Usar `showAdminMenu` baseado em permissões                      |
| `src/components/AppSidebar.tsx` | `showAdminMenu` hardcoded para operacional/gestor                       | Mostrar menu admin se o cargo tem qualquer permissão habilitada |


### 1. Migration SQL — Corrigir RLS de `role_permissions`

Alterar a política SELECT de `role_permissions` para permitir leitura por todos os usuários autenticados:

```sql
DROP POLICY "Authenticated users can view permissions" ON public.role_permissions;
CREATE POLICY "Authenticated users can view permissions"
  ON public.role_permissions FOR SELECT
  TO authenticated
  USING (true);
```

Isso é seguro porque `role_permissions` não contém dados sensíveis — é apenas a matriz de permissões por cargo.

### 2. `src/pages/Index.tsx`

Linha 110: Incluir operacional no `isAdminLike`:

```typescript
const isAdminLike = isAdmin || profile?.cargo === 'gestor' || profile?.cargo === 'operacional';
```

### 3. `src/components/AppSidebar.tsx`

A lógica atual já inclui operacional em `showAdminMenu` (linha 99), e o `filterLinks` já usa `hasPermission` para operacional. Com a correção do RLS, as permissões serão carregadas corretamente e os links aparecerão conforme configurado na tela de Permissões.

Nenhuma alteração necessária no sidebar.  
  
