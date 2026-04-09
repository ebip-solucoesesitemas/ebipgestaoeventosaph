

# Plano: Corrigir salvamento de assinaturas do responsável

## Problema identificado

O bucket `signatures` está configurado como **privado**, mas o código usa `getPublicUrl()` que só funciona em buckets públicos. Além disso, falta uma policy de **UPDATE** no storage para permitir o `upsert`.

## Correções

### 1. Migração SQL — Tornar bucket público e adicionar policy de UPDATE

```sql
-- Tornar o bucket público para que getPublicUrl funcione
UPDATE storage.buckets SET public = true WHERE id = 'signatures';

-- Adicionar policy de UPDATE para permitir upsert
CREATE POLICY "Authenticated users can update signatures"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'signatures');
```

### 2. Nenhuma alteração no código

Com o bucket público e a policy de UPDATE, o fluxo existente (`upload` → `getPublicUrl` → `insert` na tabela `event_signatures`) vai funcionar corretamente sem mudanças no código.

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| Migração SQL | Bucket público + policy UPDATE |

