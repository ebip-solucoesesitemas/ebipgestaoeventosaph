

# Fix: Profissional excluído permanece nos relatórios

## Problema identificado

Existem **dois problemas**:

1. **A exclusão do profissional não limpa dados relacionados**: A edge function `delete-user` exclui o registro em `profiles`, mas **não exclui** os registros em `professional_rates`, `professional_payments` e `event_assignments`. Se a exclusão do profile falhar por causa dessas referências, o profissional permanece no banco.

2. **Relatório por Profissional mostra TODOS os profiles**: O `ProfessionalReport.tsx` lista todos os profissionais do banco, mesmo aqueles com 0 eventos e 0 pagamentos no período. Deveria filtrar apenas quem teve atividade.

## Solução

### 1. Edge function `delete-user` — Limpar dados relacionados antes de excluir o profile

Antes de deletar o profile, excluir registros nas tabelas dependentes:
- `professional_rates` (valor/hora do profissional)
- `professional_payments` (pagamentos)
- `event_assignments` (alocações em eventos)

### 2. `ProfessionalReport.tsx` — Filtrar profissionais sem atividade

Após montar os dados, filtrar para mostrar apenas profissionais que tenham `total_events > 0` OU `total_pendente > 0` OU `total_pago > 0` no período selecionado.

### 3. `PayrollReport.tsx` — Tratar profile_id órfão

Na Folha de Pagamento, se um `event_assignment` referencia um `profile_id` que não existe mais em `profiles`, o relatório já mostra "—" como nome. Após a correção na edge function, isso não ocorrerá mais, mas adicionaremos um filtro para ignorar linhas com profile inexistente.

| Arquivo | Ação |
|---------|------|
| `supabase/functions/delete-user/index.ts` | Excluir `professional_rates`, `professional_payments`, `event_assignments` antes do profile |
| `src/pages/admin/ProfessionalReport.tsx` | Filtrar profissionais sem atividade no período |
| `src/pages/admin/PayrollReport.tsx` | Ignorar linhas com profile inexistente |

