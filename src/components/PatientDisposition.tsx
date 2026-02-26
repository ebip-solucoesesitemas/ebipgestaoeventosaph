import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Ambulance, Phone, CheckCircle2, Hospital } from 'lucide-react';
import SignaturePad, { SignaturePadRef } from './SignaturePad';

interface PatientDispositionProps {
  attendanceId: string;
  onComplete: () => void;
}

interface RegulationPhone {
  id: string;
  nome: string;
  telefone: string;
}

export default function PatientDisposition({ attendanceId, onComplete }: PatientDispositionProps) {
  const { toast } = useToast();
  const [desfecho, setDesfecho] = useState<'removido' | 'liberado' | null>(null);
  const [showRemovalAlert, setShowRemovalAlert] = useState(false);
  const [regulationPhones, setRegulationPhones] = useState<RegulationPhone[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Removal fields
  const [hospitalDestino, setHospitalDestino] = useState('');
  const [nomeReceptor, setNomeReceptor] = useState('');
  const [crmReceptor, setCrmReceptor] = useState('');
  const receptorSigRef = useRef<SignaturePadRef>(null);

  useEffect(() => {
    supabase.from('regulation_phones').select('*').order('nome').then(({ data }) => {
      setRegulationPhones(data || []);
    });
  }, []);

  const handleSelectRemoval = () => {
    setDesfecho('removido');
    setShowRemovalAlert(true);
  };

  const handleRelease = async () => {
    setIsSaving(true);
    const { error } = await supabase
      .from('clinical_attendances')
      .update({ desfecho: 'liberado', status: 'finalizado' } as any)
      .eq('id', attendanceId);

    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Paciente liberado com sucesso!' });
      onComplete();
    }
    setIsSaving(false);
  };

  const handleSaveRemoval = async () => {
    if (!hospitalDestino.trim()) {
      toast({ title: 'Informe o hospital de destino', variant: 'destructive' });
      return;
    }
    if (!nomeReceptor.trim() || !crmReceptor.trim()) {
      toast({ title: 'Informe nome e CRM do receptor', variant: 'destructive' });
      return;
    }

    setIsSaving(true);

    let assinaturaReceptorUrl: string | null = null;
    if (receptorSigRef.current && !receptorSigRef.current.isEmpty()) {
      const dataUrl = receptorSigRef.current.getDataUrl();
      const blob = await fetch(dataUrl).then(r => r.blob());
      const path = `${attendanceId}/receptor.png`;
      const { error: uploadError } = await supabase.storage
        .from('signatures')
        .upload(path, blob, { upsert: true });
      if (!uploadError) {
        const { data } = supabase.storage.from('signatures').getPublicUrl(path);
        assinaturaReceptorUrl = data.publicUrl;
      }
    }

    const { error } = await supabase
      .from('clinical_attendances')
      .update({
        desfecho: 'removido',
        hospital_destino: hospitalDestino.trim(),
        nome_receptor: nomeReceptor.trim(),
        crm_receptor: crmReceptor.trim(),
        data_remocao: new Date().toISOString(),
        assinatura_receptor_url: assinaturaReceptorUrl,
        status: 'finalizado',
      } as any)
      .eq('id', attendanceId);

    if (error) {
      toast({ title: 'Erro ao salvar remoção', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Remoção hospitalar registrada!' });
      onComplete();
    }
    setIsSaving(false);
  };

  // Patient improved - switch back to release
  const handlePatientImproved = () => {
    setDesfecho(null);
  };

  // Initial choice screen
  if (!desfecho) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Desfecho do Paciente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            O paciente precisa ser removido ao hospital ou pode ser liberado?
          </p>
          <Button
            variant="destructive"
            className="w-full gap-2"
            onClick={handleSelectRemoval}
          >
            <Ambulance className="w-4 h-4" />
            Remover ao Hospital
          </Button>
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleRelease}
            disabled={isSaving}
          >
            <CheckCircle2 className="w-4 h-4" />
            {isSaving ? 'Salvando...' : 'Paciente Liberado'}
          </Button>

          {regulationPhones.length > 0 && (
            <div className="pt-3 border-t space-y-2">
              <Label className="text-xs text-muted-foreground">Telefones da Regulação</Label>
              {regulationPhones.map((phone) => (
                <a
                  key={phone.id}
                  href={`tel:${phone.telefone}`}
                  className="flex items-center gap-2 p-2 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <Phone className="w-4 h-4 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{phone.nome}</p>
                    <p className="text-xs text-muted-foreground">{phone.telefone}</p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Removal form
  return (
    <>
      <AlertDialog open={showRemovalAlert} onOpenChange={setShowRemovalAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Ambulance className="w-5 h-5" />
              Remoção Hospitalar
            </AlertDialogTitle>
            <AlertDialogDescription>
              O paciente será removido para o hospital. Preencha os dados abaixo para registrar a transferência.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowRemovalAlert(false)}>
              Continuar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Hospital className="w-4 h-4" />
            Dados da Remoção Hospitalar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {regulationPhones.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Ligar para Regulação</Label>
              {regulationPhones.map((phone) => (
                <a
                  key={phone.id}
                  href={`tel:${phone.telefone}`}
                  className="flex items-center gap-2 p-2 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors"
                >
                  <Phone className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{phone.nome}</p>
                    <p className="text-xs text-muted-foreground">{phone.telefone}</p>
                  </div>
                </a>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label>Hospital de Destino *</Label>
            <Input
              value={hospitalDestino}
              onChange={(e) => setHospitalDestino(e.target.value)}
              placeholder="Nome do hospital"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Nome do Receptor *</Label>
              <Input
                value={nomeReceptor}
                onChange={(e) => setNomeReceptor(e.target.value)}
                placeholder="Nome completo"
              />
            </div>
            <div className="space-y-2">
              <Label>CRM Receptor *</Label>
              <Input
                value={crmReceptor}
                onChange={(e) => setCrmReceptor(e.target.value)}
                placeholder="CRM"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Data/Hora da Remoção</Label>
            <Input
              value={new Date().toLocaleString('pt-BR')}
              disabled
            />
          </div>

          <div className="space-y-2">
            <Label>Assinatura do CRM Receptor</Label>
            <SignaturePad ref={receptorSigRef} label="Assinatura do Receptor" />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handlePatientImproved}
            >
              Paciente Melhorou
            </Button>
            <Button
              className="flex-1"
              onClick={handleSaveRemoval}
              disabled={isSaving}
            >
              {isSaving ? 'Salvando...' : 'Confirmar Remoção'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
