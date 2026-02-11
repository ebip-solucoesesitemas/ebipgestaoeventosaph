
# Plano: Vincular usuario a uma Base

## Resumo

Adicionar um campo "Base" ao formulario de cadastro de usuario, permitindo associar cada usuario a uma base operacional.

## Alteracoes necessarias

### 1. Banco de dados

Adicionar coluna `base_id` (uuid, nullable) na tabela `profiles` com referencia a `bases(id)`.

```text
ALTER TABLE profiles ADD COLUMN base_id uuid REFERENCES bases(id) ON DELETE SET NULL;
```

### 2. Edge Function `create-user`

Atualizar `supabase/functions/create-user/index.ts` para aceitar e salvar o `base_id` no insert do profile.

### 3. Frontend `src/pages/admin/Users.tsx`

- Adicionar `base_id` ao estado do formulario (valor inicial: string vazia)
- Buscar a lista de bases com `useQuery` para popular um `Select`
- Adicionar campo "Base" (Select) no formulario de cadastro, antes do botao "Cadastrar"
- Enviar `base_id` dentro de `profileData` na chamada da edge function
- Exibir a base do usuario na tabela (coluna extra)
- Atualizar a query de listagem para incluir `bases(sigla, nome)` via join

### 4. Exibicao na tabela de usuarios

Adicionar coluna "Base" na tabela mostrando a sigla da base vinculada ao usuario.
