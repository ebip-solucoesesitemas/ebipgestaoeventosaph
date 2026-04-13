

# Plano: Corrigir duplicação de eventos na criação

## Problema
O botão "Salvar" do formulário de criação de evento não é desabilitado durante o envio. Se o usuário clicar duas vezes (ou a rede estiver lenta), o `handleSubmit` executa duas vezes, criando dois eventos idênticos.

## Solução
Adicionar um estado `saving` que:
1. É setado como `true` no início do `handleSubmit`
2. Desabilita o botão de submit enquanto está salvando
3. É setado como `false` no final (sucesso ou erro)

## Alterações

**`src/pages/admin/Events.tsx`**:
- Adicionar estado `const [saving, setSaving] = useState(false)`
- No início de `handleSubmit`: `if (saving) return; setSaving(true);`
- Em cada `return` de erro e no final: `setSaving(false)`
- No botão submit (linha ~1028): adicionar `disabled={saving}` e texto "Salvando..." quando `saving === true`

**`src/pages/admin/base/BaseEvents.tsx`**: mesma correção (se tiver o mesmo padrão)

