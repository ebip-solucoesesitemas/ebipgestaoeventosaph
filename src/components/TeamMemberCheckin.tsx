import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { LogIn, LogOut, CheckCircle2, Clock, Gauge } from 'lucide-react';
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
  checkoutEnabled?: boolean;
  horarioSaidaBase?: string | null;
  minAntesSaidaBase?: number | null;
}

export default function TeamMemberCheckin({ member, eventName, onUpdate, checkoutEnabled = false, horarioSaidaBase, minAntesSaidaBase }: TeamMemberCheckinProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [kmInicial, setKmInicial] = useState('');
  const [kmFinal, setKmFinal] = useState('');

  const isCheckinWindowOpen = () => {
    if (!horarioSaidaBase || !minAntesSaidaBase) return true;
    const saida = new Date(horarioSaidaBase);
    const windowStart = new Date(saida.getTime() - minAntesSaidaBase * 60 * 1000);
    const now = new Date();
    return now >= windowStart;
  };

  const getCheckinWindowMessage = () => {
    if (!horarioSaidaBase || !minAntesSaidaBase) return null;
    const saida = new Date(horarioSaidaBase);
    const windowStart = new Date(saida.getTime() - minAntesSaidaBase * 60 * 1000);
    const now = new Date();
    if (now < windowStart) {
      return `Check-in disponível a partir de ${format(windowStart, "HH:mm", { locale: ptBR })} (${minAntesSaidaBase}min antes da saída às ${format(saida, "HH:mm", { locale: ptBR })})`;
    }
    return null;
  };

  const handleCheckin = async () => {
    if (!isCheckinWindowOpen()) {
      const msg = getCheckinWindowMessage();
      toast({ title: 'Check-in fora do horário permitido', description: msg || undefined, variant: 'destructive' });
      return;
    }
    setIsProcessing(true);
    const rpcParams: Record<string, unknown> = { p_assignment_id: member.id };
    if (kmInicial.trim()) {
      rpcParams.p_km_inicial = parseFloat(kmInicial);
    }
    const { data, error } = await (supabase.rpc as any)('handle_team_checkin', rpcParams);

    if (error) {
      toast({ title: 'Erro ao fazer check-in', description: error.message, variant: 'destructive' });
    } else if (data?.error) {
      toast({ title: 'Erro', description: data.error, variant: 'destructive' });
    } else {
      toast({ title: `Check-in realizado para ${member.profiles?.nome || 'profissional'}!` });
      onUpdate();
    }
    setIsProcessing(false);
  };

  const handleCheckout = async () => {
    setIsProcessing(true);
    const rpcParams: Record<string, unknown> = { p_assignment_id: member.id };
    if (kmFinal.trim()) {
      rpcParams.p_km_final = parseFloat(kmFinal);
    }
    const { data, error } = await (supabase.rpc as any)('handle_team_checkout', rpcParams);

    if (error) {
      toast({ title: 'Erro ao fazer checkout', description: error.message, variant: 'destructive' });
    } else if (data?.error) {
      toast({ title: 'Erro', description: data.error, variant: 'destructive' });
    } else {
      const paymentValue = data?.payment_value || 0;
      const timeDesc = data?.time_description || '';
      toast({
        title: `Checkout realizado para ${member.profiles?.nome || 'profissional'}!`,
        description: paymentValue > 0
          ? `Pagamento de R$ ${paymentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} gerado (${timeDesc}).`
          : timeDesc ? `Tempo trabalhado: ${timeDesc}` : undefined,
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
          <p className="font-medium">{member.profiles?.nome || 'Profissional'}</p>
          <p className="text-sm text-muted-foreground">{member.profiles?.especialidade || ''}</p>
        </div>
        {getStatusBadge()}
      </div>

      {/* Time & KM info */}
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
          {member.km_inicial != null && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Gauge className="w-3.5 h-3.5" />
              <span>KM Inicial: {member.km_inicial.toLocaleString('pt-BR')}</span>
            </div>
          )}
          {member.km_final != null && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Gauge className="w-3.5 h-3.5" />
              <span>KM Final: {member.km_final.toLocaleString('pt-BR')}</span>
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      {!member.checkout_at && (
        <>
          {!member.checkin_at ? (
            <>
              <div className="space-y-1">
                <Label htmlFor={`km-inicial-${member.id}`} className="text-xs text-muted-foreground">KM Inicial</Label>
                <Input
                  id={`km-inicial-${member.id}`}
                  type="number"
                  placeholder="Ex: 12500"
                  value={kmInicial}
                  onChange={(e) => setKmInicial(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <Button
                onClick={handleCheckin}
                disabled={isProcessing || !isCheckinWindowOpen()}
                size="sm"
                className="w-full"
              >
                {isProcessing ? 'Processando...' : (
                  <>
                    <LogIn className="w-4 h-4 mr-1" />
                    Fazer Check-in
                  </>
                )}
              </Button>
              {!isCheckinWindowOpen() && getCheckinWindowMessage() && (
                <p className="text-xs text-warning text-center">
                  {getCheckinWindowMessage()}
                </p>
              )}
            </>
          ) : (
            <>
              <div className="space-y-1">
                <Label htmlFor={`km-final-${member.id}`} className="text-xs text-muted-foreground">KM Final</Label>
                <Input
                  id={`km-final-${member.id}`}
                  type="number"
                  placeholder="Ex: 12650"
                  value={kmFinal}
                  onChange={(e) => setKmFinal(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <Button
                onClick={handleCheckout}
                disabled={isProcessing || !checkoutEnabled}
                size="sm"
                className={`w-full ${checkoutEnabled ? 'bg-warning hover:bg-warning/90' : ''}`}
              >
                {isProcessing ? 'Processando...' : (
                  <>
                    <LogOut className="w-4 h-4 mr-1" />
                    Fazer Checkout
                  </>
                )}
              </Button>
            </>
          )}
        </>
      )}
    </div>
  );
}
