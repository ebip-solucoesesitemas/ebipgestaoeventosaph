
# Plano de Melhorias — EBIP Eventos

## Status das Fases

| Fase | Melhoria | Status |
|------|----------|--------|
| 1 | Dashboard KPIs | ✅ Implementado |
| 2 | Exportação PDF | 🔜 Pendente |
| 3 | Histórico Profissional | 🔜 Pendente |
| 4 | Manutenção Viaturas | ❌ Removido (substituído por campo observação oficina) |
| 5 | Modo Escuro | ✅ Implementado |
| 6 | Variáveis Contrato | ✅ Já existia |
| — | Nota de oficina na viatura | ✅ Implementado |

## Auditoria de Segurança

| # | Correção | Status |
|---|----------|--------|
| 1 | AdminRoute — rotas /admin/* protegidas | ✅ Implementado |
| 2 | ProtectedRoute — rotas /events/* protegidas | ✅ Implementado |
| 3 | CORS restrito em create-user e delete-user | ✅ Implementado |
| 4 | CORS bootstrap-admin atualizado com domínios corretos | ✅ Implementado |
| 5 | Policy redundante `allow select events` removida | ✅ Implementado |
| 6 | Policy redundante `user can see own events` removida | ✅ Implementado |
| 7 | Idle timeout 30min com logout automático | ✅ Implementado |
| 8 | Utilitário de validação UUID criado | ✅ Implementado |
| 9 | Leaked Password Protection | ⚠️ Requer configuração manual |
