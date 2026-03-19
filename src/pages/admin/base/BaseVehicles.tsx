import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Truck, ArrowLeft, Plus, Calendar, X } from 'lucide-react';

type VehicleStatus = 'disponivel' | 'em_uso' | 'manutencao';

interface Vehicle {
  id: string;
  modelo: string;
  placa: string;
  prefixo: string;
  status: VehicleStatus;
  base_id: string | null;
}

interface VehicleEvent {
  id: string;
  nome_evento: string;
  data_inicio: string;
  data_fim: string;
}

interface Base {
  id: string;
  nome: string;
  sigla: string;
}

const statusLabels: Record<VehicleStatus, string> = {
  disponivel: 'Disponível',
  em_uso: 'Em Uso',
  manutencao: 'Manutenção',
};

const statusColors: Record<VehicleStatus, string> = {
  disponivel: 'bg-stable text-stable-foreground',
  em_uso: 'bg-warning text-warning-foreground',
  manutencao: 'bg-critical text-critical-foreground',
};

export default function BaseVehicles() {
  const { baseId } = useParams<{ baseId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [base, setBase] = useState<Base | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [unassignedVehicles, setUnassignedVehicles] = useState<Vehicle[]>([]);
  const [vehicleEvents, setVehicleEvents] = useState<Record<string, VehicleEvent | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');

  const fetchData = async () => {
    if (!baseId) return;
    setIsLoading(true);

    const [baseRes, vehiclesRes, allVehiclesRes] = await Promise.all([
      supabase.from('bases').select('id, nome, sigla').eq('id', baseId).single(),
      supabase.from('vehicles').select('*').eq('base_id', baseId).order('prefixo'),
      supabase.from('vehicles').select('*').is('base_id', null).order('prefixo'),
    ]);

    if (baseRes.data) setBase(baseRes.data);
    if (vehiclesRes.data) {
      setVehicles(vehiclesRes.data as Vehicle[]);

      const vehicleIds = vehiclesRes.data.map(v => v.id);
      if (vehicleIds.length > 0) {
        const now = new Date();
        const { data: eventsData } = await supabase
          .from('events')
          .select('id, nome_evento, data_inicio, data_fim, viatura_id')
          .in('viatura_id', vehicleIds)
          .neq('status', 'finalizado')
          .order('data_inicio');

        const eventsMap: Record<string, (VehicleEvent & { type: 'empenhada' | 'reservada' | 'aguardando' }) | null> = {};
        eventsData?.forEach(event => {
          if (event.viatura_id && !eventsMap[event.viatura_id]) {
            const eventStart = new Date(event.data_inicio);
            const eventEnd = new Date(event.data_fim);
            
            let type: 'empenhada' | 'reservada' | 'aguardando';
            if (now >= eventStart && now <= eventEnd) {
              type = 'empenhada';
            } else if (now < eventStart) {
              type = 'reservada';
            } else {
              type = 'aguardando';
            }
            
            eventsMap[event.viatura_id] = {
              id: event.id,
              nome_evento: event.nome_evento,
              data_inicio: event.data_inicio,
              data_fim: event.data_fim,
              type,
            };
          }
        });
        setVehicleEvents(eventsMap);
      }
    }
    if (allVehiclesRes.data) setUnassignedVehicles(allVehiclesRes.data as Vehicle[]);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [baseId]);

  const handleAssignVehicle = async () => {
    if (!selectedVehicleId) return;
    const { error } = await supabase
      .from('vehicles')
      .update({ base_id: baseId } as any)
      .eq('id', selectedVehicleId);

    if (error) {
      toast({ title: 'Erro ao vincular viatura', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Viatura vinculada à base!' });
      setDialogOpen(false);
      setSelectedVehicleId('');
      fetchData();
    }
  };

  const handleUnassignVehicle = async (vehicleId: string) => {
    if (!confirm('Desvincular esta viatura da base?')) return;
    const { error } = await supabase
      .from('vehicles')
      .update({ base_id: null } as any)
      .eq('id', vehicleId);

    if (error) {
      toast({ title: 'Erro ao desvincular', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Viatura desvinculada!' });
      fetchData();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/vehicles')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Viaturas — {base?.nome}
            </h1>
            <p className="text-muted-foreground">Viaturas estacionadas nesta base</p>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-touch gap-2">
              <Plus className="w-5 h-5" />
              Vincular Viatura
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Vincular Viatura à Base</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Viatura disponível (sem base)</Label>
                <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                  <SelectTrigger className="input-touch"><SelectValue placeholder="Selecione uma viatura" /></SelectTrigger>
                  <SelectContent>
                    {unassignedVehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.prefixo} - {v.modelo} ({v.placa})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {unassignedVehicles.length === 0 && (
                <p className="text-sm text-muted-foreground">Todas as viaturas já estão vinculadas a uma base.</p>
              )}
              <Button onClick={handleAssignVehicle} disabled={!selectedVehicleId} className="w-full btn-touch">
                Vincular
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {vehicles.length === 0 ? (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="py-12 text-center">
              <Truck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma viatura vinculada a esta base</p>
            </CardContent>
          </Card>
        ) : (
          vehicles.map((vehicle) => {
            const event = vehicleEvents[vehicle.id];
            return (
              <Card key={vehicle.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Truck className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{vehicle.prefixo}</CardTitle>
                        <p className="text-sm text-muted-foreground">{vehicle.modelo}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleUnassignVehicle(vehicle.id)} title="Desvincular da base">
                      <X className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{vehicle.placa}</span>
                    <Badge className={statusColors[vehicle.status]}>
                      {statusLabels[vehicle.status]}
                    </Badge>
                  </div>
                  {event && (event as any).type === 'empenhada' && (
                    <div className="p-2 rounded-lg bg-warning/10 border border-warning/20">
                      <div className="flex items-center gap-2 text-sm text-warning">
                        <Calendar className="w-4 h-4" />
                        <span className="font-medium">Empenhada em:</span>
                      </div>
                      <p className="text-sm mt-1 font-medium">{event.nome_evento}</p>
                    </div>
                  )}
                  {event && (event as any).type === 'reservada' && (
                    <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                      <div className="flex items-center gap-2 text-sm text-primary">
                        <Calendar className="w-4 h-4" />
                        <span className="font-medium">Reservada para:</span>
                      </div>
                      <p className="text-sm mt-1 font-medium">{event.nome_evento}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(event.data_inicio).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  )}
                  {event && (event as any).type === 'aguardando' && (
                    <div className="p-2 rounded-lg bg-warning/10 border border-warning/20">
                      <div className="flex items-center gap-2 text-sm text-warning animate-pulse-soft">
                        <Calendar className="w-4 h-4" />
                        <span className="font-medium">Aguardando finalização:</span>
                      </div>
                      <p className="text-sm mt-1 font-medium">{event.nome_evento}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
