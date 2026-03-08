

# Realtime para Chamados + Notificações Globais

## Problema
1. As mensagens do chamado não atualizam em tempo real (o realtime subscription existe mas pode falhar silenciosamente)
2. Não existe notificação global quando um novo chamado é criado ou uma nova mensagem é recebida

## Solução

### 1. Habilitar Realtime para `support_tickets` (migration)
A tabela `support_tickets` não está na publicação realtime. Adicionar:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
```

### 2. Criar componente global `TicketNotifications.tsx`
Componente montado no `App.tsx` (dentro do `AuthProvider`, fora das rotas) que:
- Escuta realtime de `INSERT` em `support_tickets` e `ticket_messages`
- Quando recebe evento, exibe toast no canto superior direito com:
  - Novo chamado: "Novo chamado #X: {título}"
  - Nova mensagem: "Nova mensagem no chamado #X"
- Ignora eventos do próprio usuário (`created_by !== user.id` / `user_id !== user.id`)
- Só ativa se o usuário estiver autenticado

### 3. Melhorar realtime na página de mensagens (`SupportTickets.tsx`)
- Adicionar polling fallback (a cada 5s quando o dialog está aberto) como safety net
- Garantir que `loadMessages()` é chamado após envio + pelo realtime + pelo polling

### Arquivos

| Arquivo | Ação |
|---------|------|
| Migration SQL | Adicionar `support_tickets` ao realtime |
| `src/components/TicketNotifications.tsx` | **CRIAR** — listener global com toasts |
| `src/App.tsx` | Montar `TicketNotifications` dentro do AuthProvider |
| `src/pages/SupportTickets.tsx` | Adicionar polling fallback para mensagens |

