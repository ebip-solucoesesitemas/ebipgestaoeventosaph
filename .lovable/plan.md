

## Corrigir Alinhamento dos Relatórios PDF

### Problema
No PDF exportado (Folha de Pagamento, Relatório por Profissional, Relatório Financeiro), o cabeçalho do grupo (nome do profissional) não está visualmente alinhado com a tabela abaixo. O espaçamento entre o label e a tabela está inadequado (`currentY += 2`).

### Correções em `src/lib/pdf.ts`

1. **Aumentar espaçamento** entre o label do grupo e o início da tabela: mudar `currentY += 2` para `currentY += 6` para dar respiro visual adequado
2. **Definir larguras de coluna proporcionais** via `columnStyles` usando `cellWidth` para que as colunas ocupem a largura disponível de forma uniforme e alinhada
3. **Garantir que todas as colunas tenham `halign` definido** — colunas sem `halign` explícito receberão `halign: 'left'` como padrão, evitando desalinhamento
4. **Centralizar a tabela** usando `tableWidth: 'auto'` para que o jspdf-autotable distribua as colunas proporcionalmente dentro das margens

### Correções nos relatórios que chamam `generatePDF`

- **PayrollReport.tsx**: Já define `halign` nas colunas monetárias — sem alteração necessária
- **ProfessionalReport.tsx**: Já define `halign` — sem alteração necessária  
- **Finance.tsx**: Verificar se define `halign` em todas as colunas relevantes

### Resultado esperado
Cabeçalhos de grupo alinhados à margem esquerda com espaçamento adequado antes da tabela, e colunas distribuídas uniformemente na largura da página.

