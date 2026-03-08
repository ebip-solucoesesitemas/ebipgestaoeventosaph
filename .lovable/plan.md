## Auditoria Completa de Segurança — EBIP Eventos

---

### 🟢 BOAS PRÁTICAS JÁ IMPLEMENTADAS

1. **RLS ativo em todas as tabelas** — Todas as 16 tabelas possuem Row Level Security habilitado com policies adequadas
2. **Roles em tabela separada** — `user_roles` com função `has_role()` SECURITY DEFINER evitando recursão
3. **Edge functions com validação server-side** — `create-user`, `delete-user`, `bootstrap-admin` validam permissões via service role
4. **Proteção contra brute force no login** — Rate limiting client-side (5 tentativas, lockout 30s)
5. **Nenhuma chave sensível exposta no frontend** — Apenas `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` (chaves públicas)
6. **Proteção contra auto-exclusão** — Edge function `delete-user` impede exclusão do próprio admin e perfis hidden
7. **Auditoria de ações administrativas** — `audit_logs` registra criação/exclusão de usuários, mudanças de cargo
8. **Bootstrap admin bloqueado** — Função só executa se não existir nenhum admin
9. **CORS restrito** em `bootstrap-admin` (domínios específicos)
10. **Sem `dangerouslySetInnerHTML` com dados do usuário** — Único uso é no componente chart (dados internos)
11. **Sem localStorage para tokens sensíveis** — Supabase gerencia sessões internamente
12. **Termo de uso LGPD** — Aceite obrigatório no primeiro acesso com timestamp registrado
13. **Perfis super-admin ocultos** — Campo `hidden` protege contra listagem e exclusão

---

### 🔴 VULNERABILIDADES CRÍTICAS

#### 1. Rotas admin sem proteção de autorização no frontend

**Local:** `src/App.tsx` — todas as rotas `/admin/*`
**Risco:** ALTO
**Problema:** Nenhuma rota admin verifica `isAdmin` antes de renderizar. Um usuário com cargo "equipe" pode navegar diretamente para `/admin/clients`, `/admin/finance`, `/admin/payroll`, etc. Embora o RLS bloqueie escritas em algumas tabelas, muitas tabelas têm SELECT aberto para `authenticated` (bases, vehicles, contract_templates, regulation_phones, operational_rates), permitindo leitura de dados.
**Exploração:** Usuário equipe digita `/admin/clients` → RLS em `clients` bloqueia, mas `/admin/vehicles` mostra todas as viaturas, `/admin/bases` mostra todas as bases.
**Correção:** Criar um componente `AdminRoute` wrapper que verifica `isAdmin` e redireciona para `/events` se falso.

#### 2. Rota `/evento/:id/relatorio` sem autenticação no frontend

**Local:** `src/App.tsx` linha 91 — `EventReportPage` renderiza sem `Layout`
**Risco:** MÉDIO-ALTO
**Problema:** Embora o componente `EventReport` verifique sessão internamente, a rota não está envolvida por nenhum guard. Um usuário não autenticado vê uma mensagem de erro genérica em vez de ser redirecionado ao login.
**Correção:** Adicionar verificação de auth e redirecionamento.

#### 3. CORS wildcard nas edge functions `create-user` e `delete-user`

**Local:** `supabase/functions/create-user/index.ts` e `delete-user/index.ts`
**Risco:** MÉDIO
**Problema:** `Access-Control-Allow-Origin: *` permite que qualquer site faça requests a essas funções (embora precisem de token válido).
**Correção:** Restringir CORS aos domínios da aplicação como já feito no `bootstrap-admin`.

---

### 🟠 VULNERABILIDADES MÉDIAS

#### 4. Proteção contra brute force apenas client-side

**Local:** `src/pages/Auth.tsx`
**Risco:** MÉDIO
**Problema:** O rate limiting é feito no React state. Um atacante pode burlar enviando requests diretos ao endpoint de autenticação do backend.
**Correção:** Habilitar "Leaked Password Protection" (já detectado pelo scanner de segurança). Considerar implementar rate limiting server-side.

#### 5. Leaked Password Protection desabilitada

**Local:** Configuração do backend de autenticação
**Risco:** MÉDIO
**Problema:** Scanner de segurança detectou que a proteção contra senhas vazadas está desativada. Usuários podem usar senhas comprometidas.
**Correção:** Habilitar via configuração do backend.

#### 6. Tabelas com SELECT muito permissivo

**Local:** Tabelas `events`, `bases`, `vehicles`, `contract_templates`, `regulation_phones`, `operational_rates`, `client_contracts`
**Risco:** MÉDIO
**Problema:** Essas tabelas têm policies SELECT com `USING (true)`, permitindo que qualquer usuário autenticado leia todos os dados. Exemplo: evento com `allow select events USING (true)` permite que qualquer membro da equipe veja TODOS os eventos, não apenas os seus.
**Nota:** Isso pode ser intencional para algumas tabelas (bases, regulation_phones). Para `events`, a tabela já tem policies mais restritivas, mas a policy `allow select events` com `USING (true)` as sobrepõe.

#### 7. Permissões client-side não verificadas server-side

**Local:** `src/pages/admin/Permissions.tsx` e `role_permissions` table
**Risco:** MÉDIO
**Problema:** O sistema de permissões (`role_permissions`) é verificado apenas no frontend via sidebar/UI. O backend (RLS) não consulta essa tabela — usa apenas `is_admin()`. Um admin cujas permissões foram "desabilitadas" na UI ainda pode acessar tudo via queries diretas.
**Correção:** Integrar `role_permissions` nas RLS policies ou documentar que é apenas UX.

#### 8. Falta de validação de UUID nos parâmetros de rota

**Local:** Todas as páginas que usam `useParams` (`EventDetail`, etc.)
**Risco:** BAIXO-MÉDIO
**Problema:** Parâmetros como `:id` não são validados como UUIDs antes de serem usados em queries.
**Correção:** Adicionar validação regex de UUID antes de qualquer query.

---

### 🟡 MELHORIAS RECOMENDADAS

#### 9. Logs de auditoria incompletos

**Problema:** Apenas criação/exclusão de usuários e mudanças de cargo são auditadas. Faltam logs para: login/logout, alterações em eventos, exclusão de dados financeiros, alterações em permissões.
**Correção:** Expandir `log_audit_event` para cobrir mais ações críticas.

#### 10. Sem expiração forçada de sessão

**Problema:** Não há timeout de inatividade. Sessão permanece ativa enquanto o token for válido.
**Correção:** Implementar idle timeout no frontend (ex: 30 min de inatividade → logout automático).

#### 11. Upload de assinaturas sem validação de conteúdo

**Local:** `SignaturePad.tsx` → envia data URL base64
**Risco:** BAIXO
**Problema:** As assinaturas são convertidas para PNG via canvas, o que limita naturalmente o risco. Mas não há validação de tamanho máximo do payload.
**Correção:** Limitar tamanho do base64 antes do upload.

#### 12. Bucket `signatures` não é público (bom), mas signed URLs

**Risco:** BAIXO
**Problema:** O bucket de assinaturas é privado (correto). Signed URLs são gerados para visualização, o que é a prática correta.

#### 13. Falta de Content Security Policy (CSP)

**Risco:** BAIXO
**Problema:** Não há headers CSP configurados, permitindo execução de scripts inline.
**Correção:** Adicionar CSP headers via meta tags ou configuração do servidor.

---

### PLANO DE CORREÇÃO (Implementação)

Vou implementar as correções para as vulnerabilidades críticas e médias:

1. **Criar componente `AdminRoute**` que verifica `isAdmin` e redireciona usuários não-admin
2. **Criar componente `ProtectedRoute**` que verifica autenticação base
3. **Envolver todas as rotas `/admin/***` com `AdminRoute`
4. **Envolver rota de relatório** com verificação de auth
5. **Corrigir CORS** nas edge functions `create-user` e `delete-user`
6. **Habilitar Leaked Password Protection** via configuração
7. **Adicionar validação de UUID** em páginas com parâmetros de rota
8. **Remover policy redundante** `allow select events` com `USING (true)` da tabela `events`
9. **Adicionar idle timeout** de 30 minutos no frontend

### Detalhes Técnicos

**AdminRoute wrapper:**

```tsx
function AdminRoute({ children }) {
  const { isAdmin, isLoading, user } = useAuth();
  if (isLoading) return <Loading />;
  if (!user) return <Navigate to="/auth" />;
  if (!isAdmin) return <Navigate to="/" />;
  return <Layout>{children}</Layout>;
}
```

**CORS fix** — Replicar o padrão do `bootstrap-admin` nas outras edge functions.

**Policy events fix** — Remover `allow select events USING (true)` que torna redundantes as outras policies SELECT mais restritivas.

### Resumo Quantitativo


| Categoria           | Quantidade |
| ------------------- | ---------- |
| 🔴 Críticas         | 3          |
| 🟠 Médias           | 5          |
| 🟡 Melhorias        | 5          |
| 🟢 Já implementadas | 13         |


Deseja que eu prossiga com a implementação das correções?  
Acrescente isso ao plano  
E me informe se o sistema pode quebrar? Amanha preciso estar cm ele funcionando  
 Leaked Password Protection desabilitada

**Local:** Configuração do backend de autenticação  
**Risco:** MÉDIO  
**Problema:** Scanner de segurança detectou que a proteção contra senhas vazadas está desativada. Usuários podem usar senhas comprometidas.  
**Correção:** Habilitar via configuração do backend.  
Me explique esse passo a passo como fazer tambem