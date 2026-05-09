
## Objetivo

Transformar o checklist de "diário por usuário" em "um checklist por evento/viatura", com possibilidade de salvar como rascunho durante o evento, registrar intercorrências e finalizar somente após o término. O alerta deve reaparecer automaticamente sempre que a equipe iniciar um novo evento sem checklist.

## Comportamento esperado

1. **Alerta por evento (não mais por dia)**
   - Ao entrar no app, verificar todos os eventos do dia em que o usuário está escalado (ou é responsável) e que ainda **não possuem** um checklist finalizado.
   - Para cada evento pendente, exibir o popup "Conferência de Checklist" indicando o nome do evento e a viatura.
   - Quando o primeiro evento finalizar e o próximo começar, o popup reaparece automaticamente para o segundo checklist.

2. **Salvar como rascunho**
   - Botão **"Salvar rascunho"** no formulário de checklist: grava as respostas, assinatura e dados do responsável, mas mantém status `rascunho`.
   - Ao reabrir o checklist do mesmo evento, as respostas anteriores são carregadas para edição.
   - Botão **"Finalizar checklist"** só fica habilitado após o evento estar `finalizado` (ou pode ser usado durante, mas com confirmação) — define status `finalizado` e bloqueia novas edições.

3. **Campo de intercorrências**
   - Novo campo de texto livre **"Intercorrências durante o evento"** dentro do formulário, visível durante todo o ciclo (rascunho e finalização).
   - Permite descrever, por exemplo, problemas com a viatura, materiais danificados etc.
   - Aparece nos detalhes do histórico admin e no PDF gerado.

4. **Histórico**
   - Lista de checklists passa a mostrar: evento vinculado, viatura, status (Rascunho / Finalizado) e intercorrências (se houver).

## Mudanças técnicas

### Banco de dados (migração)
Tabela `checklist_submissions`:
- Adicionar coluna `status` (text, default `'rascunho'`, valores: `rascunho`, `finalizado`, `nao_realizado`).
- Adicionar coluna `intercorrencias` (text, nullable).
- Garantir índice/regras para que cada `(event_id, profile_id)` tenha no máximo um checklist em rascunho/finalizado (constraint única parcial).
- `event_id` e `vehicle_id` já existem na tabela.

### `ChecklistReminderDialog.tsx`
- Substituir consulta "checklist hoje" por:
  - Buscar eventos do usuário (assignments + eventos onde ele é `user_id`) com `data_inicio` no dia atual e status diferente de `cancelado`.
  - Filtrar os que ainda não têm `checklist_submissions` com status `finalizado` (rascunho ainda exige conclusão).
- Para cada pendente, mostrar popup com nome do evento e botão "Fazer checklist agora" que navega para `/checklist?event_id=...`.
- Se houver mais de um pendente, processa em fila (próximo aparece após fechar o anterior).

### `TeamChecklist.tsx`
- Aceitar `event_id` via query string e pré-selecionar o evento/viatura.
- Carregar rascunho existente do evento (se houver) e popular respostas, intercorrências, nome/cargo e assinatura.
- Adicionar:
  - Campo Textarea **Intercorrências**.
  - Botão **Salvar rascunho** (sempre disponível).
  - Botão **Finalizar checklist** (habilitado quando o evento já está `finalizado`, ou com diálogo de confirmação se feito antes).
- Ao salvar: faz `upsert` em `checklist_submissions` por `(event_id, profile_id)` e substitui os `checklist_submission_items`.

### `ChecklistManagement.tsx` (admin)
- Mostrar coluna **Status** (Rascunho/Finalizado) e o evento vinculado.
- Exibir **Intercorrências** no detalhe e no PDF.
- Filtro opcional por status.

## Pontos a confirmar

- **Quando o checklist deve ser obrigatoriamente finalizado?** Sugestão: bloquear o checkout final da equipe enquanto o checklist do evento estiver em rascunho. Confirmar se concorda ou se prefere apenas um aviso visual.
- **Permissão de edição do rascunho:** somente o profissional que criou pode editar, ou qualquer membro da equipe escalada para o evento? Sugestão: qualquer membro escalado, com nome/assinatura sendo de quem finalizar.
