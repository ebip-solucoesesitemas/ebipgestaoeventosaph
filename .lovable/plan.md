

# Fix: Erro ao cadastrar profissional sem login

## Problema
O trigger `handle_profile_role_provisioning` dispara em todo INSERT na tabela `profiles` e tenta inserir em `user_roles` usando `NEW.user_id`. Quando o profissional não tem login (`user_id = null`), a coluna `user_id` da tabela `user_roles` tem constraint NOT NULL, causando o erro.

## Solução

**Migration SQL** — Alterar o trigger function para ignorar profiles sem `user_id`:

```sql
CREATE OR REPLACE FUNCTION public.handle_profile_role_provisioning()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _has_any_admin boolean;
BEGIN
  -- Skip if profile has no auth user
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.user_id, 'equipe'::public.app_role)
  ON CONFLICT DO NOTHING;

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE role = 'admin'::public.app_role
  ) INTO _has_any_admin;

  IF NOT _has_any_admin THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'admin'::public.app_role)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
```

Apenas uma migration. Nenhuma alteração de código frontend necessária.

