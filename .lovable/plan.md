
# Plano: Validacao de Viatura por Horario + Ocultar Eventos Finalizados para Equipe

## 1. Validacao de disponibilidade da viatura por horario

Ao criar ou editar um evento, antes de salvar, o sistema verificara se a viatura selecionada ja esta vinculada a outro evento com horarios que se sobreponham. Se houver conflito de horario, o cadastro sera bloqueado com uma mensagem de erro. Se o novo evento for antes ou depois do evento existente (sem sobreposicao), o cadastro sera permitido normalmente.

**Logica de sobreposicao**: Dois eventos se sobrepoem quando `novo_inicio < existente_fim AND novo_fim > existente_inicio`.

A validacao sera feita no frontend em dois pontos:
- `src/pages/admin/Events.tsx` (tela principal de eventos)
- `src/pages/admin/base/BaseEvents.tsx` (tela de eventos por base)

Antes do `insert` ou `update`, uma consulta verificara se existem outros eventos (excluindo o evento sendo editado e eventos finalizados) com a mesma `viatura_id` cujo periodo se sobreponha. Se encontrar, exibe um toast de erro e impede o salvamento.

## 2. Ocultar eventos finalizados para profissionais

Na pagina de eventos da equipe (`src/pages/team/TeamEvents.tsx`), adicionar um filtro para excluir eventos com `status = 'finalizado'`. Assim, profissionais verao apenas eventos em andamento ou agendados. Administradores continuam vendo todos os eventos normalmente.

## Detalhes Tecnicos

### Arquivos a modificar

1. **`src/pages/admin/Events.tsx`** — Adicionar funcao de validacao de conflito de horario da viatura antes do submit
2. **`src/pages/admin/base/BaseEvents.tsx`** — Mesma validacao de conflito de horario
3. **`src/pages/team/TeamEvents.tsx`** — Filtrar eventos com `status != 'finalizado'` na query (`.neq('status', 'finalizado')`)

### Validacao de conflito (pseudo-codigo)

```text
async function checkVehicleConflict(viaturaId, dataInicio, dataFim, editingEventId?) {
  // Buscar eventos que usam a mesma viatura e nao estao finalizados
  query = supabase.from('events')
    .select('id, nome_evento, data_inicio, data_fim')
    .eq('viatura_id', viaturaId)
    .neq('status', 'finalizado')

  // Se editando, excluir o evento atual
  if (editingEventId) query = query.neq('id', editingEventId)

  // Verificar sobreposicao no frontend
  // Conflito: novo_inicio < existente_fim AND novo_fim > existente_inicio
  return eventos_conflitantes
}
```

### Nenhuma alteracao no banco de dados necessaria
Todas as mudancas sao exclusivamente no frontend.
