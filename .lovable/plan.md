
# Plano: Formato de horario e barra de progresso temporal nos eventos

## 1. Formato de data/horario

Alterar a exibicao da data do evento na lista de eventos (`src/pages/admin/Events.tsx`) de:

```
dd/MM/yyyy as HH:mm
```

Para o formato solicitado:

```
dd/MM/yyyy das HH:mm as HH:mm
```

Exemplo: `15/02/2026 das 08:00 as 18:00`

Isso sera feito combinando `data_inicio` e `data_fim` na mesma linha.

## 2. Barra de progresso baseada no horario do evento

A barra de progresso atual (`Progress`) mostra check-ins da equipe. Sera substituida (ou complementada) por uma barra de progresso temporal que indica quanto tempo do evento ja se passou.

**Logica do calculo:**

```text
progresso = ((agora - data_inicio) / (data_fim - data_inicio)) * 100
```

- Se `agora < data_inicio`: progresso = 0% (evento nao iniciou)
- Se `agora > data_fim`: progresso = 100% (evento encerrado)
- Se evento finalizado: progresso = 100%

A barra sera atualizada em tempo real usando `setInterval` a cada minuto para refletir o tempo decorrido.

## Detalhes Tecnicos

### Arquivo a modificar

**`src/pages/admin/Events.tsx`**:

1. Na linha 700-708, alterar o formato de exibicao da data para incluir inicio e fim no formato `dd/MM/yyyy das HH:mm as HH:mm`
2. Na linha 750, substituir a barra de progresso de check-in por uma barra de progresso temporal
3. Adicionar um `useEffect` com `setInterval` de 60 segundos para atualizar um estado `now` e recalcular o progresso dos eventos em andamento
4. Manter os indicadores de check-in/checkout como texto, apenas mudar a barra

### Calculo do progresso temporal

```text
function getEventTimeProgress(event):
  now = Date.now()
  inicio = Date(event.data_inicio)
  fim = Date(event.data_fim)
  
  if event.status == 'finalizado': return 100
  if now < inicio: return 0
  if now > fim: return 100
  
  return ((now - inicio) / (fim - inicio)) * 100
```

### Atualizacao em tempo real

Um `useState` com a hora atual e um `useEffect` com `setInterval` de 60 segundos garantem que a barra se atualize automaticamente enquanto o administrador visualiza a pagina.
