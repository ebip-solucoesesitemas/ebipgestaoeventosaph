import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import SignaturePad from '@/components/SignaturePad';
import { PenLine, CheckCircle2 } from 'lucide-react';

interface EventSignatureProps {
  eventId: string;
  tipo: 'chegada' | 'saida';
  label: string;
  disabled?: boolean;
}

interface SignatureRecord {
  id: string;
  nome_responsavel: string;
  assinatura_url: string | null;
  created_at: string;
}

export default function EventSignature({ eventId, tipo, label, disabled }: EventSignatureProps) {
  const { toast } = useToast();
  const [signature, setSignature] = useState<SignatureRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [nomeResponsavel, setNomeResponsavel] = useState('');
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSignature();
  }, [eventId, tipo]);

  const fetchSignature = async () => {
    const { data } = await supabase
      .from('event_signatures')
      .select('*')
      .eq('event_id', eventId)
      .eq('tipo', tipo)
      .maybeSingle();

    setSignature(data);
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!nomeResponsavel.trim()) {
      toast({ title: 'Informe o nome do responsável', variant: 'destructive' });
      return;
    }
    if (!signatureData) {
      toast({ title: 'Assinatura é obrigatória', variant: 'destructive' });
      return;
    }

    setIsSaving(true);

    // Upload signature image
    const fileName = `event_${eventId}_${tipo}_${Date.now()}.png`;
    const base64Data = signatureData.split(',')[1];
    const byteArray = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    const { error: uploadError } = await supabase.storage
      .from('signatures')
      .upload(fileName, byteArray, { contentType: 'image/png', upsert: true });

    if (uploadError) {
      toast({ title: 'Erro ao salvar assinatura', description: uploadError.message, variant: 'destructive' });
      setIsSaving(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('signatures').getPublicUrl(fileName);

    const { error } = await supabase.from('event_signatures').insert({
      event_id: eventId,
      tipo,
      nome_responsavel: nomeResponsavel.trim(),
      assinatura_url: urlData.publicUrl,
    });

    if (error) {
      toast({ title: 'Erro ao registrar assinatura', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: `Assinatura de ${label.toLowerCase()} registrada!` });
      setShowForm(false);
      fetchSignature();
    }
    setIsSaving(false);
  };

  if (isLoading) return null;

  if (signature) {
    return (
      <Card className="border-stable/30 bg-stable/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-stable" />
              <div>
                <p className="font-medium text-sm">{label}</p>
                <p className="text-xs text-muted-foreground">
                  Responsável: {signature.nome_responsavel}
                </p>
              </div>
            </div>
            <Badge className="bg-stable/20 text-stable">Assinado</Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (showForm) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <PenLine className="w-4 h-4" />
            Assinatura de {label}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nome do Responsável do Evento</Label>
            <Input
              value={nomeResponsavel}
              onChange={(e) => setNomeResponsavel(e.target.value)}
              placeholder="Nome completo do responsável"
            />
          </div>
          <div className="space-y-2">
            <Label>Assinatura</Label>
            <SignaturePad label="Assinatura do Responsável" onSave={setSignatureData} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="flex-1">
              {isSaving ? 'Salvando...' : 'Confirmar'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Button
      variant="outline"
      className="w-full gap-2"
      onClick={() => setShowForm(true)}
      disabled={disabled}
    >
      <PenLine className="w-4 h-4" />
      Registrar Assinatura de {label}
    </Button>
  );
}
