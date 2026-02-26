import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Ambulance, Phone, Hospital, AlertTriangle } from 'lucide-react';
import SignaturePad, { SignaturePadRef } from './SignaturePad';
import { Badge } from '@/components/ui/badge';

interface RegulationPhone {
  id: string;
  nome: string;
  telefone: string;
}

// ── Banner shown when removal is in progress ──
export function RemovalStatusBanner({
  hospitalDestino,
  onCancel,
}: {
  hospitalDestino: string;
  onCancel: () => void;
}) {
  return (
    <Card className="border-destructive bg-destructive/10">
      <CardContent className="p-3 flex items-center gap-3">
        <Ambulance className="w-5 h-5 text-destructive shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-destructive">Remoção em andamento</p>
          <p className="text-xs text-muted-foreground truncate">
            Hospital: {hospitalDestino}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onCancel} className="shrink-0 text-xs">
          Paciente Melhorou
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Dialog to start a removal ──
export function StartRemovalDialog({
  open,
  onOpenChange,
  attendanceId,
  onRemovalStarted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attendanceId: string;
  onRemovalStarted: (hospital: string) => void;
}) {
  const { toast } = useToast();
  const [regulationPhones, setRegulationPhones] = useState<RegulationPhone[]>([]);
  const [hospitalDestino, setHospitalDestino] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      supabase.from('regulation_phones').select('*').order('nome').then(({ data }) => {
        setRegulationPhones(data || []);
      });
    }
  }, [open]);

  const handleConfirm = async () => {
    if (!hospitalDestino.trim()) {
      toast({ title: 'Informe o hospital de destino', variant: 'destructive' });
      return;
    }
    setIsSaving(true);

    const { error } = await supabase
      .from('clinical_attendances')
      .update({
        status: 'em_remocao',
        hospital_destino: hospitalDestino.trim(),
        desfecho: 'removido',
      } as any)
      .eq('id', attendanceId);

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Remoção hospitalar iniciada!' });
      onRemovalStarted(hospitalDestino.trim());
      onOpenChange(false);
    }
    setIsSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Ambulance className="w-5 h-5" />
            Remover ao Hospital
          </DialogTitle>
          <DialogDescription>
            O paciente será removido para o hospital. Ligue para a regulação e informe o destino.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
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

          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive">
              Ao confirmar, o atendimento ficará em status de remoção em andamento até a entrega do paciente no hospital.
            </p>
          </div>

          <Button
            className="w-full gap-2"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isSaving}
          >
            <Ambulance className="w-4 h-4" />
            {isSaving ? 'Salvando...' : 'Confirmar Remoção'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Dialog to finalize a removal (patient delivered to hospital) ──
export function FinalizeRemovalDialog({
  open,
  onOpenChange,
  attendanceId,
  onComplete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attendanceId: string;
  onComplete: () => void;
}) {
  const { toast } = useToast();
  const [nomeReceptor, setNomeReceptor] = useState('');
  const [crmReceptor, setCrmReceptor] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const receptorSigRef = useRef<SignaturePadRef>(null);

  const handleSave = async () => {
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
        nome_receptor: nomeReceptor.trim(),
        crm_receptor: crmReceptor.trim(),
        data_remocao: new Date().toISOString(),
        assinatura_receptor_url: assinaturaReceptorUrl,
        status: 'finalizado',
      } as any)
      .eq('id', attendanceId);

    if (error) {
      toast({ title: 'Erro ao finalizar remoção', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Paciente entregue ao hospital! Atendimento finalizado.' });
      onComplete();
    }
    setIsSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hospital className="w-5 h-5" />
            Entrega no Hospital
          </DialogTitle>
          <DialogDescription>
            Registre os dados do médico receptor para finalizar o atendimento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
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
            <Label>Data/Hora da Entrega</Label>
            <Input value={new Date().toLocaleString('pt-BR')} disabled />
          </div>

          <div className="space-y-2">
            <Label>Assinatura do Receptor</Label>
            <SignaturePad ref={receptorSigRef} label="Assinatura do Receptor" />
          </div>

          <Button className="w-full gap-2" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Salvando...' : 'Confirmar Entrega e Finalizar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
