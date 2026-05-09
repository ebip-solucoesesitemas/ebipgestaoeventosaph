## Problemas identificados

**1. Erro "Could not find a relationship between 'checklist_submissions' and 'profile_id'"**
As tabelas de checklist foram criadas **sem foreign keys** (ver `<foreign-keys>No foreign keys</foreign-keys>` em `checklist_submissions`, `checklist_submission_items`, `checklist_items`, `checklist_categories`). Por isso o PostgREST não consegue resolver os joins implícitos `profiles(...)`, `events(...)`, `vehicles(...)`, `checklist_submission_items(...)` usados em `ChecklistManagement.tsx` e `TeamChecklist.tsx`.

**2. "Vinculado a evento" não lista eventos**
Hoje só busca via `event_assignments` (membro escalado). Quando o usuário é o **responsável pela conta do evento** (`events.user_id`), ele não aparece. Precisa unir as duas fontes.

**3. Falta um checklist específico de viatura (lataria, óleo, pneus, etc.)**
Hoje o checklist é genérico de itens médicos. O socorrista/condutor precisa conferir a viatura também antes de sair.

---

## Plano

### 1. Migration — corrigir relacionamentos e adicionar checklist de viatura

```sql
-- Foreign keys que estão faltando (causa do erro do PostgREST)
ALTER TABLE checklist_categories
  ADD CONSTRAINT checklist_categories_base_fk
  FOREIGN KEY (base_id) REFERENCES bases(id) ON DELETE SET NULL;

ALTER TABLE checklist_items
  ADD CONSTRAINT checklist_items_category_fk
  FOREIGN KEY (category_id) REFERENCES checklist_categories(id) ON DELETE CASCADE;

ALTER TABLE checklist_submissions
  ADD CONSTRAINT checklist_submissions_profile_fk
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT checklist_submissions_event_fk
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL,
  ADD CONSTRAINT checklist_submissions_vehicle_fk
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL,
  ADD CONSTRAINT checklist_submissions_base_fk
    FOREIGN KEY (base_id) REFERENCES bases(id) ON DELETE SET NULL;

ALTER TABLE checklist_submission_items
  ADD CONSTRAINT csi_submission_fk
    FOREIGN KEY (submission_id) REFERENCES checklist_submissions(id) ON DELETE CASCADE,
  ADD CONSTRAINT csi_item_fk
    FOREIGN KEY (item_id) REFERENCES checklist_items(id) ON DELETE CASCADE;

-- Diferenciar checklist médico vs. viatura
ALTER TABLE checklist_categories
  ADD COLUMN escopo text NOT NULL DEFAULT 'medico';
  -- valores: 'medico' (kit médico/ambulância — itens com qtd) | 'viatura' (condições da viatura — OK/NOK)

ALTER TABLE checklist_items
  ADD COLUMN tipo_resposta text NOT NULL DEFAULT 'quantidade';
  -- valores: 'quantidade' (qtd ideal vs atual) | 'condicao' (OK / NOK / N/A com observação)

ALTER TABLE checklist_submission_items
  ADD COLUMN observacao text;
```

### 2. `TeamChecklist.tsx` — corrigir lista de eventos e suportar dois escopos

- **Eventos do usuário**: unir `event_assignments` (escalado) **+** `events` onde `user_id = auth.uid()` (responsável pela conta), filtrando `agendado`/`em_andamento`. Deduplicar por `id`.
- **Seletor de Escopo do checklist** (após escolher Tipo): `Kit Médico` ou `Viatura`. Filtra categorias por `escopo`.
- **Renderização condicional dos itens**:
  - `tipo_resposta = 'quantidade'`: mantém UI atual (OK / qtd / falta).
  - `tipo_resposta = 'condicao'`: três botões (OK / NOK / N/A) + campo de observação opcional. Status salvo: `ok` | `divergente` (NOK) | `falta` mapeado para compatibilidade — ou estender enum se preferir, mas manter `text` evita migração de dados.
- Quando "Vinculado a evento", manter auto-fill da viatura.

### 3. `ChecklistManagement.tsx`

- **Aba Categorias e Itens**: adicionar seletor `Escopo` (Médico / Viatura) ao criar categoria; ao criar item, expor seletor `Tipo de resposta` (Quantidade / Condição). Mostrar badge do escopo na lista.
- **Aba Histórico**: filtro adicional por **Escopo** (Médico / Viatura / Todos). Tabela e PDF passam a mostrar coluna "Escopo" e, quando `condicao`, exibir OK/NOK/NA + observação no detalhe.
- Após adicionar as FKs, os joins `profiles(...)`, `events(...)`, `vehicles(...)`, `checklist_submission_items(checklist_items(checklist_categories(...)))` voltam a funcionar — erro do print desaparece.

### 4. Sementes opcionais (apenas se a base não tem itens de viatura)

Inserir 1 categoria modelo "Viatura — Inspeção do Condutor" (escopo `viatura`) com itens condicionais: Lataria, Pneus, Óleo do motor, Água do radiador, Combustível, Faróis, Sirene/Giroflex, Cinto de segurança, Extintor, Macaco/estepe. **Confirmar com o usuário antes de semear** para evitar duplicar caso já vá cadastrar manualmente por base.

---

## Detalhes técnicos

- Tudo continua client-side; sem novas rotas.
- RLS atual já cobre os novos campos (sem mudança de policies).
- `src/integrations/supabase/types.ts` será regenerado automaticamente após a migration.
- Datas e cents continuam seguindo as Core rules.

## Ordem de execução

1. Migration (FKs + colunas `escopo`/`tipo_resposta`/`observacao`).
2. `TeamChecklist.tsx`: incluir eventos onde `user_id = auth.uid()` + escopo + UI condicional.
3. `ChecklistManagement.tsx`: cadastro com escopo/tipo_resposta + filtro/exibição no histórico.
4. (Opcional) seed da categoria "Viatura — Inspeção do Condutor".
