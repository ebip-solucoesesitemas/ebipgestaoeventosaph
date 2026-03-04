# Plano: Relatório Offline de Evento + Telefone de Profissionais

## Resumo

Criar uma funcionalidade de "Gerar Relatório" para eventos, que gere uma página imprimível (print-friendly) com todos os dados do evento para uso offline. Também adicionar campo `telefone` na tabela `profiles` e exibi-lo nas telas relevantes.

---

## Parte 1: Adicionar telefone aos profissionais

### 1.1 Migração de banco de dados

- Adicionar coluna `telefone TEXT` (nullable) na tabela `profiles`

### 1.2 Atualizar tela de Cadastro de Usuários (`src/pages/admin/Users.tsx`)

- Adicionar campo "Telefone" no formulário de criação/edição de profissionais

### 1.3 Exibir telefone nas telas existentes

- **Admin EventDetail** (`src/pages/admin/EventDetail.tsx`): mostrar telefone dos profissionais na lista de equipe escalada
- **Team EventDetail** (`src/pages/team/EventDetail.tsx`): mostrar telefone dos membros da equipe
- **Admin Professionals** (`src/pages/admin/Professionals.tsx`): mostrar telefone na listagem

---

## Parte 2: Relatório offline do evento

### 2.1 Criar componente `EventReport` (`src/components/EventReport.tsx`)

Uma página de relatório imprimível (usando `window.print()` com CSS `@media print`) contendo:

**Cabeçalho:**

- Logo/nome "Anjos da Vida Saúde"
- Data de geração do relatório

**Dados do Evento:**

- Nome do evento
- Localização
- Data/hora início e fim
- Horário de saída da base
- Status

**Viatura:**

- Prefixo, modelo, placa
- KM inicial e final, KM total

**Cliente** (via `event_budgets`):

- Nome do cliente
- Telefone de contato
- Endereço

**Equipe Escalada:**

- Nome, especialidade, registro profissional, **telefone**
- Horário de check-in e checkout

**Assinaturas:**

- Campo para prencimento manual
- Nome do responsável  
Precisa ter na chegada da equipe e na saida tambem
  &nbsp;

### 2.2 Adicionar botão "Gerar Relatório" nas páginas de detalhe do evento

- Em `src/pages/admin/EventDetail.tsx`: botão que abre o relatório em nova aba/janela
- Em `src/pages/team/EventDetail.tsx`: botão similar

### 2.3 Rota para o relatório

- Criar rota `/evento/:id/relatorio` em `src/App.tsx` apontando para uma página wrapper que renderiza o `EventReport` com layout otimizado para impressão (sem sidebar/header)

### 2.4 Estilos de impressão

- CSS `@media print` para esconder navegação, formatar tabelas, e garantir que o relatório fique legível em papel A4  
Não pode ser print da tela

---

## Dados buscados no relatório

O componente `EventReport` fará queries para:

1. `events` + `vehicles` - dados do evento e viatura
2. `event_assignments` + `profiles` (incluindo telefone) - equipe
3. `event_signatures` - assinaturas
4. `event_budgets` + `clients` - dados do cliente (nome, telefone, endereço)

---

## Arquivos a criar/modificar


| Arquivo                           | Ação                                 |
| --------------------------------- | ------------------------------------ |
| Migration SQL                     | Adicionar `telefone` em `profiles`   |
| `src/pages/admin/Users.tsx`       | Campo telefone no form               |
| `src/pages/admin/EventDetail.tsx` | Telefone na equipe + botão relatório |
| `src/pages/team/EventDetail.tsx`  | Telefone na equipe + botão relatório |
| `src/components/EventReport.tsx`  | **Novo** - componente do relatório   |
| `src/pages/EventReportPage.tsx`   | **Novo** - página wrapper sem layout |
| `src/App.tsx`                     | Nova rota `/evento/:id/relatorio`    |
