## Problema

A política RLS `Users can view profiles of event teammates` na tabela `profiles` permite que qualquer usuário escalado em um evento leia **todos os campos** do perfil dos colegas — incluindo `cpf`, `chave_pix`, `telefone` e `telefone_celular`. RLS no Postgres é baseada em linhas, não colunas, então o teammate vê a linha inteira.

## Solução: separar dados sensíveis em tabela própria

Mover os campos sensíveis de `profiles` para uma nova tabela `profile_private`, acessível apenas a admins/gestores e ao próprio dono do registro. A tabela `profiles` continua com os campos seguros (nome, especialidade, cargo, base_id, registro_profissional) — esses sim podem ser lidos por colegas de evento.

Essa abordagem é mais limpa que tentar simular column-level security via views, e elimina o risco de novas joins/policies futuras vazarem CPF/PIX.

### Migração de banco

1. Criar `public.profile_private` com colunas: `profile_id` (PK, FK→profiles.id), `cpf`, `chave_pix`, `telefone`, `telefone_celular`, `created_at`, `updated_at`.
2. Copiar dados existentes de `profiles` para `profile_private`.
3. Habilitar RLS com políticas:
   - `is_admin()` → ALL
   - Próprio dono (via `profiles.user_id = auth.uid()`) → SELECT/UPDATE
4. Após validar o código, remover as colunas `cpf`, `chave_pix`, `telefone`, `telefone_celular` de `profiles` (em segunda migração para evitar quebra).

### Mudanças no frontend

Telas que leem/gravam esses campos passam a usar `profile_private`:

- `src/pages/admin/Professionals.tsx` — formulário de cadastro/edição (admin)
- `src/pages/admin/base/BaseProfessionals.tsx` — idem
- `src/pages/admin/EventDetail.tsx` — telefone do responsável
- `src/components/EventReport.tsx` — telefone na escala (relatório admin)
- `src/pages/team/EventDetail.tsx` — telefone do responsável do evento (lookup separado)
- Qualquer tela que usa a chave PIX (relatório de pagamentos) — `src/pages/admin/Payroll.tsx`, `PayrollReport.tsx`

As joins `profiles(nome, especialidade, ...)` em telas de equipe continuam funcionando — só perdem acesso aos campos sensíveis, que ninguém da equipe deveria ver mesmo.

### Detalhes técnicos

- A `profile_private` espelha 1:1 com `profiles` via FK com `ON DELETE CASCADE`.
- Trigger de `updated_at` igual aos outros.
- Edge function `delete-user` continua funcionando (cascade cuida).
- Nenhuma alteração nas demais policies; apenas os campos saem da tabela exposta.

## Resumo

- Tabela nova `profile_private` com RLS restrita a admin + dono.
- Migração de dados de `profiles` → `profile_private`.
- Atualizar telas admin para ler/gravar dados sensíveis na nova tabela.
- Remover colunas sensíveis de `profiles` em segunda etapa.
- Marcar o finding `profiles_cpf_pix_exposed_to_teammates` como corrigido após verificação.