

# Plano: Filtrar profissionais por base e restringir Operacional à sua base

## Problema 1: Profissionais de outras bases aparecem no cadastro de evento

Tanto em `Events.tsx` (geral) quanto em `BaseEvents.tsx` (dentro da base), a query de profissionais busca **todos** os profissionais sem filtrar por `base_id`.

### Correção

**`src/pages/admin/base/BaseEvents.tsx`** (linha ~139-143):
- Adicionar `.eq("base_id", baseId)` na query de profissionais. Quando o evento é de uma base específica, só devem aparecer profissionais vinculados àquela base.

**`src/pages/admin/Events.tsx`** (linha ~155):
- Quando o formulário de criação/edição tem uma base selecionada (`form.base_id`), filtrar a lista de profissionais exibidos na escala pela `base_id` selecionada. Isso pode ser feito no frontend filtrando `profiles` pelo `base_id` ao renderizar os checkboxes, já que a query geral precisa trazer todos (para permitir trocar a base no form).

## Problema 2: Operacional vê todas as bases na sidebar

No `AppSidebar.tsx`, a query de bases busca **todas** sem filtrar. Para o cargo Operacional, deve mostrar apenas a base vinculada ao seu perfil (`profile.base_id`).

### Correção

**`src/components/AppSidebar.tsx`** (linhas ~102-111):
- Se `isOperacional && profile?.base_id`, filtrar a query com `.eq("id", profile.base_id)`.
- Caso contrário (admin/gestor), manter a busca de todas as bases.

## Resumo de arquivos

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/admin/base/BaseEvents.tsx` | Filtrar profissionais por `base_id` na query |
| `src/pages/admin/Events.tsx` | Filtrar profissionais exibidos pela base selecionada no formulário |
| `src/components/AppSidebar.tsx` | Operacional só vê sua própria base |

