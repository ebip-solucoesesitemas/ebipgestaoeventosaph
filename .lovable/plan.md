

# Plano: Botão "Voltar" usando navegação do histórico do browser

## Problema
Todos os botões de voltar usam rotas fixas (ex: `navigate('/admin/events')`), então ao acessar um evento a partir de uma base específica (`/admin/base/:id/events`), o botão volta para `/admin/events` ao invés da tela anterior.

## Solução
Trocar `navigate('/rota/fixa')` por `navigate(-1)` em todos os botões de voltar. Isso usa o histórico do browser para retornar à tela anterior, independente de onde o usuário veio.

## Arquivos alterados

| Arquivo | Linha | De | Para |
|---------|-------|----|------|
| `src/pages/admin/EventDetail.tsx` | ~324 | `navigate('/admin/events')` | `navigate(-1)` |
| `src/pages/admin/base/BaseEvents.tsx` | ~508 | `navigate("/admin/events")` | `navigate(-1)` |
| `src/pages/admin/base/BaseVehicles.tsx` | ~164 | `navigate('/admin/vehicles')` | `navigate(-1)` |
| `src/pages/admin/base/BaseFinance.tsx` | ~140 | `navigate('/admin/finance')` | `navigate(-1)` |
| `src/pages/admin/base/BaseProfessionals.tsx` | ~133 | `navigate('/admin/professionals')` | `navigate(-1)` |
| `src/pages/team/EventDetail.tsx` | ~246 | `navigate("/events")` | `navigate(-1)` |

