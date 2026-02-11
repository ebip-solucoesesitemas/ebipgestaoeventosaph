

# Plano: Remover usuarios extras e manter apenas baseviatura66 como equipe

## Problema

Atualmente existem 4 usuarios no sistema de autenticacao:
- `evandrojosedfreitas@gmail.com` (admin) - OK
- `baseviatura66@gmail.com` (equipe) - OK
- `medico.demo@example.com` - NAO DEVERIA EXISTIR como usuario
- `enfermeiro.demo@example.com` - NAO DEVERIA EXISTIR como usuario

O modelo correto: o administrador cria o evento, escala `baseviatura66` como responsavel, e adiciona os demais profissionais (medico, enfermeiro) como membros da equipe. Esses profissionais sao apenas perfis no sistema, sem conta de login propria.

## O que sera feito

### 1. Remover usuarios extras da autenticacao

- Deletar `medico.demo@example.com` e `enfermeiro.demo@example.com` do sistema de autenticacao (auth.users)
- Remover seus registros em `user_roles`
- Manter seus perfis na tabela `profiles`, mas com `user_id = NULL` (para continuarem aparecendo como membros de equipe disponiveis)

### 2. Atualizar a edge function seed-demo

Modificar `supabase/functions/seed-demo/index.ts` para:
- Criar apenas 2 usuarios de autenticacao: admin e baseviatura66
- Criar perfis do medico e enfermeiro SEM vincular a contas de autenticacao (`user_id = NULL`)
- Continuar escalando todos (socorrista, medico, enfermeiro) no evento
- Manter as taxas de pagamento para cada perfil

### 3. Nenhuma alteracao de codigo no frontend

O sistema ja funciona corretamente para este modelo:
- `TeamEvents` lista eventos do usuario logado (baseviatura66)
- `EventDetail` mostra TODA a equipe do evento (incluindo perfis sem login)
- `TeamMemberCheckin` permite que qualquer membro escalado faca check-in/out de colegas (via `handle_team_checkin` com `SECURITY DEFINER`)
- `EventSignature` captura assinatura do representante do cliente
- `APHForm` registra atendimentos

## Detalhes Tecnicos

### Limpeza de dados (via edge function atualizada)

```text
1. Deletar auth users: medico.demo@example.com, enfermeiro.demo@example.com
2. Limpar user_roles dessas contas
3. Atualizar profiles: SET user_id = NULL para medico e enfermeiro
4. Recriar evento de demo com os 3 profissionais escalados
```

### Fluxo final esperado

1. Admin (`evandrojosedfreitas@gmail.com`) cria evento e escala equipe (incluindo perfis sem login)
2. `baseviatura66@gmail.com` faz login e ve o evento atribuido
3. Dentro do evento, ve toda a equipe (3 membros) e pode:
   - Fazer check-in/checkout de TODOS os membros
   - Registrar assinatura de chegada/saida do responsavel do evento
   - Criar atendimentos clinicos (APH)
4. Checkout gera pagamento automatico baseado nas taxas configuradas

