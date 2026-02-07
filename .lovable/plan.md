

# Plano de Correções e Melhorias - Sistema APH

## 1. Reestruturação do Menu (Sidebar Lateral)

**Problema:** O menu atual está no header horizontal, causando empilhamento e barra de rolagem com muitos itens.

**Solucao:** Substituir o menu horizontal por um sidebar lateral usando o componente Shadcn Sidebar, que ja existe no projeto.

- Criar componente `src/components/AppSidebar.tsx` com menu organizado em grupos:
  - **Operacional:** Eventos, Profissionais, Viaturas
  - **Comercial:** Clientes, Financeiro, Orcamentos
  - **Configuracoes:** Bases, Valores Profissionais, Valores Operacionais, Relatorios, Pagamentos
  - **Bases Descentralizadas:** Sub-menus dinamicos por base cadastrada (expansiveis)
- Refatorar `src/components/Layout.tsx` para usar `SidebarProvider` + `Sidebar` + `SidebarTrigger`
- Menu responsivo: no mobile, abre como sheet lateral; no desktop, sidebar fixa a esquerda
- Header simplificado com apenas logo, nome do usuario e botao de logout

## 2. Calculo Automatico de KM no Orcamento

**Problema:** O KM estimado e preenchido manualmente. Deveria ser calculado automaticamente com base nos enderecos da base e do evento.

**Solucao:** Usar a API Nominatim (OpenStreetMap, gratuita) para geocodificar os enderecos e calcular a distancia.

- Criar funcao utilitaria `geocodeAddress` que usa Nominatim para obter coordenadas de um endereco brasileiro
- Criar funcao `calculateDistance` usando formula Haversine com fator de correcao rodoviario (1.35x)
- Quando a base e o endereco do evento forem preenchidos no formulario de orcamento, calcular automaticamente:
  - KM de ida (distancia base -> evento)
  - KM total ida e volta (2x a distancia)
  - Custo de deslocamento (km total x valor por km)
- Adicionar campo somente-leitura "KM Total Ida e Volta" no formulario
- O campo KM estimado sera preenchido automaticamente mas editavel para ajustes manuais

## 3. Correcao da Transferencia do Nome do Evento

**Problema:** Ao gerar evento a partir do orcamento, o nome nao e transferido.

**Causa raiz:** O codigo envia `budget.descricao` como parametro `nome`, que muitas vezes esta vazio ou e diferente do nome desejado.

**Solucao:** 
- Adicionar campo `nome_evento` na tabela `event_budgets` (migracao SQL)
- Incluir campo "Nome do Evento" no formulario de orcamento
- Usar esse campo ao criar o evento automaticamente

## 4. Orcamento - Botao Editar e Campo USB/USA

**Problema:** Falta botao de editar e campo para escolher tipo de unidade.

**Solucao:**
- Adicionar campo `tipo_unidade` (TEXT) na tabela `event_budgets` (migracao SQL)
- Adicionar select "Tipo de Unidade" com opcoes: USB (Unidade Basica), USA (Unidade Avancada)
- Adicionar botao "Editar" em cada card de orcamento na lista
- Criar estado `editingBudget` e reutilizar o dialog de orcamento para edicao
- O botao "Criar Evento" agora cria o evento automaticamente (sem redirecionar) e vincula ao orcamento

## 5. Criacao Automatica de Evento a partir do Orcamento

**Problema:** Ao clicar em "Criar Evento", redireciona para outra pagina com parametros. Deveria criar automaticamente.

**Solucao:**
- Substituir `handleCreateEventFromBudget` para criar o evento diretamente via `supabase.from('events').insert(...)`
- Preencher automaticamente: nome_evento, local (endereco_evento), data_inicio, data_fim, base_id
- Vincular o orcamento ao evento criado (`event_budgets.event_id = novo_evento.id`)
- Mostrar toast de confirmacao e atualizar a lista

## 6. Correcao do Status da Viatura (Bug Critico)

**Problema:** A viatura fica em "Em Uso" mesmo apos todos os profissionais fazerem checkout.

**Causa raiz identificada:** A politica RLS de `event_assignments` permite que um membro da equipe veja apenas SUAS PROPRIAS atribuicoes (SELECT). Quando o codigo no checkout consulta "todas as atribuicoes" para verificar se todos fizeram checkout, ele so ve a do usuario atual. Portanto, `every(a => a.checkout_at !== null)` retorna `true` prematuramente (so 1 registro).

**Solucao:** Criar uma funcao no banco de dados (database function) que roda com `SECURITY DEFINER` para verificar se todos os membros fizeram checkout e liberar a viatura automaticamente.

- Criar funcao SQL `check_and_release_vehicle(event_uuid UUID)`:
  - Verifica TODAS as atribuicoes do evento (bypassando RLS via SECURITY DEFINER)
  - Se todas tiverem `checkout_at` preenchido, atualiza o veiculo para `disponivel`
- Chamar esta funcao via `supabase.rpc('check_and_release_vehicle', { event_uuid: id })` apos o checkout
- Remover a logica de verificacao manual do frontend

## 7. Migracao SQL Necessaria

```text
Novas colunas:
- event_budgets.nome_evento (TEXT, nullable)
- event_budgets.tipo_unidade (TEXT, nullable)

Nova funcao:
- check_and_release_vehicle(event_uuid UUID) - SECURITY DEFINER
```

## Arquivos Modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/AppSidebar.tsx` | NOVO - Componente sidebar lateral |
| `src/components/Layout.tsx` | Refatorar para usar sidebar |
| `src/pages/admin/Finance.tsx` | KM auto-calculo, editar orcamento, campo USB/USA, criacao automatica de evento, campo nome_evento |
| `src/pages/team/EventDetail.tsx` | Usar RPC para liberar viatura |
| `supabase/migrations/...` | Nova migracao com colunas e funcao |

## Sobre Precificacao

Considerando as funcionalidades do sistema (gestao descentralizada de bases, controle de frotas, escala de profissionais, orcamentos, financeiro, atendimentos clinicos APH com sinais vitais, assinaturas digitais, relatorios automatizados), este e um sistema SaaS especializado de nicho (saude pre-hospitalar).

**Sugestao de precos para 2026 (mercado brasileiro):**

| Plano | Bases | Usuarios | Preco Mensal |
|-------|-------|----------|-------------|
| Starter | Ate 2 | Ate 10 | R$ 497/mes |
| Professional | Ate 5 | Ate 30 | R$ 997/mes |
| Enterprise | Ilimitadas | Ilimitados | R$ 1.997/mes |

**Justificativa:** Sistemas SaaS especializados para saude/emergencia no Brasil em 2026 cobram entre R$ 300 e R$ 2.500/mes dependendo do porte. O valor se justifica pela automacao de processos manuais (escalas, relatorios, controle de frotas, orcamentos), reducao de erros e conformidade operacional. Concorrentes como Whitebook, TARM e sistemas de gestao de ambulancias operam nessa faixa.

