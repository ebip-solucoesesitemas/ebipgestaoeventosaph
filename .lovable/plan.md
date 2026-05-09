
# Plano de Implementação

## 1. Módulo de Checklist (Ambulâncias e Kits Médicos)

### Banco de dados (novas tabelas)

**`checklist_categories`** — agrupamentos/compartimentos
- `nome` (ex: "Mochila Azul - Vias Aéreas", "Multibox - Medicamentos", "Vistoria da Ambulância")
- `descricao`, `ordem` (int para ordenar), `ativo` (bool)

**`checklist_items`** — itens cadastráveis pelo admin
- `category_id` (FK)
- `nome` (material/medicamento)
- `quantidade_ideal` (int)
- `unidade` (text opcional, ex: "un", "amp")
- `ativo` (bool), `ordem`

**`checklist_submissions`** — uma conferência feita
- `profile_id` (quem preencheu)
- `base_id` (base do profissional)
- `vehicle_id` (opcional — viatura conferida)
- `event_id` (opcional — vincula a um evento)
- `tipo` (`diario` | `evento`)
- `observacoes`, `created_at`

**`checklist_submission_items`** — resposta item a item
- `submission_id` (FK)
- `item_id` (FK)
- `status` (`ok` | `divergente` | `falta`)
- `quantidade_atual` (int, nullable)

### RLS
- Categorias e itens: leitura para autenticados; escrita só `is_admin()`.
- Submissions: profissional cria/lê as próprias; `is_admin()` lê tudo. Operacional restrito à própria base.

### Frontend
- **Admin**: nova página `/admin/checklist` no AppSidebar (somente admin/gestor) — CRUD de categorias e itens, agrupados por categoria, com drag/ordem simples.
- **Profissional**: nova página `/team/checklist` — lista todos os itens agrupados por categoria, cada linha com:
  - Botão verde "OK" (marca `status=ok`, `quantidade_atual=ideal`)
  - Input numérico "Qtd atual" (status `divergente` se ≠ ideal)
  - Botão "F" (Falta) destacado em vermelho
  - Campo final de observações + botão "Assinar e Enviar" (registra `profile_id` + timestamp)
- Histórico das últimas conferências do profissional na mesma tela (somente leitura).

## 2. Folha de Pagamento — Exportação Excel

- Adicionar botão **"Gerar Relatório em Excel"** em `src/pages/admin/PayrollReport.tsx` ao lado dos botões existentes (Imprimir/PDF).
- Usar a biblioteca `xlsx` (SheetJS) já comum em projetos React, ou `exceljs`. Sugestão: `xlsx` (mais leve).
- Conteúdo da planilha: respeitar filtros aplicados (mês/ano/profissional/base). Colunas: Profissional, Especialidade, Base, Evento, Data, Check-in, Check-out, Tempo (Xh Ymin), Valor/hora, Ajuda de Custo, Subtotal. Linha final com TOTAL geral.
- Nome do arquivo: `folha-pagamento-<mes>-<ano>.xlsx`.

## 3. Evoluções Clínicas — Assinaturas CRM/COREN

### Banco de dados
Adicionar colunas em `clinical_attendances`:
- `medico_nome` (text)
- `medico_crm` (text)
- `enfermeiro_nome` (text)
- `enfermeiro_coren` (text)

### Frontend
- **Formulário** (`src/components/APHForm.tsx`, etapa "Evolução"): após os textos de evolução médica e de enfermagem, dois blocos:
  - "Assinatura Médica" → inputs Nome Completo + CRM (obrigatórios apenas se houver `evolucao_medica` preenchida).
  - "Assinatura da Enfermagem" → inputs Nome Completo + COREN (obrigatórios apenas se houver `evolucao_clinica` preenchida).
- Validação ao avançar: se há texto na evolução correspondente, exigir nome + número do conselho.
- **Visualização** (`src/components/APHSummary.tsx`): exibir abaixo de cada bloco de evolução um card destacado com "Assinado por: {nome} — CRM/COREN: {numero}" em destaque visual (border-l-4 + bg muted).
- **PDF**: incluir essas assinaturas no `handleDownloadPdf` logo após cada seção de evolução.

## Detalhes Técnicos

- Branding interno: "EBIP Eventos"; relatórios oficiais: "Anjos da Vida Saúde" (regra Core).
- Datas comparadas via string `YYYY-MM-DD` para evitar fuso (regra Core).
- Permissões via matriz `role_permissions` com chaves novas: `checklist.manage` (admin) e `checklist.fill` (equipe/operacional). Admin/Gestor bypass.
- Toasts no canto superior direito (Sonner).
- Sem buckets para assinatura: já é base64 (não muda).

## Diagrama de Tabelas do Checklist

```text
checklist_categories 1───* checklist_items
                              │
checklist_submissions 1───* checklist_submission_items *───1 checklist_items
        │
        ├── profile_id (profiles)
        ├── base_id (bases)
        ├── vehicle_id (vehicles, opc.)
        └── event_id (events, opc.)
```

## Ordem de execução
1. Migration: tabelas do checklist + colunas de assinatura em `clinical_attendances` + RLS.
2. Páginas Admin/Equipe do Checklist + entrada no Sidebar.
3. Botão "Gerar Relatório em Excel" no PayrollReport (instalar `xlsx`).
4. Atualizar APHForm + APHSummary + PDF com campos CRM/COREN.
