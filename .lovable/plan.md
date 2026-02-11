

# Plano: Configurar Exemplo Completo de Evento para Usuario Equipe

## Resumo

Criar do zero toda a estrutura necessaria para que o usuario `baseviatura66@gmail.com` (equipe) tenha um evento atribuido com o fluxo completo funcionando: equipe com check-in/check-out, formulario de atendimento, assinaturas de chegada e saida, e pagamento automatico baseado no check-in/check-out.

## O que sera feito

### 1. Criar usuarios no sistema

Usando a edge function `create-user` e inserts diretos via service role:

- **Admin**: `evandrojosedfreitas@gmail.com` (se ainda nao existe) - cargo admin
- **Equipe**: `baseviatura66@gmail.com` com senha `exemplo` - cargo equipe, especialidade Socorrista

Tambem serao criados mais 1-2 profissionais de exemplo para compor a equipe completa do evento (ex: um Medico e um Enfermeiro).

### 2. Criar estrutura base

- **Base**: Criar uma base de operacao (ex: "Base SP")
- **Viatura**: Criar uma viatura vinculada a base
- **Cliente**: Criar um cliente com endereco

### 3. Criar evento de exemplo

- Evento vinculado a base, com viatura e local (endereco do cliente)
- Data de inicio/fim abrangendo o periodo atual (para aparecer como "Em Andamento")

### 4. Escalar equipe no evento

- Criar `event_assignments` para cada profissional no evento
- Incluir `baseviatura66@gmail.com` como um dos membros

### 5. Configurar taxas de pagamento

- Inserir registros em `professional_rates` para que o checkout gere pagamento automatico

## Fluxo esperado para o usuario `baseviatura66@gmail.com`

1. Login com email/senha
2. Tela inicial mostra "Meus Eventos" com o evento atribuido
3. Ao entrar no evento, ve:
   - Dados do evento (nome, local, viatura)
   - Equipe completa com botoes de check-in/check-out
   - Assinatura de chegada (representante do cliente)
   - Botao "Novo Atendimento" (formulario APH)
   - Assinatura de saida (habilitada apos todos fazerem checkout)
4. Check-out gera pagamento automatico via funcao `handle_team_checkout`

## Detalhes Tecnicos

### Edge Function para criar usuarios

Sera utilizada a edge function `create-user` ja existente para criar o usuario `baseviatura66@gmail.com` com perfil de equipe. O admin sera criado via `bootstrap-admin` ou insert direto.

### Dados a inserir (SQL via service role)

```text
1. auth.users -> 2 ou 3 usuarios (admin + equipe)
2. profiles -> perfis vinculados
3. user_roles -> roles (admin, equipe)
4. bases -> 1 base
5. vehicles -> 1 viatura
6. clients -> 1 cliente com endereco
7. events -> 1 evento ativo
8. event_assignments -> 2-3 assignments
9. professional_rates -> taxas por hora ou por evento
```

### Nenhuma alteracao de codigo necessaria

O sistema ja tem todas as telas implementadas:
- `TeamEvents` lista eventos do usuario
- `team/EventDetail` mostra equipe, check-in/out, assinaturas, atendimentos
- `TeamMemberCheckin` faz check-in/out com KM para Socorrista
- `EventSignature` captura assinatura do responsavel
- `APHForm` formulario de atendimento clinico
- `handle_team_checkout` RPC gera pagamento automatico

A tarefa e puramente de **dados**: criar os registros necessarios para o fluxo funcionar.

