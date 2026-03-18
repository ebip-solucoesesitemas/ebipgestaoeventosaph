import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Truck, Edit, Trash2, Calendar } from "lucide-react";

type VehicleStatus = "disponivel" | "em_uso" | "manutencao";

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
  disponivel: "Disponível",
  em_uso: "Em Uso",
  manutencao: "Manutenção",
};

const statusColors: Record<VehicleStatus, string> = {
  disponivel: "bg-emerald-500 text-white",
  em_uso: "bg-amber-500 text-white",
  manutencao: "bg-red-500 text-white",
};

export default function AdminVehicles() {
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleEvents, setVehicleEvents] = useState<Record<string, VehicleEvent | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const [formData, setFormData] = useState({
    modelo: "",
    placa: "",
    prefixo: "",
    status: "disponivel" as VehicleStatus,
    observacao_manutencao: "",
  });

  const fetchVehicles = async () => {
    const { data, error } = await supabase.from("vehicles").select("*").order("prefixo");

    if (error) {
      toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
    } else {
      setVehicles(data || []);

      const vehicleIds = data?.filter((v) => v.status === "em_uso").map((v) => v.id) || [];

      if (vehicleIds.length > 0) {
        // Pega o horário atual exato
        const now = new Date().getTime();

        const { data: eventsData } = await supabase
          .from("events")
          .select("id, nome_evento, data_inicio, data_fim, viatura_id")
          .in("viatura_id", vehicleIds)
          .neq("status", "finalizado");

        const eventsMap: Record<string, VehicleEvent | null> = {};

        eventsData?.forEach((event) => {
          // Converte as datas do banco para o timestamp numérico para comparação segura
          const start = new Date(event.data_inicio).getTime();
          const end = new Date(event.data_fim).getTime();

          // DEBUG: Descomente a linha abaixo no seu console para ver o que está acontecendo
          // console.log(`Viatura: ${event.viatura_id} | Agora: ${now} | Início: ${start} | Fim: ${end}`);

          if (now >= start && now <= end) {
            eventsMap[event.viatura_id] = {
              id: event.id,
              nome_evento: event.nome_evento,
              data_inicio: event.data_inicio,
              data_fim: event.data_fim,
            };
          }
        });
        setVehicleEvents(eventsMap);
      } else {
        setVehicleEvents({});
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchVehicles();
    const interval = setInterval(fetchVehicles, 60000);
    return () => clearInterval(interval);
  }, []);

  const resetForm = () => {
    setFormData({ modelo: "", placa: "", prefixo: "", status: "disponivel", observacao_manutencao: "" });
    setEditingVehicle(null);
  };

  const openEditDialog = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      modelo: vehicle.modelo,
      placa: vehicle.placa,
      prefixo: vehicle.prefixo,
      status: vehicle.status,
      observacao_manutencao: vehicle.observacao_manutencao || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      observacao_manutencao: formData.status === "manutencao" ? formData.observacao_manutencao || null : null,
    };

    if (editingVehicle) {
      const { error } = await supabase.from("vehicles").update(payload).eq("id", editingVehicle.id);
      if (error) {
        toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Viatura atualizada!" });
    } else {
      const { error } = await supabase.from("vehicles").insert(payload);
      if (error) {
        toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Viatura cadastrada!" });
    }

    setDialogOpen(false);
    resetForm();
    fetchVehicles();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta viatura?")) return;
    const { error } = await supabase.from("vehicles").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Viatura excluída!" });
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
          <h1 className="text-2xl font-bold">Viaturas</h1>
          <p className="text-muted-foreground">Gestão de frota em tempo real</p>
        </div>

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-5 h-5" /> Nova Viatura
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingVehicle ? "Editar Viatura" : "Nova Viatura"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Prefixo</Label>
                <Input
                  value={formData.prefixo}
                  onChange={(e) => setFormData((p) => ({ ...p, prefixo: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Modelo</Label>
                <Input
                  value={formData.modelo}
                  onChange={(e) => setFormData((p) => ({ ...p, modelo: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Placa</Label>
                <Input
                  value={formData.placa}
                  onChange={(e) => setFormData((p) => ({ ...p, placa: e.target.value.toUpperCase() }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Status Base (no sistema)</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData((p) => ({ ...p, status: v as VehicleStatus }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disponivel">Disponível</SelectItem>
                    <SelectItem value="em_uso">Em Uso (Agendada)</SelectItem>
                    <SelectItem value="manutencao">Manutenção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.status === "manutencao" && (
                <div className="space-y-2">
                  <Label>Observação</Label>
                  <Input
                    value={formData.observacao_manutencao}
                    onChange={(e) => setFormData((p) => ({ ...p, observacao_manutencao: e.target.value }))}
                  />
                </div>
              )}
              <Button type="submit" className="w-full">
                Salvar
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {vehicles.map((vehicle) => {
          const activeEvent = vehicleEvents[vehicle.id];

          // Se no banco está 'em_uso', mas o activeEvent está vazio (porque o horário não bate),
          // ele VAI ser 'disponivel'.
          const displayStatus: VehicleStatus =
            vehicle.status === "em_uso" && !activeEvent ? "disponivel" : vehicle.status;

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
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono">{vehicle.placa}</span>
                  <Badge className={statusColors[displayStatus]}>{statusLabels[displayStatus]}</Badge>
                </div>

                {activeEvent ? (
                  <div className="p-2 rounded-lg bg-amber-50 border border-amber-200">
                    <div className="flex items-center gap-2 text-xs text-amber-700 font-bold">
                      <Calendar className="w-3 h-3" /> EM OPERAÇÃO AGORA:
                    </div>
                    <p className="text-sm font-medium">{activeEvent.nome_evento}</p>
                  </div>
                ) : (
                  vehicle.status === "em_uso" && (
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                      <p className="text-[10px] uppercase font-bold text-slate-400 italic">
                        Aguardando Horário do Evento
                      </p>
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
