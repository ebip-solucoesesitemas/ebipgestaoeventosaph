

## Problema Identificado

O VTR-02 é dono do evento (`user_id`), então consegue ver o evento. Porém, ao carregar a equipe, a query faz um JOIN com `profiles` — e a RLS de `profiles` bloqueia o acesso.

**Causa raiz:** A função `is_event_teammate(profile_id)` só verifica se o usuário compartilha um `event_assignment` com o profissional. O VTR-02 é dono do evento mas **não está na tabela `event_assignments`**, então `is_event_teammate` retorna `false` e os perfis dos profissionais escalados ficam `null`. O código em `EventDetail.tsx` filtra entradas com `profiles = null` (linha 98), resultando em equipe vazia.

## Correção

### 1. Atualizar a função `is_event_teammate` (migração SQL)

Adicionar verificação para donos de evento — se o usuário é `user_id` de algum evento onde o profissional alvo está escalado:

```sql
CREATE OR REPLACE FUNCTION public.is_event_teammate(p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Teammate via shared assignment
  SELECT EXISTS (
    SELECT 1
    FROM event_assignments ea1
    JOIN event_assignments ea2 ON ea1.event_id = ea2.event_id
    JOIN profiles my_profile ON my_profile.id = ea2.profile_id 
      AND my_profile.user_id = auth.uid()
    WHERE ea1.profile_id = p_profile_id
  )
  OR
  -- Event owner can see profiles of assigned team
  EXISTS (
    SELECT 1
    FROM event_assignments ea
    JOIN events e ON e.id = ea.event_id
    WHERE ea.profile_id = p_profile_id
      AND e.user_id = auth.uid()
  )
$$;
```

### Impacto

- Sem alteração em código front-end
- Donos de evento (contas `is_account_only` ou não) passam a ver os perfis dos profissionais escalados
- Nenhuma outra tabela ou policy precisa mudar

