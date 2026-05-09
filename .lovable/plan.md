## Objetivo

1. **Checklists por base**: cada base tem suas próprias categorias e itens.
2. **Vincular submission a evento + viatura** (com base derivada do evento).
3. **Aba Histórico no admin** com filtros (data, profissional, evento, base).

---

## 1. Banco de dados — escopo por base

Migration:
- Adicionar `base_id uuid` em `checklist_categories` (nullable inicialmente para compatibilidade; depois exigir).
- Index em `checklist_categories(base_id)`.
- Atualizar RLS:
  - **Leitura** de `checklist_categories` e `checklist_items`: autenticados podem ver apenas itens da própria `base_id` (do profile) **OU** `is_admin()` vê tudo.
  - **Escrita**: `is_admin()` (admin/gestor/operacional). Operacional já é restrito por base na UI.
- `checklist_items` herda a base via `category_id` (sem coluna duplicada).

---

## 2. Admin — Gestão por Base (`ChecklistManagement.tsx`)

Refatorar em **Tabs**:

### Aba "Categorias e Itens"
- **Seletor de Base** no topo (admin/gestor: todas as bases; operacional: trava na própria).
- CRUD de categorias e itens **filtrado pela base selecionada**. Ao criar categoria, gravar `base_id` da base ativa.
- Indicador visual ("Editando checklist da Base X").

### Aba "Histórico de Conferências"
- Filtros: Base (Select), Intervalo de datas (De/Até via Popover+Calendar, comparação `YYYY-MM-DD`), Profissional, Evento, Tipo (Diário/Evento/Todos).
- Tabela: Data/Hora | Profissional | Base | Tipo | Evento | Viatura | Total | OK | Divergente | Falta | Ações.
- Dialog de detalhe com itens agrupados por categoria + badges de status + botão **Baixar PDF** (`jsPDF + autoTable`, cabeçalho "Anjos da Vida Saúde").

Query:
```ts
supabase.from('checklist_submissions').select(`
  *, profiles(nome, especialidade, bases(nome)),
  events(nome_evento), vehicles(prefixo, placa),
  checklist_submission_items(status, quantidade_atual,
    checklist_items(nome, quantidade_ideal, unidade,
      checklist_categories(nome, base_id)))
`).order('created_at', { ascending: false })
```
Filtro de base aplicado client-side via `profiles.base_id` ou `checklist_categories.base_id`.

---

## 3. Profissional — Preenchimento (`TeamChecklist.tsx`)

- Buscar categorias/itens **apenas da base do profissional** (`profile.base_id`).
- Adicionar **seletor de Tipo**: `Diário (base)` ou `Vinculado a Evento`.
- Quando "Vinculado a Evento":
  - Select de evento (eventos do profissional ativos: `agendado`/`em_andamento` da sua base).
  - Auto-preenche `vehicle_id` com `events.viatura_id` (somente leitura, mostra prefixo/placa).
  - Salvar `event_id`, `vehicle_id`, `tipo='evento'`.
- Quando "Diário": Select opcional de viatura (viaturas da base). Salvar `tipo='diario'`.
- Histórico pessoal continua mostrando últimas 5.

---

## 4. Detalhes técnicos

- Datas via string `YYYY-MM-DD` (regra Core).
- Toasts Sonner top-right.
- Componentes shadcn já presentes: `Tabs`, `Dialog`, `Select`, `Popover`, `Calendar`, `Table`, `Badge`.
- PDF: `jsPDF + jspdf-autotable` (já instalado).
- Sem mudanças em sidebar/rotas — tudo dentro de `/admin/checklist` e `/team/checklist`.

## Ordem de execução

1. Migration: `ALTER TABLE checklist_categories ADD COLUMN base_id` + atualizar RLS de leitura para filtrar por base do profile.
2. `ChecklistManagement.tsx`: Tabs + seletor de Base na aba "Categorias e Itens".
3. `TeamChecklist.tsx`: filtrar por `base_id`, adicionar tipo + evento + viatura.
4. Aba "Histórico" com filtros, tabela, dialog e PDF.
