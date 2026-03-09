
# Adicionar Cláusulas ao Termo de Uso

## O que será feito

Editar apenas `src/components/TermsOfUse.tsx`. A estrutura atual é:

1. OBJETO
2. ACEITAÇÃO DOS TERMOS
3. RESPONSABILIDADES DO USUÁRIO
4. ISENÇÃO DE RESPONSABILIDADE
5. PROTEÇÃO DE DADOS PESSOAIS (LGPD)
6. SEGURANÇA DA INFORMAÇÃO
7. PROPRIEDADE INTELECTUAL
8. DISPOSIÇÕES GERAIS

### Nova estrutura após as inserções:

1. OBJETO *(sem alteração)*
2. DIREITO DE USO DO SISTEMA *(novo)*
3. ABERTURA DE CHAMADOS E SUPORTE TÉCNICO *(novo)*
4. ACEITAÇÃO DOS TERMOS *(era 2)*
5. RESPONSABILIDADES DO USUÁRIO *(era 3)*
6. ISENÇÃO DE RESPONSABILIDADE *(era 4)*
7. PROTEÇÃO DE DADOS PESSOAIS (LGPD) *(era 5, subseções renumeradas para 7.1–7.6)*
8. SEGURANÇA DA INFORMAÇÃO *(era 6)*
9. PROPRIEDADE INTELECTUAL *(era 7)*
10. DISPOSIÇÕES GERAIS *(era 8)*

### Implementação

Apenas `src/components/TermsOfUse.tsx`:
- Inserir após a seção 1 (linha 54) as duas novas seções com seus conteúdos
- Renumerar todas as seções seguintes (2→4, 3→5, 4→6, 5→7 com subseções 7.1–7.6, 6→8, 7→9, 8→10)
