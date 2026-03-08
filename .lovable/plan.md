

# Toast no Canto Superior Direito + Título do Chamado nas Mensagens

## Problema
1. Os toasts do Sonner aparecem no canto inferior (padrão) — precisam aparecer no canto **superior direito**
2. A notificação de nova mensagem mostra "Nova mensagem em um chamado" genérico — precisa mostrar o **título do chamado**

## Mudanças

### 1. `src/components/ui/sonner.tsx`
- Adicionar `position="top-right"` no componente `<Sonner>`

### 2. `src/components/TicketNotifications.tsx`
- No handler de `ticket_messages`, buscar o ticket correspondente (`ticket_id`) para obter o `title` e `ticket_number`
- Alterar a mensagem para: `"Nova mensagem no chamado #X: {título}"`

| Arquivo | Ação |
|---------|------|
| `src/components/ui/sonner.tsx` | Adicionar `position="top-right"` |
| `src/components/TicketNotifications.tsx` | Buscar título do ticket na notificação de mensagem |

