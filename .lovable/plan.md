

# Corrigir acesso do cargo Operacional no banco de dados

## Problema

A função `is_admin()` no banco de dados controla todas as políticas RLS (Row Level Security) de praticamente todas as tabelas. Ela só retorna `true` para:
- Usuários com role `admin` em `user_roles`
- Usuários com cargo `gestor` em `profiles`

O cargo `operacional` **não está incluído**, então mesmo que a UI mostre os menus corretos (eventos, profissionais, viaturas), qualquer operação de escrita (criar evento, editar, etc.) é bloqueada pelo banco.

## Solução

Atualizar a função `is_admin()` para incluir o cargo `operacional`:

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
      AND cargo IN ('gestor'::public.cargo_tipo, 'operacional'::public.cargo_tipo)
  )
$$;
```

## Impacto

Isso dará ao cargo operacional o mesmo nível de acesso no banco de dados que o gestor tem. A restrição fina (quais menus e funcionalidades aparecem) continua sendo controlada pela matriz de permissões (`role_permissions`) no frontend via `usePermissions`.

Tabelas afetadas: `events`, `event_assignments`, `vehicles`, `profiles`, `professional_rates`, e todas as demais que usam `is_admin()` em suas políticas RLS.

| Arquivo | Alteração |
|---------|-----------|
| Migration SQL | Atualizar função `is_admin()` para incluir `operacional` |

