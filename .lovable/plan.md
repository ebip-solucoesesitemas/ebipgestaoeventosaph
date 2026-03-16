

# Fix: Exibir status de remoção hospitalar nos atendimentos

## Diagnóstico

1. **Sinais Vitais**: O atendimento "Everaldo" realmente não possui sinais vitais registrados no banco — o dialog está correto. Não há bug aqui.

2. **Status `em_remocao` não aparece**: Os badges nas listas de atendimentos (admin e equipe) só reconhecem "finalizado" ou "em andamento", ignorando o status `em_remocao`. Além disso, o dialog de detalhes não mostra informações de remoção (hospital de destino, etc).

## Correções

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/admin/EventDetail.tsx` | Atualizar badge do atendimento na lista (linha 512) para reconhecer `em_remocao` com cor vermelha e ícone ambulância. Adicionar seção de remoção no dialog de detalhes mostrando hospital de destino, receptor e data. Adicionar `hospital_destino`, `nome_receptor`, `crm_receptor`, `data_remocao`, `desfecho` à interface Attendance e ao select da query. |
| `src/pages/team/EventDetail.tsx` | Atualizar badge do atendimento na lista (linha 372) para reconhecer `em_remocao`. Adicionar banner de destaque no topo da página quando houver atendimento em remoção. Incluir `hospital_destino` e `status` no tipo Attendance. |

### Detalhes da implementação

**Badge de status** (ambos arquivos):
- `em_remocao` → Badge vermelha com texto "Em Remoção" e ícone de ambulância
- Manter "Finalizado" (verde) e "Em andamento" (amarelo) sem alteração

**Dialog de detalhes (admin)**:
- Quando `status === 'em_remocao'`, exibir card de destaque vermelho com hospital de destino
- Quando finalizado com `desfecho === 'removido'`, mostrar dados do receptor (nome, CRM, data)

**Banner no topo (team EventDetail)**:
- Verificar se algum atendimento tem `status === 'em_remocao'`
- Se sim, exibir banner vermelho abaixo do header com "Paciente em remoção hospitalar" e hospital de destino

