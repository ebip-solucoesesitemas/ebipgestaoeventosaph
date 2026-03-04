

# Revisão das Variáveis de Contrato

## Situação Atual

As variáveis disponíveis nos modelos de contrato cobrem apenas dados básicos do cliente e datas. Faltam variáveis importantes do contexto do negócio (orçamento, evento, base, valores por hora, etc.).

## Variáveis Atuais (10)
`CLIENTE_NOME`, `CLIENTE_DOCUMENTO`, `CLIENTE_EMAIL`, `CLIENTE_TELEFONE`, `CLIENTE_ENDERECO`, `CLIENTE_CEP`, `VALOR_CONTRATO`, `DATA_INICIO`, `DATA_FIM`, `DATA_ATUAL`

## Novas Variáveis a Adicionar (8)

| Variável | Descrição |
|---|---|
| `{{VALOR_HORA}}` | Valor por hora (R$) |
| `{{QUANTIDADE_HORAS}}` | Quantidade de horas contratadas |
| `{{VALOR_TOTAL}}` | Valor total (hora × quantidade) |
| `{{TIPO_UNIDADE}}` | Tipo de unidade (USB, USA, etc.) |
| `{{FORMA_COBRANCA}}` | Forma de cobrança (Empenho, PIX, etc.) |
| `{{NOME_EVENTO}}` | Nome do evento vinculado |
| `{{ENDERECO_EVENTO}}` | Endereço do evento |
| `{{BASE_NOME}}` | Nome da base operacional |

## Alterações

### 1. `ContractTemplates.tsx` — Atualizar lista PLACEHOLDERS
Adicionar as 8 novas variáveis na lista de badges clicáveis, organizadas em categorias visuais (Cliente, Financeiro, Evento).

### 2. `GenerateContractDialog.tsx` — Atualizar `replacePlaceholders`
- Adicionar campos de input para `valor_hora`, `quantidade_horas`, `tipo_unidade`, `forma_cobranca`
- Adicionar selects para evento e base (opcionais)
- Expandir a função `replacePlaceholders` para substituir as novas variáveis
- Calcular `VALOR_TOTAL` automaticamente (valor_hora × quantidade_horas)

### 3. Sem alterações no banco de dados
Todas as novas variáveis são preenchidas no momento da geração do contrato a partir de dados já existentes no sistema.

