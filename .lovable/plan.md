

# Gestor com mesmo acesso do Admin (exceto Super-Admin)

## Problema

O cargo "gestor" atualmente tem acesso limitado em vários pontos do sistema:

1. **RLS (Backend)**: A função `is_admin()` só verifica `user_roles` para role `admin`. Gestores não têm essa role, então não podem criar/editar eventos, profissionais, finanças, etc.
2. **`usePermissions`**: O bypass de permissões só aplica para cargos admin/admin_bnu/admin_fln. Gestor passa pelo filtro de permissões.
3. **`AppSidebar`**: `isAdminCargo` não inclui gestor, então os menus são filtrados por permissões.
4. **`Index.tsx`**: O dashboard admin e cards só aparecem para `isAdmin` (que vem do user_roles). Gestor vê apenas "Meus Eventos".

## Solução

### 1. Migration SQL — Atualizar `is_admin()` para incluir gestor

```sql
CREATE OR REPLACE FUNCTION public.is_admin()
  RETURNS boolean
  LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
      AND cargo = 'gestor'::public.cargo_tipo
  );
$$;
```

Isso dá ao gestor acesso total nas políticas RLS (mesmas permissões de escrita/leitura do admin).

### 2. `src/hooks/usePermissions.tsx` — Adicionar "gestor" ao bypass

Linha 38: adicionar `"gestor"` à lista `adminCargos` para que o gestor ignore o filtro de permissões no frontend.

### 3. `src/components/AppSidebar.tsx` — Tratar gestor como admin

Linha 96: adicionar `cargo === "gestor"` à condição `isAdminCargo` para que o sidebar mostre todos os menus sem filtrar.

### 4. `src/pages/Index.tsx` — Mostrar dashboard admin para gestor

Usar o cargo do profile para determinar se mostra o dashboard admin e os cards, não apenas `isAdmin` do user_roles.

| Arquivo | Alteração |
|---------|-----------|
| Migration SQL | `is_admin()` retorna true para gestor |
| `src/hooks/usePermissions.tsx` | Gestor no bypass de permissões |
| `src/components/AppSidebar.tsx` | Gestor em `isAdminCargo` |
| `src/pages/Index.tsx` | Dashboard/cards admin para gestor |

**Nota**: Permissões de super-admin (como `profile?.hidden`) permanecem inalteradas — o gestor não terá acesso a funcionalidades exclusivas do super-admin (ex: deletar tickets, ver logs internos).

