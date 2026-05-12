## Backup Automático Agendado

Evolução do módulo de Backup atual para rodar automaticamente todos os dias às 03:00, com histórico, retenção de 30 backups e download/exclusão pelo Super-Admin.

---

### 1. Banco de dados (migração)

**Bucket privado** `system-backups` (Storage):
- Sem políticas públicas. Acesso somente via service role da edge function.
- Super-Admin baixa via URL assinada gerada pela edge function (expira em ~5 min).

**Tabela `system_backups`**:
- `id`, `created_at`, `created_by` (nullable — null = automático)
- `source` ('auto' | 'manual')
- `storage_path` (texto)
- `file_size_bytes` (bigint)
- `total_rows` (int), `tables_count` (int)
- `status` ('success' | 'partial' | 'failed')
- `error_message` (text, nullable)
- `manifest` (jsonb — contagem por tabela, versão)

**RLS**:
- SELECT e DELETE: somente `is_super_admin()`.
- INSERT/UPDATE: bloqueado para clientes (apenas service role da edge function escreve).

**Extensões**: habilitar `pg_cron` e `pg_net` se ainda não estiverem.

**Cron job** (`0 3 * * *`): chama a edge function `run-system-backup` via `net.http_post` com header `x-internal-secret` (secret BACKUP_CRON_SECRET) e body `{ "source": "auto" }`. Inserido via tool `supabase--insert` (não migration, pois contém URL/chaves do projeto).

---

### 2. Edge function `run-system-backup`

- Roda com `SUPABASE_SERVICE_ROLE_KEY` (ignora RLS).
- Aceita `source: 'auto' | 'manual'`.
  - `auto`: exige header `x-internal-secret == BACKUP_CRON_SECRET`.
  - `manual`: exige JWT válido + verificação `is_super_admin()` via `profiles.hidden = true`.
- Para cada uma das 22 tabelas vitais (mesma lista do backup manual atual): pagina em blocos de 1000 e monta CSV.
- Gera `_manifesto.json` (timestamp, autor, contagem por tabela, versão).
- Compacta com `jszip` (via `npm:jszip`) em memória.
- Faz upload em `system-backups/{YYYY}/{MM}/backup-ebip-{YYYY-MM-DD-HHmm}-{auto|manual}.zip`.
- Insere linha em `system_backups` com manifest e tamanho.
- **Rotação**: lista todos os backups (auto+manual juntos) ordenados por `created_at` desc, apaga do Storage e da tabela os que excederem 30.
- Falha parcial em alguma tabela → salva o ZIP com o que conseguiu, marca `status = 'partial'`, preenche `error_message`.

**Secret necessário**: `BACKUP_CRON_SECRET` (gerado e adicionado via tool de secrets antes de criar o cron).

`supabase/config.toml`: adicionar bloco para a função com `verify_jwt = false` (a função valida internamente o JWT manual e o secret do cron).

---

### 3. Frontend — `src/pages/SystemBackup.tsx`

Adicionar abaixo do botão atual de "Gerar Backup Completo":

**Seção "Backup Automático"**:
- Card com badge "Ativo — diário às 03:00 · retenção 30".
- Último backup automático: data/hora, tamanho, status.
- Botão "Executar agora" → invoca `run-system-backup` com `{ source: 'manual' }`.

**Seção "Histórico de Backups"** (tabela paginada, mais recentes primeiro):
- Colunas: Data/hora, Origem (badge auto/manual), Tamanho, Registros, Status.
- Ações: **Baixar** (chama edge function endpoint `?action=signed-url&id=...` que retorna URL assinada e dispara download) e **Excluir** (remove do Storage + tabela; só Super-Admin).

O backup manual local (gerado no navegador) **continua funcionando** como hoje, separado.

---

### 4. Segurança

- Bucket privado, sem URLs públicas.
- URLs assinadas expiram em ~5 min.
- Edge function valida JWT + `is_super_admin` para chamadas manuais; valida `x-internal-secret` para o cron.
- Nenhuma mudança em RLS de outras tabelas.

---

### 5. Validação

1. Disparar "Executar agora" → ZIP aparece no histórico em segundos.
2. Baixar e conferir os 22 CSVs + `_manifesto.json`.
3. Em teste, inserir 31 registros simulados → confirmar que só sobram 30 (Storage e tabela).
4. Logar como gestor/operacional → página de Backup permanece bloqueada e o histórico não retorna nada.
5. Verificar logs da edge function após execução do cron de 03:00.

---

### Arquivos afetados

- **Nova migração**: tabela `system_backups` + RLS + extensões + bucket.
- **Nova edge function**: `supabase/functions/run-system-backup/index.ts`.
- **Atualização**: `supabase/config.toml` (bloco da função).
- **Atualização**: `src/pages/SystemBackup.tsx` (seções automático + histórico).
- **Insert SQL** (via tool insert, não migration): cron schedule chamando a edge function.
- **Secret novo**: `BACKUP_CRON_SECRET`.
