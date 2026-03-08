

## Corrigir Valor do Pagamento Gerado — Descontar Pagamentos Já Existentes

### Problema
Atualmente, ao clicar "Gerar Pagamento", o sistema usa `total_calculado` (todas as horas do mês × valor/hora). Se o admin já gerou um pagamento no meio do mês e depois o profissional trabalhou mais horas, o segundo pagamento será pelo total do mês inteiro, e não apenas pelas horas novas. Isso gera pagamento duplicado.

**Exemplo:** Profissional trabalhou 3h (R$ 45). Admin gerou pagamento de R$ 45 (pendente). Profissional trabalha mais 2h. Total calculado agora é R$ 75. Se clicar "Gerar Pagamento", gera R$ 75 ao invés de R$ 30.

### Solução

1. **Calcular "Saldo a Pagar"** = `total_calculado - (total_pendente + total_pago)`
2. **Adicionar campo `saldo_a_pagar` ao `ReportData`** para exibir claramente quanto falta pagar
3. **Usar `saldo_a_pagar` como valor do pagamento** ao invés de `total_calculado`
4. **Desabilitar botão "Gerar Pagamento"** quando `saldo_a_pagar <= 0` (tudo já foi gerado)
5. **Exibir na UI** um novo card/indicador "Saldo a Pagar" para o admin ver claramente o que falta

### Mudanças em `src/pages/admin/ProfessionalReport.tsx`

- Adicionar `saldo_a_pagar` na interface `ReportData`
- No cálculo: `saldo_a_pagar = Math.max(0, total_calculado - total_pendente - total_pago)`
- No `confirmGeneratePayment`: usar `report.saldo_a_pagar` como valor do insert
- No `handleGenerateClick`: bloquear se `saldo_a_pagar <= 0`
- No dialog de confirmação: mostrar o valor do saldo e não do total
- Adicionar card visual "Saldo a Pagar" na grid de métricas (entre Total Calculado e Pendente)
- Atualizar o PDF export para incluir coluna "Saldo"

### Sem mudanças no banco de dados.

