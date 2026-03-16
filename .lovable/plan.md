

# Mover valores do profissional para o formulário de cadastro

## Resumo

Adicionar os campos "Valor por Hora" e "Valor por Evento" diretamente no formulário de cadastro/edição de profissionais. Remover a tela separada "Valores Profissionais". Os relatórios continuam funcionando normalmente pois leem da mesma tabela `professional_rates`.

## Alterações

| Arquivo | O que muda |
|---------|-----------|
| `src/pages/admin/Professionals.tsx` | Adicionar campos `valor_hora` e `valor_evento` no formulário. Ao salvar, fazer upsert na tabela `professional_rates`. Ao editar, carregar os valores existentes. Exibir valores no card do profissional. |
| `src/App.tsx` | Remover rota `/admin/professional-rates` e import do `ProfessionalRates` |
| `src/components/AppSidebar.tsx` | Remover item de menu "Valores Profissionais" |
| `src/pages/admin/ProfessionalRates.tsx` | Pode ser deletado (não será mais usado) |

## Detalhes da implementação

**Formulário (Professionals.tsx)**:
- Adicionar `valor_hora` e `valor_evento` ao `formData` (default `''`)
- No `openEditDialog`, buscar o rate existente da tabela `professional_rates` para o profile
- Carregar todos os rates no `fetchProfiles` via query paralela
- Exibir dois inputs numéricos "Valor por Hora (R$)" e "Valor por Evento (R$)" antes da seção de credenciais
- No `handleSubmit`, após salvar o profile, fazer upsert no `professional_rates` com os valores informados
- No card, mostrar os valores quando preenchidos (ex: "R$ 50,00/h" ou "R$ 200,00/evento")

**Relatórios** (`PayrollReport.tsx`, `ProfessionalReport.tsx`):
- Sem alteração. Continuam lendo de `professional_rates` normalmente.

**Checkout** (função `handle_team_checkout`):
- Sem alteração. Continua lendo de `professional_rates`.

