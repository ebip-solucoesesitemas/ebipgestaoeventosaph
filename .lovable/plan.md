

## Análise dos Alertas de Segurança

### Alerta 1: Todas as policies são RESTRICTIVE — **FALSO POSITIVO**

Consultei diretamente o banco de dados e **todas as 46 policies já são PERMISSIVE**. O scan de segurança está desatualizado. Nenhuma ação necessária aqui.

### Alerta 2: Escalação de privilégios via UPDATE no profiles — **VULNERABILIDADE REAL**

A policy `"Users can update their own profile"` permite UPDATE sem `WITH CHECK`, ou seja, qualquer usuário autenticado pode alterar os campos `is_account_only` e `cargo` do próprio perfil. Isso permitiria:

- Definir `cargo = 'admin'` e ganhar acesso administrativo
- Definir `is_account_only = true` (caso a policy de events volte a usar esse campo)

### Correção Proposta

Uma única migração SQL para adicionar `WITH CHECK` na policy de UPDATE do profiles, impedindo que o usuário altere `is_account_only` e `cargo`:

```sql
DROP POLICY "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile" ON public.profiles
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND is_account_only = (SELECT p.is_account_only FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1)
    AND cargo = (SELECT p.cargo FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1)
  );
```

Isso garante que ao fazer UPDATE, os valores de `is_account_only` e `cargo` devem permanecer iguais aos atuais. Apenas admins (via policy ALL) podem alterar esses campos.

### Impacto

- Nenhuma mudança no front-end necessária
- Usuários continuam editando nome, telefone, termos de uso etc.
- Campos sensíveis (`cargo`, `is_account_only`) ficam protegidos contra auto-modificação

