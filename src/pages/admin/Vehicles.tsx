import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Truck, Edit, Trash2, Calendar } from 'lucide-react';

type VehicleStatus = 'disponivel' | 'em_uso' | 'manutencao';

interface Vehicle {
  id: string;
  modelo: string;
  placa: string;
  prefixo: string;
  status: VehicleStatus;
  observacao_manutencao: string | null;
}

interface VehicleEvent {
  id: string;
  nome_evento: string;
  data_inicio: string;
  data_fim: string;
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

export default function AdminVehicles() {
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleEvents, setVehicleEvents] = useState<Record<string, VehicleEvent | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const [formData, setFormData] = useState({
    modelo: '',
    placa: '',
    prefixo: '',
    status: 'disponivel' as VehicleStatus,
  });

  const fetchVehicles = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .order('prefixo');

    if (error) {
      toast({ title: 'Erro ao carregar', description: error.message, variant: 'destructive' });
    } else {
      setVehicles(data || []);
      
      // Fetch events for vehicles that are in use - check if currently within event hours (Brasilia time)
      const vehicleIds = data?.filter(v => v.status === 'em_uso').map(v => v.id) || [];
      if (vehicleIds.length > 0) {
        const now = new Date().toISOString();
        const { data: eventsData } = await supabase
          .from('events')
          .select('id, nome_evento, data_inicio, data_fim, viatura_id')
          .in('viatura_id', vehicleIds)
          .neq('status', 'finalizado')
          .order('data_inicio');

        const eventsMap: Record<string, VehicleEvent | null> = {};
        eventsData?.forEach(event => {
          if (event.viatura_id && !eventsMap[event.viatura_id]) {
            // Only show as "empenhada" if current time is within event period
            const eventStart = new Date(event.data_inicio);
            const eventEnd = new Date(event.data_fim);
            const currentTime = new Date(now);
            
            if (currentTime >= eventStart && currentTime <= eventEnd) {
              eventsMap[event.viatura_id] = {
                id: event.id,
                nome_evento: event.nome_evento,
                data_inicio: event.data_inicio,
                data_fim: event.data_fim,
              };
            }
          }
        });
        setVehicleEvents(eventsMap);
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const resetForm = () => {
    setFormData({ modelo: '', placa: '', prefixo: '', status: 'disponivel' });
    setEditingVehicle(null);
  };

  const openEditDialog = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      modelo: vehicle.modelo,
      placa: vehicle.placa,
      prefixo: vehicle.prefixo,
      status: vehicle.status,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingVehicle) {
      const { error } = await supabase
        .from('vehicles')
        .update(formData)
        .eq('id', editingVehicle.id);

      if (error) {
        toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Viatura atualizada!' });
    } else {
      const { error } = await supabase.from('vehicles').insert(formData);

      if (error) {
        if (error.message.includes('duplicate')) {
          toast({ title: 'Placa já cadastrada', variant: 'destructive' });
        } else {
          toast({ title: 'Erro ao criar', description: error.message, variant: 'destructive' });
        }
        return;
      }
      toast({ title: 'Viatura cadastrada!' });
    }

    setDialogOpen(false);
    resetForm();
    fetchVehicles();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta viatura?')) return;

    const { error } = await supabase.from('vehicles').delete().eq('id', id);

    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Viatura excluída!' });
      fetchVehicles();
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
        <div>
          <h1 className="text-2xl font-bold text-foreground">Viaturas</h1>
          <p className="text-muted-foreground">Gerencie a frota de ambulâncias</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="btn-touch gap-2">
              <Plus className="w-5 h-5" />
              Nova Viatura
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingVehicle ? 'Editar Viatura' : 'Nova Viatura'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Prefixo</Label>
                <Input
                  value={formData.prefixo}
                  onChange={(e) => setFormData(prev => ({ ...prev, prefixo: e.target.value }))}
                  placeholder="Ex: USA-01"
                  className="input-touch"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Modelo</Label>
                <Input
                  value={formData.modelo}
                  onChange={(e) => setFormData(prev => ({ ...prev, modelo: e.target.value }))}
                  placeholder="Ex: Sprinter 415"
                  className="input-touch"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Placa</Label>
                <Input
                  value={formData.placa}
                  onChange={(e) => setFormData(prev => ({ ...prev, placa: e.target.value.toUpperCase() }))}
                  placeholder="ABC-1234"
                  className="input-touch"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, status: v as VehicleStatus }))}
                >
                  <SelectTrigger className="input-touch">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disponivel">Disponível</SelectItem>
                    <SelectItem value="em_uso">Em Uso</SelectItem>
                    <SelectItem value="manutencao">Manutenção</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full btn-touch">
                {editingVehicle ? 'Salvar' : 'Cadastrar'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {vehicles.length === 0 ? (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="py-12 text-center">
              <Truck className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma viatura cadastrada</p>
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
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(vehicle)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(vehicle.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{vehicle.placa}</span>
                    <Badge className={statusColors[vehicle.status]}>
                      {statusLabels[vehicle.status]}
                    </Badge>
                  </div>
                  {vehicle.status === 'em_uso' && event ? (
                    <div className="p-2 rounded-lg bg-warning/10 border border-warning/20">
                      <div className="flex items-center gap-2 text-sm text-warning">
                        <Calendar className="w-4 h-4" />
                        <span className="font-medium">Empenhada em:</span>
                      </div>
                      <p className="text-sm mt-1 font-medium">{event.nome_evento}</p>
                    </div>
                  ) : vehicle.status === 'em_uso' && !event ? (
                    <p className="text-xs text-muted-foreground italic">
                      Fora do horário do evento atual
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
