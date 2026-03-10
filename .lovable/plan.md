

# Alterações: Profissionais sem obrigatoriedade de login + Especialidade "Operacional"

## 1. Profissionais — Remover obrigatoriedade de email/senha

O cadastro de profissionais (`src/pages/admin/Professionals.tsx`) atualmente exige email e senha para criar um novo profissional via edge function `create-user`. Como profissionais não precisam de login, o fluxo de criação deve inserir diretamente na tabela `profiles` (sem criar usuário auth).

**Arquivo: `src/pages/admin/Professionals.tsx`**
- Remover validação obrigatória de email/senha no `handleSubmit`
- Quando email/senha estiverem preenchidos: manter fluxo atual via edge function `create-user`
- Quando email/senha estiverem vazios: inserir diretamente na tabela `profiles` via `supabase.from('profiles').insert(...)` com `user_id: null`
- Remover `required` dos inputs de email e senha no formulário
- Adicionar texto indicando que credenciais são opcionais

## 2. Especialidade "Operacional" — Migration no banco

O enum `especialidade_tipo` não possui o valor "Operacional". Precisamos adicionar.

**Migration SQL:**
```sql
ALTER TYPE public.especialidade_tipo ADD VALUE IF NOT EXISTS 'Operacional';
```

## 3. Adicionar "Operacional" na lista de especialidades do frontend

**Arquivo: `src/pages/admin/Users.tsx`**
- Adicionar `"Operacional"` ao array `especialidades`

**Arquivo: `src/pages/admin/Professionals.tsx`**
- Adicionar `"Operacional"` ao array `especialidades`

## 4. Permissões — Adicionar cargo "operacional"

O sistema de permissões usa a tabela `role_permissions` com o campo `role` (tipo `app_role` enum: `admin`, `equipe`). Precisamos adicionar o valor `operacional` ao enum `app_role` e criar as linhas de permissão correspondentes.

**Migration SQL:**
```sql
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'operacional';
```

**Insert de permissões para o novo cargo** (mesmo conjunto de `permission_key` que já existe para `equipe`, com `enabled = false`).

**Arquivo: `src/pages/admin/Permissions.tsx`**
- Adicionar tab "Operacional" ao `TabsList` (grid-cols-4)
- Adicionar `"operacional"` ao array de roles no map
- Adicionar label `operacional: "Operacional"` no `roleLabels`
- Adicionar ao `isEditable`: admins podem editar permissões do operacional

| Arquivo | Ação |
|---------|------|
| Migration | Adicionar 'Operacional' ao enum `especialidade_tipo` e 'operacional' ao enum `app_role` |
| Insert | Criar linhas de permissão para cargo `operacional` |
| `src/pages/admin/Professionals.tsx` | Tornar email/senha opcionais; adicionar "Operacional" às especialidades; inserir direto no `profiles` quando sem credenciais |
| `src/pages/admin/Users.tsx` | Adicionar "Operacional" às especialidades |
| `src/pages/admin/Permissions.tsx` | Adicionar tab "Operacional" com permissões editáveis |

