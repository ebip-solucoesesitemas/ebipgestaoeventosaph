

# Plano: Corrigir 3 Problemas

## Problema 1: Quilometragem nao salva

**Causa**: A tabela `events` so tem politica de UPDATE para admins (`is_admin()`). Quando o usuario da viatura (ex: basevtr66@gmail.com) tenta salvar o KM, a operacao e bloqueada silenciosamente pela seguranca do banco.

**Solucao**: Criar uma politica de UPDATE na tabela `events` para permitir que o dono do evento (`user_id = auth.uid()`) atualize os campos de KM.

## Problema 2: Calculo de horas mostra 0,3h em vez de minutos

**Causa**: A funcao `handle_team_checkout` calcula as horas como decimal (18 min = 0.3h). Isso e matematicamente correto, mas confuso para o usuario.

**Solucao**: 
- Alterar a funcao para retornar tambem os minutos exatos
- No frontend (`TeamMemberCheckin`), exibir o tempo em formato "Xh Ymin" (ex: "0h 18min" ou simplesmente "18min")
- Na descricao do pagamento, usar o mesmo formato legivel

## Problema 3: Evento nao aparece sem atribuir profile

**Causa**: A pagina `TeamEvents.tsx` busca eventos via RLS, e a funcao `is_assigned_to_event` ja inclui o check de `user_id = auth.uid()`. Porem, a pagina tambem busca `event_assignments` filtrado por `profile_id` do usuario. Se o usuario da viatura nao tem um assignment, os dados de equipe nao carregam corretamente, e a logica anterior de filtro pode estar interferindo.

**Solucao**: Simplificar `TeamEvents.tsx` para confiar totalmente no RLS — remover a busca intermediaria de `event_assignments` por `profile_id` e buscar todos os eventos que o usuario pode ver diretamente.

## Detalhes Tecnicos

### Migracao SQL

```text
-- 1. Permitir que o dono do evento atualize seus eventos
CREATE POLICY "Event owner can update their events"
ON public.events FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 2. Atualizar funcao de checkout para retornar minutos
-- Adicionar v_minutes ao retorno do handle_team_checkout
```

### Arquivos a modificar

1. **Migracao SQL** — politica de UPDATE para o dono do evento + atualizar funcao checkout para retornar minutos
2. **`src/components/TeamMemberCheckin.tsx`** — exibir horas no formato "Xh Ymin" no toast de checkout
3. **`src/pages/team/TeamEvents.tsx`** — remover busca intermediaria de assignments por profile_id, confiar no RLS
4. **`src/pages/team/EventDetail.tsx`** — adicionar tratamento de erro visivel no save de KM (caso ainda falhe)

