

# Plano de Segurança — Ajustes Adicionais

## 1. Service Role Key — Status: SEGURA

A chave `SUPABASE_SERVICE_ROLE_KEY` **não está exposta no frontend**. O cliente usa apenas `VITE_SUPABASE_PUBLISHABLE_KEY` (anon key). A service role key existe apenas nos secrets do backend, acessível somente pelas edge functions. Nenhuma ação necessária.

## 2. Tabela de Auditoria (`audit_logs`)

### 2.1 Migration SQL

Criar tabela `audit_logs` com RLS restrito a admins:

```text
audit_logs
├── id (uuid, PK)
├── user_id (uuid, NOT NULL) — quem executou a ação
├── action (text, NOT NULL) — ex: "create_user", "delete_user", "change_role"
├── target_id (text) — ID do recurso afetado
├── details (jsonb) — dados extras (role anterior, novo cargo, etc.)
├── created_at (timestamptz, default now())
```

RLS: SELECT somente para admins (`is_admin()`). INSERT via `SECURITY DEFINER` function para que edge functions possam gravar sem expor acesso direto.

### 2.2 Função `log_audit_event`

```text
log_audit_event(p_user_id uuid, p_action text, p_target_id text, p_details jsonb)
```

Function `SECURITY DEFINER` que insere na tabela `audit_logs`. Será chamada pelas edge functions.

### 2.3 Edge Functions — Adicionar logs

Atualizar `create-user/index.ts`:
- Após criação bem-sucedida, chamar `log_audit_event` com action `create_user`

Atualizar `delete-user/index.ts`:
- Após exclusão, chamar `log_audit_event` com action `delete_user`

Atualizar `toggle_user_role` (DB function):
- Adicionar chamada a `log_audit_event` com action `change_role` e details contendo cargo anterior e novo

### 2.4 Página Admin — Visualizar Logs

Criar página `/admin/audit-logs` com tabela mostrando: data, quem fez, ação, alvo, detalhes. Adicionar link no sidebar.

## 3. Remoção de Edge Functions Perigosas

- Deletar `supabase/functions/debug-data/index.ts` (expõe todos os perfis sem autenticação)
- Deletar `supabase/functions/seed-demo/index.ts` (apaga dados sem autenticação)
- Adicionar verificação de admin em `bootstrap-admin` ou removê-la

## 4. Correções de RLS (da auditoria anterior)

- Restringir `clients` SELECT para admins apenas
- Restringir `client_payments` SELECT para admins apenas

## 5. CORS — Restringir domínios

Trocar `Access-Control-Allow-Origin: "*"` nas edge functions por:
```text
const allowedOrigins = [
  "https://aphaid-quickcare.lovable.app",
  "https://id-preview--2200ae23-748b-4d29-98e8-fc570ecea26b.lovable.app"
];
```

## 6. Rate Limiting no Login

Adicionar contador de tentativas no frontend (`Auth.tsx`):
- Após 5 falhas consecutivas, bloquear por 30 segundos
- Mostrar mensagem de "Muitas tentativas, aguarde"

## 7. Validação de Input nas Edge Functions

- `create-user`: validar email (regex), senha (6-72 chars), nome (max 100)
- `delete-user`: validar UUID format do profileId

## Ordem de Implementação

1. Criar tabela `audit_logs` + função `log_audit_event` (migration)
2. Deletar `debug-data` e `seed-demo`
3. Atualizar edge functions com logs de auditoria e CORS restrito
4. Corrigir RLS de `clients` e `client_payments`
5. Adicionar rate limiting no login
6. Adicionar validação de inputs
7. Criar página de visualização de audit logs
8. Atualizar `bootstrap-admin` com proteção

