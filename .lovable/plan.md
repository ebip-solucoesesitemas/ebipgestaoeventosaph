

## Redefinir Senha — Restrito ao Super-Admin

### Contexto
Apenas o perfil super-admin oculto (`ebipsolucoes.sistemas@gmail.com`, `hidden = true`) poderá redefinir senhas de outros usuários. Admins comuns não terão acesso a essa funcionalidade.

### Plano

**1. Edge function `reset-user-password/index.ts`**
- Segue o mesmo padrão do `create-user` (CORS, auth header, service role)
- Recebe `{ profileId, newPassword }`
- Valida JWT e busca o perfil do chamador
- Verifica que o chamador tem `hidden = true` (super-admin) — não apenas role admin
- Busca `user_id` do profile alvo
- Chama `supabaseAdmin.auth.admin.updateUserById(userId, { password })`
- Registra audit log `reset_password`
- Retorna erro 403 se o chamador não for super-admin

**2. Atualizar `supabase/config.toml`**
```toml
[functions.reset-user-password]
verify_jwt = false
```

**3. Atualizar `src/pages/admin/Users.tsx`**
- Adicionar estado para verificar se o usuário logado é super-admin (`profile.hidden === true` via `useAuth`)
- No dialog de edição, mostrar campo "Nova Senha" **apenas se o usuário logado for super-admin**
- No `updateMutation`, se senha preenchida, invocar `reset-user-password` após salvar perfil
- Toast de sucesso/erro específico

**4. Atualizar `src/hooks/useAuth.tsx`**
- Adicionar campo `hidden` ao tipo `Profile` (já existe na tabela, mas não é tipado)
- Expor `isSuperAdmin` (baseado em `profile.hidden === true`) no contexto

### Segurança
- A verificação é feita no backend (edge function) checando `hidden = true` do perfil do chamador
- Admins comuns não conseguem invocar a function com sucesso — recebem 403
- O botão no frontend só aparece para super-admin, mas mesmo que alguém tente chamar diretamente, o backend bloqueia
- Audit log registra toda alteração de senha

### Sem mudanças no banco de dados.

