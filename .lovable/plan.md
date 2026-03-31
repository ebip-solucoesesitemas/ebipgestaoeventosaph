
# Plano: remover usuário/senha da tela de Profissionais sem quebrar o restante

## Diagnóstico
Hoje existem dois fluxos diferentes:

- `src/pages/admin/Professionals.tsx` mistura:
  - cadastro do profissional
  - valores financeiros
  - criação opcional de conta com `email` e `password`
- `src/pages/admin/Users.tsx` já é a tela correta para cadastrar contas com acesso ao sistema

Isso está gerando duplicidade de fluxo e risco de inconsistência.

## O que vou ajustar

### 1. Remover credenciais da tela de Profissionais
**Arquivo:** `src/pages/admin/Professionals.tsx`

- Remover do estado do formulário:
  - `email`
  - `password`
- Remover do modal:
  - bloco “Credenciais de Acesso (opcional)”
  - campo “Email de Login”
  - campo “Senha”
- Simplificar o `handleSubmit` para sempre:
  1. criar/editar apenas o perfil do profissional
  2. salvar `professional_rates` com o `profile_id` correto
- Corrigir o insert de criação para retornar o perfil criado diretamente, sem buscar depois por nome

### 2. Preservar a gestão de usuários no lugar certo
**Arquivo:** `src/pages/admin/Users.tsx`

- Manter esta tela como único local para:
  - criar usuário com login
  - definir senha
  - marcar conta apenas para acesso
  - editar senha posteriormente
- Não remover nenhuma lógica de `create-user`, reset de senha ou exclusão daqui

### 3. Evitar confusão para o operador
**Arquivo:** `src/pages/admin/Professionals.tsx`

- Ajustar textos da tela para deixar claro:
  - “Profissionais” = cadastro operacional/financeiro
  - “Usuários” = contas de acesso ao sistema
- Onde hoje aparece badge de acesso (`Com acesso` / `Sem login`), revisar para manter só se fizer sentido visualmente, sem sugerir criação de login por essa tela

### 4. Corrigir o bug já existente de gravação dos valores
**Arquivo:** `src/pages/admin/Professionals.tsx`

Como essa mesma tela já está com problema ao salvar `valor_hora` e `valor_evento` no cadastro novo, vou aproveitar e deixar o fluxo seguro:
- usar `insert(...).select().single()` para obter o `id` do profissional recém-criado
- fazer `upsert` de `professional_rates` com esse `id`
- validar erro do `upsert` e exibir toast se falhar

## Impacto esperado
- A tela de Profissionais ficará focada apenas no cadastro do profissional e seus valores
- O cadastro de login/senha continuará funcionando normalmente em `Usuários`
- Reduzimos duplicidade e evitamos quebrar regras de acesso
- O salvamento de valor por hora/evento ficará consistente já no primeiro cadastro

## Arquivos a alterar
- `src/pages/admin/Professionals.tsx`

## Arquivos que vou revisar para não causar regressão
- `src/pages/admin/Users.tsx`
- `supabase/functions/create-user/index.ts`
- `src/App.tsx`
- `src/components/AppSidebar.tsx`

## Cuidados de compatibilidade
- Não vou remover a rota `/admin/users`
- Não vou mexer no fluxo de autenticação principal
- Não vou alterar permissões nem estrutura de banco só para essa remoção
- A separação ficará:
  - `Profissionais`: dados operacionais e financeiros
  - `Usuários`: acesso ao sistema
