

# Adicionar status "Aguardando finalização" para eventos com horário expirado

## Problema

Atualmente, quando o horário final de um evento passa, o sistema exibe automaticamente "Finalizado" em todas as telas — mesmo que a equipe ainda não tenha clicado em "Finalizar Evento". O status real no banco continua como `em_andamento`, mas a lógica visual no frontend calcula "Finalizado" baseado no relógio.

## Solução

Introduzir um status visual intermediário **"Aguardando Finalização"** (cor amarela/laranja) que aparece quando `now > data_fim` mas `event.status !== 'finalizado'`. O status "Finalizado" só será exibido quando o evento for formalmente finalizado via botão.

## Alterações

| Arquivo | O que muda |
|---------|-----------|
| `src/pages/admin/base/BaseEvents.tsx` | `getEventStatus`: quando `now > end` e `status !== 'finalizado'`, retornar "Aguardando Finalização" com cor warning |
| `src/pages/admin/Events.tsx` | Badge de status: adicionar caso para `now > data_fim` e `status !== 'finalizado'` mostrando "Aguardando Finalização" em vez de "Finalizado" |
| `src/pages/team/TeamEvents.tsx` | `getEventStatus`: retornar `'aguardando_finalizacao'` em vez de `'finalizado'` quando o evento não foi formalmente finalizado. Adicionar badge correspondente |
| `src/pages/admin/EventDetail.tsx` | Badge no header: mostrar "Aguardando Finalização" quando tempo expirado mas não finalizado |
| `src/pages/team/EventDetail.tsx` | Mesma lógica de badge no header da equipe |
| `src/components/AdminDashboard.tsx` | `displayStatus`: adicionar caso `'aguardando_finalizacao'` |
| `src/components/EventReport.tsx` | Adicionar label para o status intermediário |

## Lógica

```text
Se event.status === 'finalizado' → "Finalizado" (verde/cinza)
Se now < data_inicio                → "Agendado" (cinza)
Se now >= data_inicio e now <= data_fim → "Em andamento" (amarelo)
Se now > data_fim e status !== 'finalizado' → "Aguardando Finalização" (laranja pulsante)
```

Nenhuma alteração de banco é necessária — o status `em_andamento` permanece no banco até a equipe/admin clicar em "Finalizar Evento".

