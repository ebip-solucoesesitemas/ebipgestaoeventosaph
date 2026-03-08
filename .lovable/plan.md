## Plano de Melhorias — EBIP Eventos

Baseado na análise completa do sistema, aqui estão as melhorias organizadas por prioridade e impacto:

---

### Fase 1 — Dashboard com KPIs (Alto Impacto)

Substituir a tela inicial do admin por um dashboard visual com indicadores em tempo real:

- **Cards de resumo**: Eventos ativos, eventos este mês, receita do mês, viaturas disponíveis, profissionais escalados hoje
- **Gráfico de receita mensal** (últimos 6 meses) usando Recharts
- **Lista de próximos eventos** (próximos 7 dias)
- **Status de orçamentos pendentes** (aguardando aprovação/pagamento)

Dados vêm das tabelas existentes: `events`, `event_budgets`, `vehicles`, `event_assignments`. Sem alterações no banco.

---

### Fase 2 — Exportação de Relatórios em PDF

Adicionar botão de exportação nas telas existentes:

- **Folha de Pagamento** (`PayrollReport.tsx`) — exportar tabela completa em PDF
- **Relatório de Profissional** (`ProfessionalReport.tsx`) — histórico individual em PDF
- **Relatório Financeiro** — resumo de receitas/despesas por período

Usar biblioteca `jspdf` + `jspdf-autotable` para gerar PDFs no client-side. Sem alterações no banco.

---

### Fase 3 — Histórico do Profissional

Criar uma tela acessível ao clicar no profissional mostrando:

- Total de eventos participados
- Total de horas trabalhadas (baseado em check-in/check-out)
- Valores recebidos (da tabela `professional_payments`)
- Lista de eventos com datas e status

Dados já existem nas tabelas `event_assignments` e `professional_payments`. Sem alterações no banco.

---

### Fase 4 — Controle de Manutenção de Viaturas

Novo módulo para gerenciar manutenção da frota:

- **Nova tabela `vehicle_maintenance**`: id, vehicle_id, tipo (preventiva/corretiva), descricao, data_manutencao, km_manutencao, custo, proxima_revisao_km, status
- Tela de registro de manutenções por viatura
- Alertas visuais quando km atual se aproxima da próxima revisão
- Histórico de gastos por viatura

Requer: 1 nova tabela + RLS policies + nova página.

---

### Fase 5 — Modo Escuro

- Adicionar toggle no footer do sidebar
- Usar `next-themes` (já instalado) para gerenciar tema
- As variáveis CSS do Tailwind já suportam dark mode — ajustar onde necessário

Sem alterações no banco.

---

### Fase 6 — Variáveis Expandidas nos Contratos

Conforme o plano já documentado em `.lovable/plan.md`:

- Adicionar 8 novas variáveis aos modelos de contrato (`VALOR_HORA`, `QUANTIDADE_HORAS`, `VALOR_TOTAL`, `TIPO_UNIDADE`, `FORMA_COBRANCA`, `NOME_EVENTO`, `ENDERECO_EVENTO`, `BASE_NOME`)
- Atualizar `ContractTemplates.tsx` e `GenerateContractDialog.tsx`

Sem alterações no banco.

---

### Resumo de Prioridades


| Fase | Melhoria               | Banco         | Complexidade |
| ---- | ---------------------- | ------------- | ------------ |
| 1    | Dashboard KPIs         | Nenhuma       | Média        |
| 2    | Exportação PDF         | Nenhuma       | Média        |
| 3    | Histórico Profissional | Nenhuma       | Baixa        |
| 4    | Manutenção Viaturas    | 1 tabela nova | Alta         |
| 5    | Modo Escuro            | Nenhuma       | Baixa        |
| 6    | Variáveis Contrato     | Nenhuma       | Baixa        |


Qual fase deseja implementar primeiro?  
O de Manutenção de viaturas pode retirar  
So acrescente um modo  de informar se a viatura estiver baixada para Oficina