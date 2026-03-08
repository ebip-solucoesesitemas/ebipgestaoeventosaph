import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function TermsOfUse() {
  const { profile, refreshProfile } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ accepted_terms_at: new Date().toISOString() })
        .eq('id', profile.id);

      if (error) throw error;
      await refreshProfile();
      toast.success('Termos aceitos com sucesso!');
    } catch (e: any) {
      toast.error('Erro ao aceitar os termos: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-card border rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-primary p-6 text-primary-foreground flex items-center gap-3">
          <div className="w-12 h-12 bg-primary-foreground/20 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Termo de Utilização</h1>
            <p className="text-primary-foreground/80 text-sm">EBIP Soluções e Sistemas</p>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="h-[60vh] p-6">
          <div className="prose prose-sm max-w-none text-foreground space-y-4">
            <h2 className="text-lg font-bold text-foreground">1. OBJETO</h2>
            <p className="text-muted-foreground">
              O presente Termo de Utilização regula o acesso e uso do sistema <strong>EBIP Eventos</strong>, desenvolvido e mantido pela <strong>EBIP Soluções e Sistemas</strong>, destinado à gestão de atendimento pré-hospitalar, controle de eventos, escalas de equipes, registros clínicos e operações administrativas correlatas.
            </p>

            <h2 className="text-lg font-bold text-foreground">2. ACEITAÇÃO DOS TERMOS</h2>
            <p className="text-muted-foreground">
              Ao acessar e utilizar o sistema, o usuário declara ter lido, compreendido e aceito integralmente os termos aqui dispostos. O uso do sistema está condicionado à aceitação deste Termo de Utilização.
            </p>

            <h2 className="text-lg font-bold text-foreground">3. RESPONSABILIDADES DO USUÁRIO</h2>
            <p className="text-muted-foreground">O usuário se compromete a:</p>
            <ul className="text-muted-foreground list-disc pl-5 space-y-1">
              <li>Utilizar o sistema de forma ética, legal e em conformidade com as normas vigentes;</li>
              <li>Manter suas credenciais de acesso (login e senha) em sigilo, sendo responsável por qualquer atividade realizada com sua conta;</li>
              <li>Inserir informações verdadeiras, completas e atualizadas no sistema;</li>
              <li>Não utilizar o sistema para fins ilícitos, fraudulentos ou que possam causar danos a terceiros;</li>
              <li>Comunicar imediatamente qualquer uso não autorizado de sua conta ou qualquer violação de segurança.</li>
            </ul>

            <h2 className="text-lg font-bold text-foreground">4. ISENÇÃO DE RESPONSABILIDADE</h2>
            <p className="text-muted-foreground">
              A <strong>EBIP Soluções e Sistemas</strong> não se responsabiliza por:
            </p>
            <ul className="text-muted-foreground list-disc pl-5 space-y-1">
              <li><strong>Uso indevido do sistema</strong> por parte do usuário ou de terceiros que utilizem suas credenciais;</li>
              <li><strong>Dados incorretos, incompletos ou desatualizados</strong> inseridos pelos usuários;</li>
              <li><strong>Decisões clínicas, operacionais ou administrativas</strong> tomadas com base nas informações disponibilizadas no sistema;</li>
              <li><strong>Danos diretos, indiretos, incidentais ou consequenciais</strong> resultantes do uso ou impossibilidade de uso do sistema;</li>
              <li><strong>Interrupções temporárias</strong> no serviço decorrentes de manutenções programadas, falhas técnicas ou eventos de força maior.</li>
            </ul>
            <p className="text-muted-foreground">
              O sistema é uma ferramenta de apoio à gestão e <strong>não substitui o julgamento profissional</strong> do usuário em suas atividades.
            </p>

            <h2 className="text-lg font-bold text-foreground">5. PROTEÇÃO DE DADOS PESSOAIS (LGPD)</h2>
            <p className="text-muted-foreground">
              Em conformidade com a <strong>Lei Geral de Proteção de Dados (Lei nº 13.709/2018 – LGPD)</strong>, informamos:
            </p>

            <h3 className="text-base font-semibold text-foreground">5.1 Finalidade do Tratamento</h3>
            <p className="text-muted-foreground">
              Os dados pessoais coletados são utilizados exclusivamente para:
            </p>
            <ul className="text-muted-foreground list-disc pl-5 space-y-1">
              <li>Gestão e operação de eventos de atendimento pré-hospitalar;</li>
              <li>Controle de escalas e equipes;</li>
              <li>Registros clínicos e operacionais;</li>
              <li>Gestão financeira e administrativa;</li>
              <li>Comunicação entre os membros da equipe.</li>
            </ul>

            <h3 className="text-base font-semibold text-foreground">5.2 Dados Coletados</h3>
            <p className="text-muted-foreground">
              O sistema poderá coletar e tratar os seguintes dados pessoais:
            </p>
            <ul className="text-muted-foreground list-disc pl-5 space-y-1">
              <li>Nome completo, e-mail, telefone e registro profissional;</li>
              <li>Dados de acesso (logs de login, endereço IP);</li>
              <li>Dados de pacientes inseridos durante os atendimentos (nome, idade, sexo, sinais vitais, evolução clínica);</li>
              <li>Dados financeiros relacionados a pagamentos e orçamentos.</li>
            </ul>

            <h3 className="text-base font-semibold text-foreground">5.3 Base Legal</h3>
            <p className="text-muted-foreground">
              O tratamento dos dados é realizado com base em:
            </p>
            <ul className="text-muted-foreground list-disc pl-5 space-y-1">
              <li><strong>Execução de contrato</strong> ou procedimentos preliminares (Art. 7º, V, LGPD);</li>
              <li><strong>Cumprimento de obrigação legal</strong> ou regulatória (Art. 7º, II, LGPD);</li>
              <li><strong>Proteção da vida</strong> do titular ou de terceiro (Art. 7º, VII e Art. 11, II, "e", LGPD) — aplicável aos dados de saúde dos pacientes.</li>
            </ul>

            <h3 className="text-base font-semibold text-foreground">5.4 Direitos do Titular</h3>
            <p className="text-muted-foreground">
              Conforme a LGPD, o titular dos dados tem direito a:
            </p>
            <ul className="text-muted-foreground list-disc pl-5 space-y-1">
              <li>Confirmar a existência de tratamento de seus dados;</li>
              <li>Acessar seus dados pessoais;</li>
              <li>Solicitar a correção de dados incompletos, inexatos ou desatualizados;</li>
              <li>Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários;</li>
              <li>Revogar o consentimento, quando aplicável;</li>
              <li>Obter informações sobre o compartilhamento de dados.</li>
            </ul>
            <p className="text-muted-foreground">
              Para exercer seus direitos, o titular poderá entrar em contato com o Encarregado de Dados da EBIP Soluções e Sistemas através dos canais oficiais de comunicação da empresa.
            </p>

            <h3 className="text-base font-semibold text-foreground">5.5 Compartilhamento de Dados</h3>
            <p className="text-muted-foreground">
              Os dados pessoais poderão ser compartilhados apenas com:
            </p>
            <ul className="text-muted-foreground list-disc pl-5 space-y-1">
              <li>Membros da equipe escalados no mesmo evento (dados necessários à operação);</li>
              <li>Autoridades competentes, quando exigido por lei ou ordem judicial;</li>
              <li>Prestadores de serviço de infraestrutura tecnológica, sob obrigação de confidencialidade.</li>
            </ul>

            <h3 className="text-base font-semibold text-foreground">5.6 Retenção dos Dados</h3>
            <p className="text-muted-foreground">
              Os dados serão mantidos pelo período necessário ao cumprimento das finalidades para as quais foram coletados, respeitando os prazos legais de retenção aplicáveis.
            </p>

            <h2 className="text-lg font-bold text-foreground">6. SEGURANÇA DA INFORMAÇÃO</h2>
            <p className="text-muted-foreground">
              A EBIP Soluções e Sistemas adota medidas técnicas e administrativas adequadas para proteger os dados pessoais contra acessos não autorizados, destruição, perda, alteração ou qualquer forma de tratamento inadequado, incluindo:
            </p>
            <ul className="text-muted-foreground list-disc pl-5 space-y-1">
              <li>Criptografia de dados em trânsito e em repouso;</li>
              <li>Controle de acesso baseado em perfis e permissões;</li>
              <li>Registro de auditoria das ações realizadas no sistema;</li>
              <li>Políticas de senhas seguras.</li>
            </ul>
            <p className="text-muted-foreground">
              O usuário é responsável por manter a segurança de suas credenciais de acesso e por não compartilhar sua senha com terceiros.
            </p>

            <h2 className="text-lg font-bold text-foreground">7. PROPRIEDADE INTELECTUAL</h2>
            <p className="text-muted-foreground">
              O sistema EBIP Eventos, incluindo sua interface, código-fonte, funcionalidades, logotipos e documentação, é de propriedade exclusiva da <strong>EBIP Soluções e Sistemas</strong>, sendo protegido pelas leis de propriedade intelectual vigentes.
            </p>

            <h2 className="text-lg font-bold text-foreground">8. DISPOSIÇÕES GERAIS</h2>
            <ul className="text-muted-foreground list-disc pl-5 space-y-1">
              <li>Este Termo de Utilização poderá ser atualizado a qualquer momento, sendo o usuário notificado sobre alterações relevantes;</li>
              <li>O uso continuado do sistema após a alteração dos termos constitui aceitação das modificações;</li>
              <li>Eventuais litígios serão resolvidos no foro da comarca da sede da EBIP Soluções e Sistemas.</li>
            </ul>

            <div className="mt-6 p-4 bg-muted/50 rounded-lg border">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Última atualização: Março de 2026
              </p>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t p-6 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={accepted}
              onCheckedChange={(v) => setAccepted(v === true)}
              className="mt-0.5"
            />
            <span className="text-sm text-foreground">
              Declaro que li e compreendi o <strong>Termo de Utilização</strong> e a{' '}
              <strong>Política de Proteção de Dados (LGPD)</strong> da EBIP Soluções e Sistemas,
              e aceito integralmente seus termos e condições.
            </span>
          </label>
          <Button
            className="w-full"
            size="lg"
            disabled={!accepted || loading}
            onClick={handleAccept}
          >
            {loading ? 'Processando...' : 'Aceitar e Continuar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
