

# Plano: Criar Telas Filtradas por Base

## Contexto

A sidebar ja possui os links para `/admin/base/:baseId/events`, `/admin/base/:baseId/professionals`, `/admin/base/:baseId/vehicles` e `/admin/base/:baseId/finance`, mas as paginas nao existem. Ao clicar nesses links, o usuario ve uma pagina 404.

## Abordagem

Criar 4 paginas dedicadas que filtram os dados pela base selecionada. A tabela `events` ja possui `base_id`, e `event_budgets` tambem. Para profissionais e viaturas, a filtragem sera feita atraves dos eventos associados a base.

Alem disso, sera necessario adicionar uma coluna `base_id` na tabela `vehicles` para permitir que viaturas sejam vinculadas diretamente a uma base (uma ambulancia normalmente fica estacionada em uma base especifica).

## Paginas a Criar

### 1. Eventos da Base (`src/pages/admin/base/BaseEvents.tsx`)
- Extrai `baseId` da URL via `useParams`
- Busca o nome da base para exibir no titulo
- Lista eventos filtrados por `base_id`
- Permite criar novos eventos ja vinculados a base
- Permite editar e excluir eventos
- Link para detalhes do evento

### 2. Profissionais da Base (`src/pages/admin/base/BaseProfessionals.tsx`)
- Lista profissionais que ja foram escalados para eventos dessa base
- Busca via join: `event_assignments` -> `events` (filtrado por `base_id`) -> `profiles`
- Exibe cards com nome, especialidade, cargo e quantidade de eventos na base
- Visualizacao somente (o cadastro de profissionais continua na tela global)

### 3. Viaturas da Base (`src/pages/admin/base/BaseVehicles.tsx`)
- Lista viaturas vinculadas a base (via nova coluna `base_id` na tabela `vehicles`)
- Permite vincular/desvincular viaturas da base
- Exibe status atual de cada viatura
- Mostra evento atual se a viatura estiver empenhada

### 4. Financeiro da Base (`src/pages/admin/base/BaseFinance.tsx`)
- Lista orcamentos filtrados por `base_id`
- Resumo financeiro (receitas, despesas, saldo) apenas dos eventos da base
- Mesma estrutura da tela financeira global, porem filtrada

## Migracao SQL

Adicionar coluna `base_id` na tabela `vehicles` com foreign key para `bases`:

```text
ALTER TABLE vehicles ADD COLUMN base_id UUID REFERENCES bases(id);
```

Isso permite vincular viaturas diretamente a uma base.

## Rotas a Adicionar em `App.tsx`

```text
/admin/base/:baseId/events       -> BaseEvents
/admin/base/:baseId/professionals -> BaseProfessionals
/admin/base/:baseId/vehicles     -> BaseVehicles
/admin/base/:baseId/finance      -> BaseFinance
```

## Arquivos

| Arquivo | Acao |
|---------|------|
| `src/pages/admin/base/BaseEvents.tsx` | NOVO - Eventos filtrados por base |
| `src/pages/admin/base/BaseProfessionals.tsx` | NOVO - Profissionais da base |
| `src/pages/admin/base/BaseVehicles.tsx` | NOVO - Viaturas da base |
| `src/pages/admin/base/BaseFinance.tsx` | NOVO - Financeiro da base |
| `src/App.tsx` | Adicionar 4 novas rotas |
| `supabase/migrations/...` | Adicionar `base_id` a tabela `vehicles` |

## Detalhes Tecnicos

- Cada pagina usa `useParams<{ baseId: string }>()` para obter o ID da base
- Todas as paginas fazem fetch do nome/sigla da base para exibir no header (ex: "Eventos - FLN Florianopolis")
- Botao de voltar navega para `/admin/events` ou a pagina global correspondente
- Reutiliza os mesmos componentes UI (Card, Badge, Dialog, etc.) para manter consistencia visual
- A tela de Profissionais da Base e somente leitura (lista quem ja trabalhou nessa base)
- A tela de Viaturas permite atribuir uma viatura a base via select

