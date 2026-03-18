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
  disponivel: "bg-stable text-stable-foreground",
  em_uso: "bg-warning text-warning-foreground",
  manutencao: "bg-critical text-critical-foreground",
};

// ... (mantenha os imports e tipos iguais)

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
    // Não resetamos o loading se já houver dados para evitar "piscar" a tela no intervalo
    const { data, error } = await supabase.from("vehicles").select("*").order("prefixo");

    if (error) {
      toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
    } else {
      setVehicles(data || []);

      const vehicleIds = data?.filter((v) => v.status === "em_uso").map((v) => v.id) || [];
      if (vehicleIds.length > 0) {
        const now = new Date();
        const { data: eventsData } = await supabase
          .from("events")
          .select("id, nome_evento, data_inicio, data_fim, viatura_id")
          .in("viatura_id", vehicleIds)
          .neq("status", "finalizado");

        const eventsMap: Record<string, VehicleEvent | null> = {};
        eventsData?.forEach((event) => {
          const eventStart = new Date(event.data_inicio);
          const eventEnd = new Date(event.data_fim);

          // Só mapeia o evento se estivermos DENTRO do horário dele
          if (now >= eventStart && now <= eventEnd) {
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

    // Atualiza os status automaticamente a cada 60 segundos
    const interval = setInterval(fetchVehicles, 60000);
    return () => clearInterval(interval);
  }, []);

  // ... (funções resetForm, openEditDialog, handleSubmit, handleDelete permanecem iguais)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      {/* ... (Header e Dialog de Nova Viatura permanecem iguais) ... */}

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
            const activeEvent = vehicleEvents[vehicle.id];

            // LÓGICA DINÂMICA DE STATUS
            // Se no banco está 'em_uso' mas não há evento ativo agora, mostramos como 'disponivel'
            const displayStatus: VehicleStatus =
              vehicle.status === "em_uso" && !activeEvent ? "disponivel" : vehicle.status;

            return (
              <Card key={vehicle.id} className={displayStatus === "manutencao" ? "opacity-90" : ""}>
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
                    <Badge className={statusColors[displayStatus]}>{statusLabels[displayStatus]}</Badge>
                  </div>

                  {/* Mostra detalhes do evento apenas se houver um ativo no momento */}
                  {activeEvent ? (
                    <div className="p-2 rounded-lg bg-warning/10 border border-warning/20 animate-pulse">
                      <div className="flex items-center gap-2 text-sm text-warning">
                        <Calendar className="w-4 h-4" />
                        <span className="font-medium">Em operação:</span>
                      </div>
                      <p className="text-sm mt-1 font-semibold text-warning-foreground">{activeEvent.nome_evento}</p>
                    </div>
                  ) : (
                    vehicle.status === "em_uso" && (
                      <div className="p-2 rounded-lg bg-slate-100 border border-slate-200">
                        <p className="text-[10px] uppercase font-bold text-slate-500">Próximo Empenho</p>
                        <p className="text-xs text-muted-foreground italic">
                          Viatura reservada (fora do horário do evento)
                        </p>
                      </div>
                    )
                  )}

                  {vehicle.status === "manutencao" && vehicle.observacao_manutencao && (
                    <div className="p-2 rounded-lg bg-critical/10 border border-critical/20">
                      <p className="text-xs font-medium text-critical">Oficina:</p>
                      <p className="text-sm mt-0.5">{vehicle.observacao_manutencao}</p>
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
