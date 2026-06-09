## Plano: gerar dump SQL do schema `public`

Vou rodar `pg_dump` direto contra o banco do Lovable Cloud usando as variáveis `PG*` já disponíveis no sandbox, e salvar o arquivo em `/mnt/documents/` para você baixar.

### Comando

```bash
pg_dump \
  --schema=public \
  --schema-only \
  --no-owner \
  --no-privileges \
  --no-comments \
  -f /mnt/documents/ebip-schema-public.sql
```

Flags explicadas:
- `--schema=public` → ignora `auth`, `storage`, `realtime`, `vault`, `supabase_functions` (gerenciados pelo Supabase).
- `--schema-only` → só estrutura, zero dados.
- `--no-owner` / `--no-privileges` → remove `OWNER TO` e `GRANT` específicos do projeto atual, evitando erros de role inexistente no destino.
- `--no-comments` → arquivo mais limpo.

### Saída
- Arquivo: `/mnt/documents/ebip-schema-public.sql`
- Conteúdo: `CREATE TABLE`, `CREATE FUNCTION`, `CREATE TRIGGER`, `CREATE POLICY`, `ALTER TABLE ... ENABLE RLS`, índices, FKs, enums (`app_role`, `cargo_tipo`, etc.) — tudo do `public`.

### Restauração no projeto externo
1. No destino, garanta que extensões usadas existam (provavelmente já estão num projeto Supabase novo): `pgcrypto`, `uuid-ossp`.
2. Rode:
   ```bash
   psql "postgres://...destino..." -f ebip-schema-public.sql
   ```
3. Depois, recrie os `GRANT` que o `--no-privileges` removeu (necessário pro PostgREST enxergar as tabelas). Posso gerar um bloco de `GRANT`s padrão junto com o dump se quiser.

### Observações
- Não inclui usuários (`auth.users`) nem dados — só esqueleto.
- Funções com `SECURITY DEFINER` virão no dump; no destino o owner passa a ser o usuário que rodar o `psql`.
- O Vault e o cron de backup automático NÃO serão recriados (são extensões/objetos fora do `public`); reconfigure manualmente no destino se precisar.

Confirma que posso rodar?
