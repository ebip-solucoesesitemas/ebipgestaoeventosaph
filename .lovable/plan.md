

## Prevenir Pagamentos Duplicados no Relatório por Profissional

### Problema
Ao clicar "Gerar Pagamento" múltiplas vezes (por engano ou achando que não gerou), cria pagamentos duplicados, gerando risco de pagar em dobro.

### Solução

**1. Dialog de confirmação antes de gerar pagamento**
- Ao clicar "Gerar Pagamento", abrir um `AlertDialog` mostrando:
  - Nome do profissional, mês/ano, valor a ser gerado
  - Se já existir pagamento pendente para aquele profissional no mês, mostrar **aviso em destaque**: "Já existe um pagamento pendente de R$ X,XX para este profissional neste período. Deseja gerar outro?"
- Botões: "Cancelar" / "Confirmar Pagamento"

**2. Indicador visual quando já há pagamento pendente**
- Se `total_pendente > 0`, trocar o botão "Gerar Pagamento" por um visual diferente (outline/warning) com texto "Gerar Novo Pagamento" para deixar claro que já existe um
- Adicionar badge "Pagamento pendente" junto ao botão

**3. Mudanças em `src/pages/admin/ProfessionalReport.tsx`**
- Importar `AlertDialog` do shadcn
- Adicionar estado para controlar o dialog e o report selecionado
- No `generatePayment`, só executar após confirmação no dialog
- Condicionar estilo do botão baseado em `report.total_pendente > 0`

### Sem mudanças no banco de dados.

