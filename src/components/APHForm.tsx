import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, User, Activity, FileText, PenTool, Save, Check, Plus, Trash2, Clock, Heart } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import VitalSignsInput from './VitalSignsInput';
import SignaturePad, { SignaturePadRef } from './SignaturePad';
import APHSummary from './APHSummary';
import PatientDisposition from './PatientDisposition';

interface APHFormProps {
  eventId: string;
  attendanceId?: string | null;
  onClose: () => void;
}

interface VitalSignsData {
  pa_sistolica: number | null;
  pa_diastolica: number | null;
  frequencia_cardiaca: number | null;
  frequencia_respiratoria: number | null;
  saturacao_o2: number | null;
  temperatura: number | null;
  glicemia: number | null;
}

interface SavedVitalSign extends VitalSignsData {
  id: string;
  horario: string | null;
}

const initialVitals: VitalSignsData = {
  pa_sistolica: null,
  pa_diastolica: null,
  frequencia_cardiaca: null,
  frequencia_respiratoria: null,
  saturacao_o2: null,
  temperatura: null,
  glicemia: null,
};

type Step = 'patient' | 'vitals' | 'evolution' | 'signatures';

export default function APHForm({ eventId, attendanceId, onClose }: APHFormProps) {
  const { profile } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>('patient');
  const [isLoading, setIsLoading] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [showDisposition, setShowDisposition] = useState(false);

  // Patient data
  const [nomePaciente, setNomePaciente] = useState('');
  const [documento, setDocumento] = useState('');
  const [idade, setIdade] = useState('');
  const [sexo, setSexo] = useState('');
  const [queixaPrincipal, setQueixaPrincipal] = useState('');

  // Vitals
  const [vitals, setVitals] = useState<VitalSignsData>(initialVitals);
  const [savedVitals, setSavedVitals] = useState<SavedVitalSign[]>([]);
  const [showVitalsForm, setShowVitalsForm] = useState(false);

  // Evolution
  const [evolucao, setEvolucao] = useState('');

  // Signatures
  const patientSigRef = useRef<SignaturePadRef>(null);
  const professionalSigRef = useRef<SignaturePadRef>(null);

  // Saved attendance ID
  const [savedAttendanceId, setSavedAttendanceId] = useState<string | null>(attendanceId || null);

  // Load existing attendance
  useEffect(() => {
    const loadAttendance = async () => {
      if (!attendanceId) return;

      const { data: attendance } = await supabase
        .from('clinical_attendances')
        .select('*')
        .eq('id', attendanceId)
        .single();

      if (attendance) {
        setNomePaciente(attendance.nome_paciente);
        setDocumento(attendance.documento || '');
        setIdade(attendance.idade?.toString() || '');
        setSexo(attendance.sexo || '');
        setQueixaPrincipal(attendance.queixa_principal);
        setEvolucao(attendance.evolucao_clinica || '');

        if (attendance.status === 'finalizado') {
          setShowSummary(true);
        }
      }

      // Load all vitals
      const { data: vitalsData } = await supabase
        .from('vital_signs')
        .select('*')
        .eq('attendance_id', attendanceId)
        .order('horario', { ascending: true });

      if (vitalsData && vitalsData.length > 0) {
        setSavedVitals(vitalsData.map(v => ({
          id: v.id,
          horario: v.horario,
          pa_sistolica: v.pa_sistolica,
          pa_diastolica: v.pa_diastolica,
          frequencia_cardiaca: v.frequencia_cardiaca,
          frequencia_respiratoria: v.frequencia_respiratoria,
          saturacao_o2: v.saturacao_o2,
          temperatura: v.temperatura ? Number(v.temperatura) : null,
          glicemia: v.glicemia,
        })));
      }
    };

    loadAttendance();
  }, [attendanceId]);

  const savePatientData = async (): Promise<boolean> => {
    if (!profile) {
      toast({ title: 'Perfil não encontrado', variant: 'destructive' });
      return false;
    }

    setIsLoading(true);

    const attendanceData = {
      event_id: eventId,
      profissional_id: profile.id,
      nome_paciente: nomePaciente,
      documento,
      idade: idade ? parseInt(idade) : null,
      sexo,
      queixa_principal: queixaPrincipal,
      evolucao_clinica: evolucao,
    };

    if (savedAttendanceId) {
      const { error } = await supabase
        .from('clinical_attendances')
        .update(attendanceData)
        .eq('id', savedAttendanceId);

      if (error) {
        toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
        setIsLoading(false);
        return false;
      }
    } else {
      const { data, error } = await supabase
        .from('clinical_attendances')
        .insert(attendanceData)
        .select()
        .single();

      if (error) {
        toast({ title: 'Erro ao criar', description: error.message, variant: 'destructive' });
        setIsLoading(false);
        return false;
      }

      setSavedAttendanceId(data.id);
    }

    setIsLoading(false);
    return true;
  };

  const saveVitals = async () => {
    if (!savedAttendanceId) return false;

    // Check if any vital value is filled
    const hasValues = Object.values(vitals).some(v => v !== null);
    if (!hasValues) {
      toast({ title: 'Preencha ao menos um sinal vital', variant: 'destructive' });
      return false;
    }

    setIsLoading(true);

    const { data, error } = await supabase.from('vital_signs').insert({
      attendance_id: savedAttendanceId,
      ...vitals,
    }).select().single();

    if (error) {
      toast({ title: 'Erro ao salvar sinais', description: error.message, variant: 'destructive' });
      setIsLoading(false);
      return false;
    }

    // Add to saved list and reset form
    if (data) {
      setSavedVitals(prev => [...prev, {
        id: data.id,
        horario: data.horario,
        pa_sistolica: data.pa_sistolica,
        pa_diastolica: data.pa_diastolica,
        frequencia_cardiaca: data.frequencia_cardiaca,
        frequencia_respiratoria: data.frequencia_respiratoria,
        saturacao_o2: data.saturacao_o2,
        temperatura: data.temperatura ? Number(data.temperatura) : null,
        glicemia: data.glicemia,
      }]);
    }
    setVitals(initialVitals);
    setShowVitalsForm(false);
    toast({ title: 'Sinais vitais registrados!' });

    setIsLoading(false);
    return true;
  };

  const deleteVitalSign = async (vitalId: string) => {
    const { error } = await supabase.from('vital_signs').delete().eq('id', vitalId);
    if (!error) {
      setSavedVitals(prev => prev.filter(v => v.id !== vitalId));
      toast({ title: 'Registro removido' });
    }
  };

  const finalizeAttendance = async () => {
    if (!savedAttendanceId) return;

    setIsLoading(true);

    // Upload signatures to storage
    let patientSigUrl = null;
    let professionalSigUrl = null;

    if (!patientSigRef.current?.isEmpty()) {
      const dataUrl = patientSigRef.current?.getDataUrl();
      if (dataUrl) {
        const base64 = dataUrl.split(',')[1];
        const blob = await fetch(dataUrl).then(r => r.blob());
        const path = `${savedAttendanceId}/patient.png`;
        
        const { error } = await supabase.storage.from('signatures').upload(path, blob, { upsert: true });
        if (!error) {
          const { data } = supabase.storage.from('signatures').getPublicUrl(path);
          patientSigUrl = data.publicUrl;
        }
      }
    }

    if (!professionalSigRef.current?.isEmpty()) {
      const dataUrl = professionalSigRef.current?.getDataUrl();
      if (dataUrl) {
        const blob = await fetch(dataUrl).then(r => r.blob());
        const path = `${savedAttendanceId}/professional.png`;
        
        const { error } = await supabase.storage.from('signatures').upload(path, blob, { upsert: true });
        if (!error) {
          const { data } = supabase.storage.from('signatures').getPublicUrl(path);
          professionalSigUrl = data.publicUrl;
        }
      }
    }

    // Save signatures record
    await supabase.from('signatures').upsert({
      attendance_id: savedAttendanceId,
      assinatura_paciente_url: patientSigUrl,
      assinatura_profissional_url: professionalSigUrl,
    });

    // Save evolution but don't finalize yet - go to disposition step
    await supabase
      .from('clinical_attendances')
      .update({ evolucao_clinica: evolucao })
      .eq('id', savedAttendanceId);

    toast({ title: 'Assinaturas salvas! Defina o desfecho do paciente.' });
    setIsLoading(false);
    setShowDisposition(true);
  };

  const handleSaveCurrentStep = async () => {
    if (step === 'patient' || step === 'evolution') {
      const success = await savePatientData();
      if (success) {
        toast({ title: 'Alterações salvas!' });
      }
    }
  };

  const handleNext = async () => {
    if (step === 'patient') {
      if (!nomePaciente || !queixaPrincipal) {
        toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' });
        return;
      }
      const saved = await savePatientData();
      if (saved) setStep('vitals');
    } else if (step === 'vitals') {
      // Don't auto-save vitals on next, just advance
      setStep('evolution');
    } else if (step === 'evolution') {
      await savePatientData();
      setStep('signatures');
    } else if (step === 'signatures') {
      await finalizeAttendance();
    }
  };

  const steps: { key: Step; label: string; icon: typeof User }[] = [
    { key: 'patient', label: 'Paciente', icon: User },
    { key: 'vitals', label: 'Sinais', icon: Activity },
    { key: 'evolution', label: 'Evolução', icon: FileText },
    { key: 'signatures', label: 'Assinaturas', icon: PenTool },
  ];

  if (showSummary && savedAttendanceId) {
    return <APHSummary attendanceId={savedAttendanceId} onClose={onClose} />;
  }

  if (showDisposition && savedAttendanceId) {
    return (
      <div className="space-y-6 animate-slide-up">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setShowDisposition(false)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Desfecho do Atendimento</h1>
        </div>
        <PatientDisposition
          attendanceId={savedAttendanceId}
          onComplete={() => setShowSummary(true)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up pb-24">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold">Ficha de APH</h1>
      </div>

      {/* Step Indicator */}
      <div className="flex justify-between">
        {steps.map((s, idx) => {
          const isActive = s.key === step;
          const isPast = steps.findIndex(x => x.key === step) > idx;
          return (
            <div key={s.key} className="flex flex-col items-center flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : isPast
                    ? 'bg-stable text-stable-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {isPast ? <Check className="w-5 h-5" /> : <s.icon className="w-5 h-5" />}
              </div>
              <span className={`text-xs mt-1 ${isActive ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Form Steps */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {step === 'patient' && (
            <>
              <div className="space-y-2">
                <Label>Nome do Paciente *</Label>
                <Input
                  value={nomePaciente}
                  onChange={(e) => setNomePaciente(e.target.value)}
                  placeholder="Nome completo"
                  className="input-touch"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Idade</Label>
                  <Input
                    type="number"
                    value={idade}
                    onChange={(e) => setIdade(e.target.value)}
                    placeholder="Anos"
                    className="input-touch"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sexo</Label>
                  <Select value={sexo} onValueChange={setSexo}>
                    <SelectTrigger className="input-touch">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Masculino</SelectItem>
                      <SelectItem value="F">Feminino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Documento</Label>
                <Input
                  value={documento}
                  onChange={(e) => setDocumento(e.target.value)}
                  placeholder="CPF ou RG"
                  className="input-touch"
                />
              </div>

              <div className="space-y-2">
                <Label>Queixa Principal *</Label>
                <Textarea
                  value={queixaPrincipal}
                  onChange={(e) => setQueixaPrincipal(e.target.value)}
                  placeholder="Descreva a queixa principal do paciente"
                  className="min-h-[100px] text-base"
                />
              </div>
            </>
          )}

          {step === 'vitals' && (
            <div className="space-y-4">
              {/* Saved vital signs list */}
              {savedVitals.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Registros Salvos</Label>
                  {savedVitals.map((v, idx) => (
                    <div key={v.id} className="p-3 border rounded-xl bg-muted/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {v.horario ? format(new Date(v.horario), "dd/MM 'às' HH:mm", { locale: ptBR }) : `Aferição ${idx + 1}`}
                        </span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteVitalSign(v.id)}>
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        {v.pa_sistolica != null && v.pa_diastolica != null && (
                          <span>PA: {v.pa_sistolica}/{v.pa_diastolica}</span>
                        )}
                        {v.frequencia_cardiaca != null && (
                          <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-destructive" />{v.frequencia_cardiaca}</span>
                        )}
                        {v.frequencia_respiratoria != null && <span>FR: {v.frequencia_respiratoria}</span>}
                        {v.saturacao_o2 != null && <span>SpO2: {v.saturacao_o2}%</span>}
                        {v.temperatura != null && <span>T: {v.temperatura}°C</span>}
                        {v.glicemia != null && <span>Gli: {v.glicemia}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* New vital signs form */}
              {showVitalsForm ? (
                <div className="space-y-4">
                  <VitalSignsInput values={vitals} onChange={setVitals} />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => { setShowVitalsForm(false); setVitals(initialVitals); }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      className="flex-1 gap-2"
                      onClick={saveVitals}
                      disabled={isLoading}
                    >
                      <Save className="w-4 h-4" />
                      Salvar Aferição
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full gap-2 btn-touch"
                  onClick={() => setShowVitalsForm(true)}
                  disabled={!savedAttendanceId}
                >
                  <Plus className="w-4 h-4" />
                  Nova Aferição de Sinais Vitais
                </Button>
              )}

              {!savedAttendanceId && (
                <p className="text-xs text-warning text-center">
                  Salve os dados do paciente primeiro para registrar sinais vitais
                </p>
              )}
            </div>
          )}

          {step === 'evolution' && (
            <div className="space-y-2">
              <Label>Evolução Clínica</Label>
              <Textarea
                value={evolucao}
                onChange={(e) => setEvolucao(e.target.value)}
                placeholder="Descreva o atendimento realizado, procedimentos, medicamentos administrados, etc."
                className="min-h-[200px] text-base"
              />
            </div>
          )}

          {step === 'signatures' && (
            <div className="space-y-6">
              <SignaturePad ref={patientSigRef} label="Assinatura do Paciente/Responsável" />
              <SignaturePad ref={professionalSigRef} label="Assinatura do Profissional" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
        <div className="container flex gap-3">
          {step !== 'patient' && (
            <Button
              variant="outline"
              className="btn-touch"
              onClick={() => {
                const idx = steps.findIndex(s => s.key === step);
                if (idx > 0) setStep(steps[idx - 1].key);
              }}
            >
              Voltar
            </Button>
          )}
          
          {/* Save Button - available on patient and evolution steps */}
          {step !== 'signatures' && step !== 'vitals' && (
            <Button
              variant="secondary"
              className="btn-touch gap-2"
              onClick={handleSaveCurrentStep}
              disabled={isLoading || (step === 'patient' && (!nomePaciente || !queixaPrincipal))}
            >
              <Save className="w-4 h-4" />
              Salvar
            </Button>
          )}
          
          <Button className="flex-1 btn-touch gap-2" onClick={handleNext} disabled={isLoading}>
            {isLoading ? (
              'Salvando...'
            ) : step === 'signatures' ? (
              <>
                <Save className="w-5 h-5" />
                Finalizar
              </>
            ) : (
              'Próximo'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
