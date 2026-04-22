

# Plano: Tela de Atendimentos Clínicos com filtros e exportação

## Objetivo
Criar uma nova tela centralizada que lista **todos os atendimentos APH realizados nos eventos**, com filtros avançados, estatísticas e exportação — disponível em todas as bases.

## Estrutura

### 1. Nova rota e página
- **Rota:** `/admin/base/:baseId/atendimentos`
- **Arquivo novo:** `src/pages/admin/base/BaseAtendimentos.tsx`
- Registrar no `src/App.tsx`
- Adicionar link no sidebar (`AppSidebar.tsx`) dentro do grupo de cada base, com ícone `HeartPulse` e label "Atendimentos"

### 2. Dados consultados
Tabela `clinical_attendances` com JOIN em:
- `events` (nome do evento, data, base_id) — filtra pela base via `event.base_id`
- `profiles` (nome do profissional que atendeu)
- `vital_signs` (contagem) e `signatures` (para indicador de finalizado)

### 3. Filtros disponíveis (no topo da tela)
- **Busca por nome do paciente** (input texto, debounced)
- **Busca por nome do evento** (input texto)
- **Data específica** (date picker — dia exato)
- **Mês** (select — Janeiro a Dezembro + "Todos")
- **Ano** (select — últimos 3 anos + "Todos")
- **Status** (select — Em andamento, Em remoção, Finalizado, Todos)
- **Profissional responsável** (select dinâmico)
- Botão **"Limpar filtros"**

### 4. Cards de estatísticas (topo)
Painel resumo com a seleção atual:
- Total de atendimentos
- Em andamento (badge amarelo)
- Em remoção (badge laranja pulsante)
- Finalizados (badge verde)
- Total de remoções hospitalares no período

### 5. Lista de atendimentos (tabela responsiva)
Colunas: Data/Hora · Paciente · Idade/Sexo · Queixa Principal · Evento · Profissional · Status (badge colorido) · Ações

**Ações por linha:**
- 👁 Ver detalhes (abre dialog com `APHSummary` reutilizado — todos os dados, sinais vitais, evoluções, assinaturas)
- 📄 Exportar PDF individual do atendimento

Paginação: 20 por página.

### 6. Recurso "extremamente profissional" (diferencial)
**Exportação consolidada + Dashboard analítico:**

a) **Botão "Exportar Relatório PDF"** — gera PDF consolidado com:
   - Cabeçalho "Anjos da Vida Saúde" + período filtrado + base
   - Estatísticas resumidas
   - Tabela completa dos atendimentos filtrados
   - Reutiliza `generatePDF` de `src/lib/pdf.ts` (mesmo padrão da Folha de Pagamento)

b) **Botão "Exportar CSV"** — para análise externa em Excel

c) **Mini-dashboard expansível** (collapsible) com:
   - Top 5 queixas mais frequentes (lista ranqueada)
   - Distribuição por desfecho (alta no local / remoção hospitalar / recusa)
   - Hospitais de destino mais utilizados
   - Profissional com mais atendimentos no período
   
   Calculado client-side a partir dos resultados filtrados.

### 7. Permissões
- Já protegido por `AdminRoute` (admin/gestor/operacional)
- `Operacional` vê apenas atendimentos de eventos da própria base (filtro server-side por `base_id`)
- Item do menu controlado pela permission `events.view` (já existente)

## Arquivos alterados/criados
| Arquivo | Mudança |
|---------|---------|
| `src/pages/admin/base/BaseAtendimentos.tsx` | **Novo** — tela completa |
| `src/App.tsx` | Adicionar rota `/admin/base/:baseId/atendimentos` |
| `src/components/AppSidebar.tsx` | Adicionar link "Atendimentos" no `getBaseLinks` |

## Detalhes técnicos
- Query única com `select('*, events!inner(nome_evento, data_inicio, base_id), profiles(nome)')` filtrando `events.base_id=eq.<baseId>`
- Filtros de data via string YYYY-MM-DD para evitar problemas de fuso horário (regra Core)
- Dialog de detalhes reusa o componente `APHSummary` existente
- PDF segue o mesmo padrão visual do `PayrollReport` (cabeçalho "Anjos da Vida Saúde")
- Status colors: `em_andamento`=amarelo, `em_remocao`=laranja pulsante, `finalizado`=verde

