

## Plano: Termo de Uso com LGPD no Primeiro Acesso

### Resumo
Criar um Termo de Utilização que o usuário deve aceitar no primeiro login para acessar o sistema. O termo isentará a EBIP Soluções e Sistemas de responsabilidade por mau uso e incluirá cláusulas sobre a LGPD.

### Mudanças no Banco de Dados

1. **Adicionar coluna `accepted_terms_at`** na tabela `profiles`:
   - Tipo: `timestamp with time zone`, nullable, default `null`
   - Quando o usuário aceitar, grava a data/hora da aceitação

### Mudanças no Código

2. **Criar componente `TermsOfUse.tsx`**:
   - Tela fullscreen com ScrollArea contendo o texto completo do termo
   - Conteúdo do termo incluindo:
     - Identificação da EBIP Soluções e Sistemas
     - Isenção de responsabilidade por mau uso do sistema
     - Obrigações do usuário
     - Cláusulas LGPD (coleta, tratamento, finalidade, direitos do titular, base legal)
     - Segurança dos dados
   - Checkbox "Li e aceito os termos" + botão "Aceitar e Continuar"
   - Ao aceitar: atualiza `profiles.accepted_terms_at = now()` e recarrega o perfil

3. **Atualizar `useAuth.tsx`**:
   - Adicionar `accepted_terms_at` ao tipo `Profile`
   - Expor flag `needsTermsAcceptance` (user logado + profile existe + `accepted_terms_at` é null)

4. **Atualizar `Index.tsx`**:
   - Antes de renderizar o dashboard, verificar `needsTermsAcceptance`
   - Se true, renderizar o componente `TermsOfUse` em vez do dashboard
   - Após aceitação, chamar `refreshProfile()` para liberar o acesso

### Conteúdo do Termo (Resumo das Seções)

- **Objeto**: Acesso ao sistema EBIP Eventos para gestão de atendimento pré-hospitalar
- **Responsabilidade**: EBIP Soluções e Sistemas não se responsabiliza por uso indevido, dados incorretos inseridos, ou decisões tomadas com base nas informações do sistema
- **LGPD**: Finalidade do tratamento, dados coletados, base legal (execução de contrato), direitos do titular (acesso, correção, exclusão), compartilhamento, retenção, encarregado de dados
- **Segurança**: Medidas técnicas adotadas, responsabilidade do usuário sobre credenciais
- **Disposições Gerais**: Vigência, alterações nos termos

### Segurança
- A aceitação fica registrada no banco com timestamp
- Não afeta nenhuma funcionalidade existente — apenas adiciona uma verificação antes do acesso

