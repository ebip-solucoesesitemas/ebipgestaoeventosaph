
# Plano: Mover Quilometragem do Socorrista para o Usuario Responsavel

## Resumo

Atualmente, o campo de KM inicial/final aparece para profissionais com especialidade "Socorrista" no check-in/checkout. A mudanca e remover isso dos profissionais e colocar os campos de KM diretamente na tela do evento, controlados pelo usuario responsavel (conta da viatura).

## O que sera feito

### 1. Adicionar colunas de KM na tabela `events`

Adicionar `km_inicial` e `km_final` diretamente na tabela `events`, ja que a quilometragem e da viatura (do evento), nao do profissional individual.

```text
events
  + km_inicial (numeric, nullable)
  + km_final (numeric, nullable)
```

### 2. Atualizar tela do evento da equipe (`team/EventDetail.tsx`)

- Adicionar uma secao "Quilometragem da Viatura" visivel para o usuario responsavel
- Campos de KM Inicial (editavel antes do primeiro check-in ou a qualquer momento)
- Campo de KM Final (editavel ao final do evento)
- Botao para salvar a quilometragem
- Resumo de combustivel passara a usar os dados do evento em vez dos assignments

### 3. Remover KM do componente `TeamMemberCheckin`

- Remover a logica `isSocorrista` que exige KM
- Remover os campos de input de KM inicial/final do componente
- Remover validacao de KM no check-in e checkout
- Check-in e checkout dos profissionais passam a ser apenas registro de horario

### 4. Atualizar calculo de combustivel

- O calculo de KM total e custo de combustivel no `EventDetail.tsx` passara a usar `event.km_inicial` e `event.km_final` em vez de somar KM dos assignments

## Detalhes Tecnicos

### Migracao SQL

```text
ALTER TABLE public.events 
  ADD COLUMN km_inicial numeric,
  ADD COLUMN km_final numeric;
```

### Arquivos a modificar

1. **Migracao SQL** - adicionar colunas `km_inicial` e `km_final` na tabela `events`
2. **`src/pages/team/EventDetail.tsx`** - adicionar secao de KM da viatura e atualizar calculo de combustivel
3. **`src/components/TeamMemberCheckin.tsx`** - remover toda logica e campos de KM, simplificar para apenas check-in/checkout de horario
