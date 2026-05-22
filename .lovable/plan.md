## Objetivo

Em `src/pages/admin/base/BaseEvents.tsx` (Eventos da Base):

1. Adicionar **filtro por Tipo de Unidade** na barra de filtros existente.
2. Adicionar botão **"Relatório Profissional"** que gera um PDF com:
   - Total de eventos por **tipo de unidade** (na base atual)
   - Por evento: nome, data, tipo de unidade, quantidade de horas trabalhadas
   - Totais gerais (total de eventos, total de horas, breakdown por tipo)
   - Sempre limitado à base atual (`baseId`)

## Mudanças

### 1. Filtro por Tipo de Unidade
- Novo state `filterTipoUnidade`.
- Como o campo `tipo_unidade` não vem hoje no `select("*")` de events? Vem, pois usa `*`. Confirmar incluindo no tipo `Event` o campo `tipo_unidade?: string | null`.
- Novo `<Select>` na barra de filtros (ao lado de "Profissional") com as mesmas opções do formulário (Semi Presencial, Presencial, USB, USA, USB dois Técnicos, USA dois Enfermeiros, Ambulatório, USB somente condutor, Usb Plantão, Usb Plantão + Médico) + opção "Todos".
- Incluir filtro na função de filtragem dos cards (linha ~1013) e no botão "Limpar filtros".

### 2. Relatório Profissional da Base (PDF)

Novo botão **"Relatório de Eventos"** no header, ao lado de "Novo Evento", abre um pequeno diálogo com:
- Período (mês/ano ou intervalo, padrão = mês atual)
- Tipo de unidade (opcional)

Ao confirmar, busca:
- Eventos da base no período (`events` onde `base_id = baseId` e `data_inicio` no período)
- Para cada evento, somar horas via `event_assignments` (checkin/checkout) — total de horas do evento = maior intervalo dos profissionais OU soma; **usaremos o intervalo de tempo do evento real** = duração entre o `min(checkin_at)` e o `max(checkout_at)` dos assignments (se nenhum check-in, cai para `data_fim - data_inicio` previstos, marcado como "previsto").

PDF (usando `generatePDF` de `src/lib/pdf.ts`):
- **Seção 1 — Resumo por Tipo de Unidade**: tabela com Tipo, Qtd Eventos, Horas totais.
- **Seção 2 — Detalhamento por Evento**: Nome, Data, Tipo Unidade, Horas.
- **Totais finais**: Total de Eventos, Total de Horas.

Subtítulo do PDF: `Base XXX — Período MM/AAAA` (ou intervalo).

## Não muda

- Schema, RLS, edge functions.
- Outras páginas de relatório (`ProfessionalReport`, `Finance`).
- Formulário de criação/edição de evento.

## Detalhes técnicos

- Reaproveitar lista de tipos de unidade definida no formulário (extrair como constante `UNIT_TYPES` no topo do arquivo para evitar duplicação).
- Cálculo de horas: `differenceInMinutes(max(checkout_at), min(checkin_at)) / 60` por evento; se faltar dados de check-in, mostrar `—` e não somar.
- Toda consulta filtrada por `base_id = baseId` para respeitar a base atual.
