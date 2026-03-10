

# Adicionar Campos de KM Inicial e KM Final no Check-in/Checkout

## Problema

O check-in e checkout estão gravando corretamente, porém os campos `km_inicial` e `km_final` não estão sendo coletados nem enviados. As RPCs `handle_team_checkin` e `handle_team_checkout` já aceitam os parâmetros `p_km_inicial` e `p_km_final`, mas o componente não os envia.

## Solução

### Arquivo: `src/components/TeamMemberCheckin.tsx`

1. Adicionar `km_inicial` e `km_final` à interface `TeamMember`
2. Adicionar estados `kmInicial` e `kmFinal` (string, para input numérico)
3. Adicionar campo de input "KM Inicial" antes do botão de check-in
4. Adicionar campo de input "KM Final" antes do botão de checkout
5. Passar `p_km_inicial` na chamada `handle_team_checkin` e `p_km_final` na chamada `handle_team_checkout`
6. Exibir os valores de KM salvos na seção de informações (ao lado dos horários)

| Arquivo | Ação |
|---------|------|
| `src/components/TeamMemberCheckin.tsx` | Editar — inputs de KM + envio às RPCs |

