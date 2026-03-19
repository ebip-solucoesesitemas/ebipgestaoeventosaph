

# Plano de melhorias: Viaturas, WhatsApp, Profissionais, Filtros e Horas

## 1. Corrigir telefone no cadastro de profissionais (BUG CRÍTICO)

O campo `telefone` existe na tabela `profiles` mas **não está no formulário** de cadastro/edição de profissionais. Por isso o WhatsApp diz "sem telefone cadastrado".

**Arquivo**: `src/pages/admin/Professionals.tsx`
- Adicionar `telefone: ''` ao `formData` e `resetForm`
- Carregar `profile.telefone` no `openEditDialog`
- Incluir campo Input "Telefone / Celular" no formulário (após CPF)
- Incluir `telefone` no payload de `update` e no `insert` direto

## 2. Viaturas: mostrar "Reservada" para eventos futuros

**Arquivos**: `src/pages/admin/Vehicles.tsx`, `src/pages/admin/base/BaseVehicles.tsx`
- Alterar a query de eventos para buscar **todos** os eventos não finalizados vinculados a viaturas (não apenas em_uso, mas também agendados futuros)
- Lógica de exibição:
  - Se `now >= start && now <= end` → "Empenhada em: [evento]"
  - Se `now < start` → "Reservada para: [evento]" (badge azul/info)
  - Se `now > end && status !== finalizado` → "Aguardando finalização"
- Na seleção de viatura ao criar evento (`Events.tsx` e `BaseEvents.tsx`): manter a validação de conflito existente, mas transformar em **confirmação** (ao invés de bloquear, perguntar "Esta viatura já está reservada para [evento] neste dia. Deseja continuar?")

## 3. Botões de WhatsApp e Duplicar na tela de BaseEvents

**Arquivo**: `src/pages/admin/base/BaseEvents.tsx`
- Os botões de duplicar e WhatsApp já existem nos cards de evento
- Adicionar o botão de WhatsApp nos badges de profissionais escalados (igual ao Events.tsx, linhas 1111-1128)
- Confirmar que o sendWhatsApp busca `telefone` do profissional corretamente

## 4. Filtros na tela BaseEvents

**Arquivo**: `src/pages/admin/base/BaseEvents.tsx`
- Adicionar filtros: nome do evento, data, profissional escalado
- Adicionar estados: `filterEventName`, `filterDate`, `filterProfessional`
- Filtrar a lista de eventos com base nesses critérios
- Para filtro de profissional: verificar se o profissional está nos assignments do evento

## 5. Filtro de busca na escala de profissionais (BaseEvents)

**Arquivo**: `src/pages/admin/base/BaseEvents.tsx`
- Adicionar campo de busca (Input com ícone Search) na seção "Escalar Profissionais" do formulário
- Filtrar a lista de profissionais por nome (igual já existe em Events.tsx)

## 6. Mostrar quantidade de horas no formulário de evento

**Arquivos**: `src/pages/admin/Events.tsx`, `src/pages/admin/base/BaseEvents.tsx`
- Calcular a diferença entre `data_fim` e `data_inicio` quando ambos estiverem preenchidos
- Exibir abaixo dos campos de data: "Duração: Xh Ymin"
- Cálculo: `(new Date(data_fim) - new Date(data_inicio)) / 3600000`

## Resumo de arquivos alterados

| Arquivo | Alterações |
|---------|-----------|
| `src/pages/admin/Professionals.tsx` | Adicionar campo telefone no form, salvar/carregar |
| `src/pages/admin/Vehicles.tsx` | Mostrar eventos reservados (futuros) nas viaturas |
| `src/pages/admin/base/BaseVehicles.tsx` | Mesma lógica de reserva futura |
| `src/pages/admin/Events.tsx` | Confirmação ao selecionar viatura reservada + mostrar duração em horas |
| `src/pages/admin/base/BaseEvents.tsx` | Filtros (nome, data, profissional), busca na escala, WhatsApp nos badges, duração em horas, confirmação viatura |

Nenhuma alteração de banco de dados necessária.

