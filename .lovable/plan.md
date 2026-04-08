# Plano Consolidado: Evolução Médica, Evento Cancelado Vermelho, Responsável do Evento e Avisos com Confirmação

## Visão Geral

Quatro funcionalidades em uma entrega:

1. Campo "Evolução Médica" separado da "Evolução Clínica" na ficha APH
2. Eventos cancelados em destaque vermelho nas listagens
3. Campo "Responsável do Evento" (texto livre) no formulário de evento
4. Avisos do sistema com tipo (melhoria/alteração vs aviso comum) — melhoria/alteração exige popup de confirmação dos usuários

---

## 1. Migrações SQL

```sql
-- Evolução médica na ficha APH
ALTER TABLE clinical_attendances ADD COLUMN evolucao_medica TEXT;

-- Responsável do evento
ALTER TABLE events ADD COLUMN responsavel_evento TEXT;

-- Tipo do aviso (aviso comum ou melhoria/alteração)
ALTER TABLE system_notices ADD COLUMN tipo TEXT NOT NULL DEFAULT 'aviso';

-- Tabela de confirmações dos usuários para avisos tipo melhoria/alteração
CREATE TABLE notice_acknowledgements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notice_id UUID NOT NULL REFERENCES system_notices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(notice_id, user_id)
);

ALTER TABLE notice_acknowledgements ENABLE ROW LEVEL SECURITY;

-- Usuários podem inserir e ver suas próprias confirmações
CREATE POLICY "Users can insert own ack"
  ON notice_acknowledgements FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own ack"
  ON notice_acknowledgements FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Admins podem ver todas
CREATE POLICY "Admins can view all acks"
  ON notice_acknowledgements FOR SELECT TO authenticated
  USING (is_admin());
```

## 2. Campo Evolução Médica — APH

`**src/components/APHForm.tsx**`:

- Adicionar state `evolucaoMedica`
- No `loadAttendance`, carregar `evolucao_medica` do banco
- No `savePatientData`, incluir `evolucao_medica: evolucaoMedica` no objeto
- No step `evolution`, renderizar dois campos Textarea:
  - "Evolução Clínica (Enfermagem)" — campo existente
  - "Evolução Médica" — novo campo abaixo

`**src/components/APHSummary.tsx**`:

- Exibir seção "EVOLUÇÃO MÉDICA" separada, abaixo da evolução clínica existente

## 3. Evento Cancelado em Vermelho

`**src/pages/admin/Events.tsx**` (linha ~1050):

- Adicionar condição `event.status === 'cancelado'` antes das demais no bloco de badges
- Badge vermelha: `<Badge className="bg-red-600 text-white">Cancelado</Badge>`
- Borda vermelha no Card: `className={... event.status === 'cancelado' ? 'border-red-500 bg-red-50/50' : ''}`

`**src/pages/admin/base/BaseEvents.tsx**`: mesma lógica visual

`**src/pages/team/TeamEvents.tsx**`: badge vermelho para cancelados

`**src/pages/team/EventDetail.tsx**`: banner vermelho no topo se cancelado

## 4. Campo Responsável do Evento

`**src/pages/admin/Events.tsx**`:

- Adicionar `responsavel_evento: ""` no `formData`
- Input texto "Responsável do Evento" no formulário (abaixo de "Conta Responsável")
- Incluir no `eventData` ao salvar
- Carregar em `openEditDialog` e `duplicateEvent`
- Exibir no card da listagem se preenchido

`**src/pages/admin/base/BaseEvents.tsx**`: mesmo campo no form e exibição

`**src/pages/team/TeamEvents.tsx**`: exibir responsável no card

`**src/pages/team/EventDetail.tsx**`: exibir responsável com destaque

## 5. Avisos do Sistema com Tipo e Confirmação

`**src/pages/admin/SystemNotices.tsx**` (tela do super-admin):

- Adicionar Select de tipo: "Aviso Comum" ou "Melhoria/Alteração"
- Enviar `tipo` no insert (`'aviso'` ou `'melhoria'`)
- No histórico, exibir badge indicando o tipo

`**src/components/SystemBanner.tsx**` (banner global):

- Buscar campo `tipo` junto com o aviso
- Se `tipo === 'melhoria'` e aviso ativo:
  - Verificar em `notice_acknowledgements` se o usuário já confirmou
  - Se **não** confirmou: exibir Dialog/popup com a mensagem + checkbox "Estou ciente das alterações" + botão Confirmar
  - Ao confirmar: inserir em `notice_acknowledgements` e fechar popup
  - O banner continua visível normalmente (apenas o popup some após confirmação)
- Se `tipo === 'aviso'`: comportamento atual (só banner, sem popup)  
  
  
Preciso que tome cuidado para não quebrar o sistema em hipótese alguma.

## Arquivos alterados


| Arquivo                | Alteração                           |
| ---------------------- | ----------------------------------- |
| Migração SQL           | 2 colunas + 1 tabela nova           |
| `APHForm.tsx`          | Novo campo evolução médica          |
| `APHSummary.tsx`       | Exibir evolução médica              |
| `Events.tsx`           | Responsável + visual cancelado      |
| `BaseEvents.tsx`       | Responsável + visual cancelado      |
| `TeamEvents.tsx`       | Responsável + visual cancelado      |
| `team/EventDetail.tsx` | Responsável + banner cancelado      |
| `SystemNotices.tsx`    | Seletor de tipo do aviso            |
| `SystemBanner.tsx`     | Popup de confirmação para melhorias |
