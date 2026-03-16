

# Adicionar ajuda de custo automática para eventos acima de 6 horas

## Resumo

Quando um profissional trabalhar mais de 6 horas em um evento, o sistema adicionará automaticamente um valor de ajuda de custo (padrão R$15,00) ao cálculo do pagamento. O valor será configurável pela tabela `operational_rates` já existente.

## Alterações

| Arquivo | O que muda |
|---------|-----------|
| `operational_rates` (dados) | Inserir registro com tipo `ajuda_custo_6h` e valor 15.00 |
| `src/pages/admin/OperationalRates.tsx` | Garantir que o registro apareça e seja editável |
| `src/pages/admin/PayrollReport.tsx` | Buscar o valor de ajuda de custo, adicionar R$15 ao `line_total` quando horas > 6. Exibir coluna "Ajuda de Custo" na tabela e PDF. |
| `src/pages/admin/ProfessionalReport.tsx` | Buscar o valor e somar ao `total_calculado` para cada assignment > 6h |
| `supabase/functions/.../handle_team_checkout` (DB function) | Atualizar a função para buscar o valor de ajuda de custo e somar ao pagamento quando horas > 6 |

## Detalhes

**Configuração**: Usar a tabela `operational_rates` com `tipo = 'ajuda_custo_6h'` e valor padrão 15.00. O admin pode alterar na tela "Valores Operacionais".

**PayrollReport**: 
- Buscar `operational_rates` com tipo `ajuda_custo_6h`
- Quando `hours_worked > 6`, adicionar o valor ao `line_total`
- Adicionar campo `ajuda_custo` à interface `PayrollLine`
- Nova coluna "Ajuda Custo" na tabela e no PDF

**ProfessionalReport**:
- Para cada assignment com > 6h, somar o valor de ajuda de custo ao `total_calculado`

**Função handle_team_checkout (DB)**:
- Buscar valor de `operational_rates` onde `tipo = 'ajuda_custo_6h'`
- Se horas > 6 e valor existe, somar ao `v_payment_value`
- Incluir na descrição do pagamento

