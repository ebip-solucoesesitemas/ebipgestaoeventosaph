

# Adicionar Campos CPF e Chave PIX

## 1. Migration — Novos campos na tabela `profiles`

```sql
ALTER TABLE public.profiles ADD COLUMN cpf text;
ALTER TABLE public.profiles ADD COLUMN chave_pix text;
```

## 2. Cadastro de Profissionais (`src/pages/admin/Professionals.tsx`)

- Adicionar `cpf` e `chave_pix` à interface `Profile` e ao `formData`
- Adicionar inputs no formulário (CPF e Chave PIX)
- Incluir os campos no payload de insert e update
- Exibir CPF e Chave PIX nos cards da listagem
- Preencher os campos ao abrir edição (`openEditDialog`)

## 3. Relatório por Profissional (`src/pages/admin/ProfessionalReport.tsx`)

- Buscar `cpf` e `chave_pix` junto com os profiles
- Adicionar colunas "CPF" e "Chave PIX" na tabela visual e no PDF exportado

## 4. Folha de Pagamento (`src/pages/admin/PayrollReport.tsx`)

- Buscar `cpf` e `chave_pix` dos profiles
- Adicionar CPF e Chave PIX no cabeçalho de cada grupo de profissional (label do grupo)
- Incluir no PDF e na impressão

| Arquivo | Ação |
|---------|------|
| Migration SQL | Adicionar colunas `cpf` e `chave_pix` em `profiles` |
| `src/pages/admin/Professionals.tsx` | Campos no form + exibição nos cards |
| `src/pages/admin/ProfessionalReport.tsx` | Colunas CPF/PIX na tabela e PDF |
| `src/pages/admin/PayrollReport.tsx` | CPF/PIX no grupo do profissional e PDF |

