import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { resolveSignatureUrl } from '@/lib/signatureUrl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, User, Activity, FileText, PenTool, Calendar, Heart, Thermometer, Wind, Droplets } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface APHSummaryProps {
  attendanceId: string;
  onClose: () => void;
}

interface AttendanceData {
  id: string;
  nome_paciente: string;
  documento: string | null;
  idade: number | null;
  sexo: string | null;
  queixa_principal: string;
  evolucao_clinica: string | null;
  status: string;
  created_at: string;
  profiles?: { nome: string; especialidade: string; registro_profissional: string };
  events?: { nome_evento: string; local: string };
}

interface VitalSigns {
  pa_sistolica: number | null;
  pa_diastolica: number | null;
  frequencia_cardiaca: number | null;
  frequencia_respiratoria: number | null;
  saturacao_o2: number | null;
  temperatura: number | null;
  glicemia: number | null;
  horario: string;
}

interface Signatures {
  assinatura_paciente_url: string | null;
  assinatura_profissional_url: string | null;
}

export default function APHSummary({ attendanceId, onClose }: APHSummaryProps) {
  const [attendance, setAttendance] = useState<AttendanceData | null>(null);
  const [vitals, setVitals] = useState<VitalSigns | null>(null);
  const [signatures, setSignatures] = useState<Signatures | null>(null);
  const [resolvedSigs, setResolvedSigs] = useState<Signatures | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [attendanceRes, vitalsRes, signaturesRes] = await Promise.all([
        supabase
          .from('clinical_attendances')
          .select('*, profiles(nome, especialidade, registro_profissional), events(nome_evento, local)')
          .eq('id', attendanceId)
          .single(),
        supabase
          .from('vital_signs')
          .select('*')
          .eq('attendance_id', attendanceId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('signatures')
          .select('*')
          .eq('attendance_id', attendanceId)
          .maybeSingle(),
      ]);

      if (attendanceRes.data) setAttendance(attendanceRes.data);
      if (vitalsRes.data) setVitals(vitalsRes.data);
      if (signaturesRes.data) {
        setSignatures(signaturesRes.data);
        // Resolve legacy storage URLs to signed URLs
        const [patUrl, profUrl] = await Promise.all([
          resolveSignatureUrl(signaturesRes.data.assinatura_paciente_url),
          resolveSignatureUrl(signaturesRes.data.assinatura_profissional_url),
        ]);
        setResolvedSigs({
          assinatura_paciente_url: patUrl,
          assinatura_profissional_url: profUrl,
        });
      }
      setIsLoading(false);
    };

    fetchData();
  }, [attendanceId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!attendance) return null;

  return (
    <div className="space-y-4 animate-slide-up pb-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Ficha de APH</h1>
          <p className="text-sm text-muted-foreground">Resumo do Atendimento</p>
        </div>
      </div>

      {/* Official Form Style */}
      <Card className="border-2 border-primary/20 overflow-hidden">
        {/* Header */}
        <div className="bg-primary p-4 text-primary-foreground">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-lg">FICHA DE ATENDIMENTO PRÉ-HOSPITALAR</h2>
              <p className="text-sm text-primary-foreground/80">
                {attendance.events?.nome_evento} • {attendance.events?.local}
              </p>
            </div>
            <Badge variant="secondary" className="bg-white/20 text-white">
              {attendance.status === 'finalizado' ? 'FINALIZADO' : 'EM ANDAMENTO'}
            </Badge>
          </div>
        </div>

        <CardContent className="p-4 space-y-4">
          {/* Date/Time */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground border-b pb-3">
            <Calendar className="w-4 h-4" />
            {format(new Date(attendance.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
          </div>

          {/* Patient Info */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2 text-primary">
              <User className="w-4 h-4" />
              DADOS DO PACIENTE
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Nome:</span>
                <p className="font-medium">{attendance.nome_paciente}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Documento:</span>
                <p className="font-medium">{attendance.documento || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Idade:</span>
                <p className="font-medium">{attendance.idade ? `${attendance.idade} anos` : '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Sexo:</span>
                <p className="font-medium">{attendance.sexo === 'M' ? 'Masculino' : attendance.sexo === 'F' ? 'Feminino' : '-'}</p>
              </div>
            </div>
            <div>
              <span className="text-muted-foreground text-sm">Queixa Principal:</span>
              <p className="font-medium bg-muted/50 p-2 rounded-lg mt-1">{attendance.queixa_principal}</p>
            </div>
          </div>

          {/* Vital Signs */}
          {vitals && (
            <div className="space-y-3 border-t pt-4">
              <h3 className="font-semibold flex items-center gap-2 text-primary">
                <Activity className="w-4 h-4" />
                SINAIS VITAIS
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/50 p-3 rounded-lg text-center">
                  <Activity className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                  <p className="text-xs text-muted-foreground">PA</p>
                  <p className="font-bold">
                    {vitals.pa_sistolica && vitals.pa_diastolica
                      ? `${vitals.pa_sistolica}/${vitals.pa_diastolica}`
                      : '-'}
                  </p>
                </div>
                <div className="bg-muted/50 p-3 rounded-lg text-center">
                  <Heart className="w-4 h-4 mx-auto text-critical mb-1" />
                  <p className="text-xs text-muted-foreground">FC</p>
                  <p className="font-bold">{vitals.frequencia_cardiaca || '-'} bpm</p>
                </div>
                <div className="bg-muted/50 p-3 rounded-lg text-center">
                  <Wind className="w-4 h-4 mx-auto text-primary mb-1" />
                  <p className="text-xs text-muted-foreground">FR</p>
                  <p className="font-bold">{vitals.frequencia_respiratoria || '-'} irpm</p>
                </div>
                <div className="bg-muted/50 p-3 rounded-lg text-center">
                  <Droplets className="w-4 h-4 mx-auto text-primary mb-1" />
                  <p className="text-xs text-muted-foreground">SpO2</p>
                  <p className="font-bold">{vitals.saturacao_o2 || '-'}%</p>
                </div>
                <div className="bg-muted/50 p-3 rounded-lg text-center">
                  <Thermometer className="w-4 h-4 mx-auto text-warning mb-1" />
                  <p className="text-xs text-muted-foreground">Temp</p>
                  <p className="font-bold">{vitals.temperatura || '-'}°C</p>
                </div>
                <div className="bg-muted/50 p-3 rounded-lg text-center">
                  <Droplets className="w-4 h-4 mx-auto text-warning mb-1" />
                  <p className="text-xs text-muted-foreground">Glicemia</p>
                  <p className="font-bold">{vitals.glicemia || '-'} mg/dL</p>
                </div>
              </div>
            </div>
          )}

          {/* Evolution */}
          {attendance.evolucao_clinica && (
            <div className="space-y-3 border-t pt-4">
              <h3 className="font-semibold flex items-center gap-2 text-primary">
                <FileText className="w-4 h-4" />
                EVOLUÇÃO CLÍNICA (ENFERMAGEM)
              </h3>
              <p className="text-sm bg-muted/50 p-3 rounded-lg whitespace-pre-wrap">
                {attendance.evolucao_clinica}
              </p>
            </div>
          )}

          {/* Medical Evolution */}
          {(attendance as any).evolucao_medica && (
            <div className="space-y-3 border-t pt-4">
              <h3 className="font-semibold flex items-center gap-2 text-primary">
                <FileText className="w-4 h-4" />
                EVOLUÇÃO MÉDICA
              </h3>
              <p className="text-sm bg-muted/50 p-3 rounded-lg whitespace-pre-wrap">
                {(attendance as any).evolucao_medica}
              </p>
            </div>
          )}

          {/* Signatures */}
          {signatures && (
            <div className="space-y-3 border-t pt-4">
              <h3 className="font-semibold flex items-center gap-2 text-primary">
                <PenTool className="w-4 h-4" />
                ASSINATURAS
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-2">Paciente/Responsável</p>
                  {signatures.assinatura_paciente_url ? (
                    <img src={signatures.assinatura_paciente_url} alt="Assinatura paciente" className="h-16 mx-auto border rounded" />
                  ) : (
                    <div className="h-16 border-2 border-dashed rounded flex items-center justify-center text-muted-foreground text-xs">
                      Não assinado
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-2">Profissional</p>
                  {signatures.assinatura_profissional_url ? (
                    <img src={signatures.assinatura_profissional_url} alt="Assinatura profissional" className="h-16 mx-auto border rounded" />
                  ) : (
                    <div className="h-16 border-2 border-dashed rounded flex items-center justify-center text-muted-foreground text-xs">
                      Não assinado
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Professional Info */}
          {attendance.profiles && (
            <div className="border-t pt-4 text-center text-sm">
              <p className="font-medium">{attendance.profiles.nome}</p>
              <p className="text-muted-foreground">
                {attendance.profiles.especialidade} • {attendance.profiles.registro_profissional}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Button className="w-full btn-touch" onClick={onClose}>
        Voltar ao Evento
      </Button>
    </div>
  );
}
