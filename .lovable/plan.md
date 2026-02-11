

# Plano: Tela de Cadastro de Usuarios

## Resumo

Criar uma tela dedicada para o admin cadastrar usuarios do sistema. Ao cadastrar, o sistema criara automaticamente o usuario de autenticacao, o perfil e a role (user_role) usando a edge function `create-user` ja existente.

## O que sera feito

### 1. Nova pagina `src/pages/admin/Users.tsx`

Tela com:
- Lista de usuarios cadastrados (mostrando nome, email, cargo/role)
- Botao "Novo Usuario" que abre um dialog com formulario:
  - Nome completo
  - Email de login
  - Senha
  - Cargo (admin ou equipe)
- Botoes de editar e excluir em cada usuario
- Badge indicando o tipo de acesso (Admin / Equipe)

O formulario chamara a edge function `create-user` que ja faz tudo:
1. Cria o usuario em auth.users
2. Cria o perfil em profiles
3. Insere a role em user_roles

### 2. Atualizar o sidebar (`AppSidebar.tsx`)

Adicionar link "Usuarios" na secao de Configuracoes do admin, com o icone `Users`.

### 3. Adicionar rota no `App.tsx`

Registrar a rota `/admin/users` apontando para a nova pagina.

## Detalhes Tecnicos

### Formulario de cadastro

Campos:
- `nome` (text, obrigatorio)
- `email` (email, obrigatorio)
- `password` (password, minimo 6 caracteres, obrigatorio)
- `cargo` (select: "equipe" ou "admin")
- `especialidade` (select: Medico, Enfermeiro, Tecnico, Socorrista - obrigatorio pois a tabela profiles exige)
- `registro_profissional` (text, obrigatorio pois a tabela profiles exige)

### Edge function `create-user` (ja existente, sem alteracao)

Fluxo atual:
1. Valida que o chamador e admin
2. Cria auth user com `email_confirm: true`
3. Insere profile com nome, especialidade, registro_profissional, cargo
4. Insere user_role ("equipe" ou "admin")
5. Se admin, tambem insere role "equipe"

### Diferenca da pagina Profissionais

A pagina de Profissionais (`Professionals.tsx`) gerencia perfis profissionais que podem ou nao ter login. A nova pagina de Usuarios foca exclusivamente em contas com acesso ao sistema (usuarios com login).

### Arquivos a criar/modificar

1. **Criar**: `src/pages/admin/Users.tsx` - nova pagina de gestao de usuarios
2. **Modificar**: `src/App.tsx` - adicionar rota `/admin/users`
3. **Modificar**: `src/components/AppSidebar.tsx` - adicionar link no menu admin

