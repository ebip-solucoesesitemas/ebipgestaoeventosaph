
# Plano de Melhorias: Sistema de Eventos e Atendimentos

## Resumo das Solicitações

O usuário identificou 4 problemas/melhorias necessárias:

1. **Check-in/Checkout não funciona na tela de profissionais** - O botão não faz nada
2. **Falta botão de Salvar na ficha de atendimento** - Para salvar parcialmente sem finalizar
3. **Tela de Eventos (Admin) precisa mostrar andamento** - Check-ins, checkouts, KM, etc.
4. **Falta tela de detalhes do evento para admin** - Para ver tudo que aconteceu

---

## Análise Técnica

### Problema 1: Check-in/Checkout em Profissionais
A página `src/pages/admin/Professionals.tsx` **não tem** funcionalidade de check-in/checkout. Essa funcionalidade existe apenas na página `src/pages/team/EventDetail.tsx`, onde o profissional faz check-in ao entrar no evento.

**Diagnóstico:** A funcionalidade de check-in/checkout é por **evento**, não por profissional. Provavelmente o usuário esperava ver isso em outro lugar ou a navegação não está clara.

### Problema 2: Botão Salvar na Ficha APH
A página `src/components/APHForm.tsx` salva automaticamente ao avançar de etapa, mas não tem um botão "Salvar" dedicado para salvar sem avançar.

### Problema 3 e 4: Visão Admin do Evento
A página `src/pages/admin/Events.tsx` mostra uma lista resumida dos eventos, mas:
- Não mostra status de check-in/checkout com horários
- Não mostra quilometragem
- Não tem link para ver detalhes completos do evento

---

## Implementação Proposta

### 1. Criar Página de Detalhes do Evento (Admin)
**Arquivo:** `src/pages/admin/EventDetail.tsx`

Essa página mostrará:
- Informações gerais do evento
- Lista de profissionais escalados com:
  - Status: Aguardando / Check-in feito / Checkout feito
  - Horário do check-in e checkout
  - KM inicial e final registrados
- Lista de atendimentos realizados
- Resumo de combustível/quilometragem
- Despesas do evento

### 2. Adicionar Rota para o Detalhe Admin
**Arquivo:** `src/App.tsx`

Adicionar rota `/admin/events/:id` para acessar os detalhes do evento.

### 3. Adicionar Link na Lista de Eventos (Admin)
**Arquivo:** `src/pages/admin/Events.tsx`

- Cada card de evento terá um link "Ver Detalhes" que leva para a nova página
- Mostrar indicadores visuais de andamento (quantos fizeram check-in, etc.)

### 4. Botão Salvar na Ficha APH
**Arquivo:** `src/components/APHForm.tsx`

Adicionar botão "Salvar" ao lado do "Próximo" que:
- Salva os dados da etapa atual sem avançar
- Mostra feedback "Salvo com sucesso!"
- Permite o profissional ir e voltar salvando parcialmente

---

## Estrutura da Nova Página de Detalhes (Admin)

```text
┌─────────────────────────────────────────────────────┐
│ ← Voltar            [Nome do Evento]          Edit  │
├─────────────────────────────────────────────────────┤
│ 📅 15/02/2026 às 08:00 - 18:00                      │
│ 📍 Estádio Municipal                                 │
│ 🚗 Viatura: USA-01                                   │
├─────────────────────────────────────────────────────┤
│                RESUMO DO EVENTO                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │    3     │  │   150    │  │  R$ 89   │          │
│  │ Check-ins│  │   KM     │  │  Comb.   │          │
│  └──────────┘  └──────────┘  └──────────┘          │
├─────────────────────────────────────────────────────┤
│ 👥 EQUIPE ESCALADA                                   │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Dr. João Silva          Médico                  │ │
│ │ ✅ Check-in: 07:45  →  Checkout: 18:30         │ │
│ │ 📍 KM: 45.230 → 45.380 (150 km)                │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Enf. Maria Santos       Enfermeira              │ │
│ │ 🟡 Check-in: 07:50  →  Aguardando checkout     │ │
│ │ 📍 KM inicial: 32.100                          │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Téc. Pedro Oliveira     Socorrista              │ │
│ │ ⚪ Aguardando check-in                          │ │
│ └─────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│ 📋 ATENDIMENTOS (3)                                  │
│ ┌─────────────────────────────────────────────────┐ │
│ │ José da Silva, 45 anos  →  Mal súbito          │ │
│ │ 🟢 Finalizado  |  08:30  |  Dr. João           │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Maria Souza, 28 anos   →  Entorse tornozelo    │ │
│ │ 🟢 Finalizado  |  10:15  |  Enf. Maria         │ │
│ └─────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│ 💰 DESPESAS                                          │
│ • Combustível: R$ 89,34                             │
│ • Pedágio: R$ 15,00                                 │
│ • Total: R$ 104,34                                  │
└─────────────────────────────────────────────────────┘
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/pages/admin/EventDetail.tsx` | Criar | Nova página de detalhes do evento para admin |
| `src/App.tsx` | Modificar | Adicionar rota `/admin/events/:id` |
| `src/pages/admin/Events.tsx` | Modificar | Adicionar link "Ver Detalhes" e indicadores de progresso |
| `src/components/APHForm.tsx` | Modificar | Adicionar botão "Salvar" que não avança etapa |

---

## Detalhes Técnicos

### Nova Página EventDetail (Admin)
```text
- Buscar evento com joins para vehicles
- Buscar assignments com profiles, checkin_at, checkout_at, km_inicial, km_final
- Buscar atendimentos (clinical_attendances) com profissional
- Buscar despesas (event_expenses)
- Calcular totais de KM e custo de combustível
- Mostrar timeline visual do evento
```

### Modificações no APHForm
```text
- Adicionar função saveCurrentStep() que salva sem avançar
- Adicionar botão "Salvar" com ícone de disquete
- Mostrar toast "Alterações salvas!" 
- Manter botão "Próximo" funcionando normalmente
```

### Indicadores na Lista de Eventos (Admin)
```text
- Mostrar: "2/4 check-ins" no card do evento
- Mostrar: "150 km percorridos" se houver
- Adicionar botão/link para ir aos detalhes
```
