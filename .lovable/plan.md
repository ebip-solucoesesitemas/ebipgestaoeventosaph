

# Fix: Status do evento exibido incorretamente nos "Próximos Eventos"

## Problema

Na linha 229 do `AdminDashboard.tsx`, o badge exibe `event.status` diretamente do banco de dados. O evento "CE Mundo Car Mais Shopping" está com status `em_andamento` no banco, mas a data de início é 21/03 — ainda não chegou. O dashboard simplesmente mostra o valor salvo sem calcular o status real baseado nas datas.

## Correção

No `AdminDashboard.tsx`, calcular o status de exibição dinamicamente baseado nas datas do evento, em vez de usar o campo `status` bruto do banco:

- Se `data_inicio` > agora → exibir "agendado"
- Se `data_inicio` <= agora e `data_fim` >= agora → exibir "em_andamento"
- Se `data_fim` < agora → exibir "finalizado"
- Caso contrário, usar o status do banco como fallback

| Arquivo | Alteração |
|---------|-----------|
| `src/components/AdminDashboard.tsx` | Adicionar função `getDisplayStatus` e usá-la na linha 229 em vez de `event.status` |

