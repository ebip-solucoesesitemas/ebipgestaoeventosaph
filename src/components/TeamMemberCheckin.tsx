import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { LogIn, LogOut, CheckCircle2, Gauge, Clock, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TeamMember {
  id: string;
  profile_id: string;
  checkin_at: string | null;
  checkout_at: string | null;
  km_inicial: number | null;
  km_final: number | null;
  profiles: {
    id: string;
    nome: string;
    especialidade: string;
  };
}

interface TeamMemberCheckinProps {
  member: TeamMember;
  eventName: string;
  onUpdate: () => void;
}

export default function TeamMemberCheckin({ member, eventName, onUpdate }: TeamMemberCheckinProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [kmInicial, setKmInicial] = useState(member.km_inicial?.toString() || '');
  const [kmFinal, setKmFinal] = useState(member.km_final?.toString() || '');

  const isSocorrista = member.profiles.especialidade === 'Socorrista';

  const handleCheckin = async () => {
    if (isSocorrista && (!kmInicial || isNaN(parseFloat(kmInicial)))) {
      toast({ title: 'Informe a quilometragem inicial', variant: 'destructive' });
      return;
    }

    setIsProcessing(true);
    const { data, error } = await (supabase.rpc as any)('handle_team_checkin', {
      p_assignment_id: member.id,
      p_km_inicial: isSocorrista && kmInicial ? parseFloat(kmInicial) : null,
    });

    if (error) {
      toast({ title: 'Erro ao fazer check-in', description: error.message, variant: 'destructive' });
    } else if (data?.error) {
      toast({ title: 'Erro', description: data.error, variant: 'destructive' });
    } else {
      toast({ title: `Check-in realizado para ${member.profiles.nome}!` });
      onUpdate();
    }
    setIsProcessing(false);
  };

  const handleCheckout = async () => {
    if (isSocorrista) {
      if (!kmFinal || isNaN(parseFloat(kmFinal))) {
        toast({ title: 'Informe a quilometragem final', variant: 'destructive' });
        return;
      }
      if (parseFloat(kmFinal) < (member.km_inicial || 0)) {
        toast({ title: 'KM final deve ser maior que o inicial', variant: 'destructive' });
        return;
      }
    }

    setIsProcessing(true);
    const { data, error } = await (supabase.rpc as any)('handle_team_checkout', {
      p_assignment_id: member.id,
      p_km_final: isSocorrista && kmFinal ? parseFloat(kmFinal) : null,
    });

    if (error) {
      toast({ title: 'Erro ao fazer checkout', description: error.message, variant: 'destructive' });
    } else if (data?.error) {
      toast({ title: 'Erro', description: data.error, variant: 'destructive' });
    } else {
      const paymentValue = data?.payment_value || 0;
      const hours = data?.hours || 0;
      toast({
        title: `Checkout realizado para ${member.profiles.nome}!`,
        description: paymentValue > 0
          ? `Pagamento de R$ ${paymentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} gerado (${hours}h).`
          : undefined,
      });
      onUpdate();
    }
    setIsProcessing(false);
  };

  const getStatusBadge = () => {
    if (member.checkout_at) {
      return (
        <Badge className="bg-stable/20 text-stable text-xs gap-1">
          <CheckCircle2 className="w-3 h-3" />
          Concluído
        </Badge>
      );
    }
    if (member.checkin_at) {
      return (
        <Badge className="bg-warning/20 text-warning text-xs gap-1">
          <Clock className="w-3 h-3" />
          Em campo
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-xs">
        Aguardando
      </Badge>
    );
  };

  return (
    <div className="p-4 border rounded-xl bg-card space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium">{member.profiles.nome}</p>
          <p className="text-sm text-muted-foreground">{member.profiles.especialidade}</p>
        </div>
        {getStatusBadge()}
      </div>

      {/* Time info */}
      {(member.checkin_at || member.checkout_at) && (
        <div className="grid grid-cols-2 gap-2 text-sm">
          {member.checkin_at && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <LogIn className="w-3.5 h-3.5" />
              <span>Check-in: {format(new Date(member.checkin_at), "HH:mm", { locale: ptBR })}</span>
            </div>
          )}
          {member.checkout_at && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <LogOut className="w-3.5 h-3.5" />
              <span>Checkout: {format(new Date(member.checkout_at), "HH:mm", { locale: ptBR })}</span>
            </div>
          )}
        </div>
      )}

      {/* KM section for Socorrista */}
      {isSocorrista && !member.checkout_at && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1">
              <Gauge className="w-3 h-3" />
              KM Inicial
            </Label>
            <Input
              type="number"
              value={kmInicial}
              onChange={(e) => setKmInicial(e.target.value)}
              placeholder="Ex: 45230"
              disabled={!!member.checkin_at}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1">
              <Gauge className="w-3 h-3" />
              KM Final
            </Label>
            <Input
              type="number"
              value={kmFinal}
              onChange={(e) => setKmFinal(e.target.value)}
              placeholder="Ex: 45350"
              disabled={!member.checkin_at}
            />
          </div>
        </div>
      )}

      {/* KM summary after checkout */}
      {isSocorrista && member.checkout_at && member.km_inicial && member.km_final && (
        <div className="flex items-center gap-3 text-sm bg-muted/50 rounded-lg p-2">
          <Gauge className="w-4 h-4 text-muted-foreground" />
          <span>KM: {member.km_inicial.toLocaleString('pt-BR')} → {member.km_final.toLocaleString('pt-BR')}</span>
          <Badge variant="outline">
            {((member.km_final || 0) - (member.km_inicial || 0)).toLocaleString('pt-BR')} km
          </Badge>
        </div>
      )}

      {/* Action button */}
      {!member.checkout_at && (
        <Button
          onClick={member.checkin_at ? handleCheckout : handleCheckin}
          disabled={isProcessing}
          size="sm"
          className={`w-full ${member.checkin_at ? 'bg-warning hover:bg-warning/90' : ''}`}
        >
          {isProcessing ? (
            'Processando...'
          ) : member.checkin_at ? (
            <>
              <LogOut className="w-4 h-4 mr-1" />
              Fazer Checkout
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4 mr-1" />
              Fazer Check-in
            </>
          )}
        </Button>
      )}
    </div>
  );
}
