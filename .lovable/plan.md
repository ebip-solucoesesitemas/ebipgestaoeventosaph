## Objetivo

Trocar o botão "Exportar PDF" por um diálogo que permite ao usuário escolher **o que** exportar e **qual período** filtrar antes de gerar o relatório.

## Mudanças (apenas em `src/pages/admin/Finance.tsx`)

### 1. Novo diálogo "Exportar Relatório"

Ao clicar em "Exportar PDF", abre diálogo com:

- **Tipo de relatório** (select obrigatório):
  - Receitas (orçamentos pagos)
  - Pendentes (orçamentos pendentes)
  - Despesas
  - Pagamentos
  - Completo (todos os anteriores em seções)

- **Filtrar por período** (select):
  - Mês/Ano específico (dois selects: mês 1–12 + ano)
  - Ano inteiro (select de ano)
  - Intervalo personalizado (dois campos data: início + fim)
  - Todos (sem filtro)

- Botões: Cancelar / Gerar PDF

### 2. Lógica de filtragem

Para cada tipo, definir o campo de data usado:
- Receitas/Pendentes: `data_vencimento` (fallback `data_inicio`)
- Despesas: `data_despesa`
- Pagamentos: `data_pagamento`

Filtrar o array antes de montar as linhas do PDF, conforme período escolhido (comparação por string YYYY-MM-DD para evitar bugs de timezone, conforme regra do projeto).

### 3. Geração do PDF

Reaproveitar `generatePDF` de `src/lib/pdf.ts`. Cada tipo tem suas colunas específicas:

- **Receitas/Pendentes**: Evento, Cliente, Valor, Status, Forma Cobrança, Vencimento + total da soma.
- **Despesas**: Evento, Categoria, Descrição, Data, Valor + total.
- **Pagamentos**: Evento, Cliente, Valor, Tipo Pagamento, Data + total.
- **Completo**: usar `groups` do `generatePDF` com 4 seções (Receitas, Pendentes, Despesas, Pagamentos), cada uma com seu subtotal, e total geral (Saldo) ao final.

Subtítulo do PDF reflete o filtro escolhido (ex.: "Período: 05/2026", "Ano: 2026", "01/05/2026 a 13/05/2026", "Todos os registros").

## Não muda

- Os 4 cards de resumo no topo continuam mostrando totais globais (sem filtro).
- As tabs (Orçamentos / Despesas / Pagamentos) continuam exibindo tudo.
- Schema, RLS, edge functions: sem alteração.
- `src/lib/pdf.ts`: sem alteração.
