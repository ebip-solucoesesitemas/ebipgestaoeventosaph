# Correções e melhorias: Cargo, Filtros, Assinatura, Segurança e Edição de Eventos

## 1. Bug: Cargo não salva ao editar usuário

**Diagnóstico**: Preciso investigar se o RLS está bloqueando silenciosamente ou se é um problema de UI. Vou adicionar tratamento de erro mais robusto e logs. Se o RLS estiver interferindo, ajusto a política.

**Arquivo**: `src/pages/admin/Users.tsx` — melhorar tratamento de erros no updateMutation para detectar falhas silenciosas.

## 2. Bug: Filtro por data mostra dia errado

**Causa raiz**: `new Date("2026-03-21")` é interpretado como UTC midnight. No fuso horário do Brasil (UTC-3), `getDate()` retorna 20 em vez de 21. Por isso pesquisar "21" não encontra o evento do dia 21, mas pesquisar "22" encontra.

**Correção**: Extrair ano/mês/dia do filterDate como strings (`split("-")`) em vez de usar `new Date()`.

**Arquivos**: `src/pages/admin/Events.tsx`, `src/pages/admin/base/BaseEvents.tsx`

## 3. Bug: Erro "signal is aborted without reason" na assinatura

**Causa**: O upload do blob para o Storage pode ser abortado em dispositivos móveis (timeout de rede ou tamanho do canvas). 

**Correção**: 

- Reduzir qualidade/tamanho da imagem da assinatura
- Adicionar retry no upload com tratamento de AbortError
- Usar `toDataURL("image/png", 0.5)` para comprimir

**Arquivo**: `src/components/EventSignature.tsx`

## 4. CRÍTICO: Vulnerabilidade de segurança — `hidden` sem proteção

**Problema**: A política "Users can update their own profile" restringe alteração de `cargo` e `is_account_only`, mas **NÃO** restringe `hidden`. Qualquer usuário pode setar `hidden = true` no próprio perfil e obter privilégios de Super-Admin.

**Correção**: Adicionar `AND (hidden = (SELECT p.hidden FROM profiles p WHERE p.user_id = auth.uid() LIMIT 1))` ao WITH CHECK da política de UPDATE.

**Arquivo**: Nova migration SQL

## 5. Admin/Gestor pode editar todos os dados do evento finalizado

**Problema**: Se a equipe esqueceu de fazer checkin/checkout/finalizar, o horário continua contando. Admin/Gestor precisa poder editar datas, checkin/checkout e finalizar manualmente.

**Correção**: 

- Adicionar botão "Editar Evento" no `EventDetail.tsx` admin que permite alterar `data_inicio`, `data_fim`, status
- Permitir admin fazer checkin/checkout manual dos profissionais
- Quando admin edita `data_fim`, recalcular horas corretamente

**Arquivo**: `src/pages/admin/EventDetail.tsx`

## 6. Sombra/tamanho do formulário de cadastro de evento

**Correção**: Ajustar classes CSS do `DialogContent` para remover sombra excessiva.

**Arquivo**: `src/pages/admin/Events.tsx`

## 7. Filtro de busca na tela de Profissionais

**Correção**: Adicionar campo de busca por nome no topo da listagem, tanto dentro quanto fora da base.

**Arquivos**: `src/pages/admin/Professionals.tsx`, `src/pages/admin/base/BaseProfessionals.tsx`

## Resumo de arquivos


| Arquivo                                      | Alteração                                                                                |
| -------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Migration SQL                                | Corrigir WITH CHECK da política profiles UPDATE (proteger `hidden`)                      |
| `src/pages/admin/Users.tsx`                  | Melhorar debug de falha na atualização de cargo                                          |
| `src/pages/admin/Events.tsx`                 | Corrigir filtro de data (timezone), ajustar CSS do dialog                                |
| `src/pages/admin/base/BaseEvents.tsx`        | Corrigir filtro de data (timezone)                                                       |
| `src/components/EventSignature.tsx`          | Retry no upload, reduzir tamanho da imagem                                               |
| `src/pages/admin/EventDetail.tsx`            | Edição completa de evento (datas, checkin/checkout manual, dados)                        |
| `src/pages/admin/Professionals.tsx`          | Filtro de busca por nome                                                                 |
| `src/pages/admin/base/BaseProfessionals.tsx` | Filtro de busca por nome So cuidar para não quebrar o sistema em nenhuma parte funcional |
