import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Plus,
  Calendar,
  MapPin,
  Truck,
  Users,
  FileText,
  Clock,
  Fuel,
  PenLine,
  Gauge,
  Save,
  CheckCircle2,
  Printer,
  Ambulance,
  Phone,
  User,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import APHForm from "@/components/APHForm";
import TeamMemberCheckin from "@/components/TeamMemberCheckin";
import EventSignature from "@/components/EventSignature";

interface Event {
  id: string;
  nome_evento: string;
  data_inicio: string;
  data_fim: string;
  local: string;
  status: string;
  viatura_id: string | null;
  base_id: string; // Adicionado conforme o erro
  client_id: string; // Adicionado conforme o erro
  created_at: string; // Adicionado conforme o erro
  equipe_completa: boolean;
  equipe_minima: number;
  valor_litro_combustivel: number | null;
  consumo_medio_km_litro: number | null;
  km_inicial: number | null;
  km_final: number | null;
  min_antes_saida_base: number | null;
  horario_saida_base: string | null;
  tipo_unidade: string | null;
  user_id: string | null;
  vehicles?: { prefixo: string; modelo: string };
  // O campo que está causando o erro:
  responsible_profile?: { nome: string; telefone: string | null } | null;
}

interface Attendance {
  id: string;
  nome_paciente: string;
  queixa_principal: string;
  status: string;
  created_at: string;
  hospital_destino: string | null;
  profiles?: { nome: string };
}

interface TeamMember {
  id: string;
  profile_id: string;
  checkin_at: string | null;
  checkout_at: string | null;
  km_inicial: number | null;
  km_final: number | null;
  profiles: { id: string; nome: string; especialidade: string };
}

interface SignatureRecord {
  id: string;
  tipo: string;
}

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();

  const [event, setEvent] = useState<Event | null>(null);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState<string | null>(null);
  const [signatures, setSignatures] = useState<SignatureRecord[]>([]);

  // KM state
  const [kmInicial, setKmInicial] = useState("");
  const [kmFinal, setKmFinal] = useState("");
  const [isSavingKm, setIsSavingKm] = useState(false);

  const fetchData = async () => {
    if (!id) return;

    setIsLoading(true);

    const [eventRes, attendancesRes, teamRes, sigRes] = await Promise.all([
      supabase.from("events").select("*, vehicles(prefixo, modelo)").eq("id", id).single(),
      supabase
        .from("clinical_attendances")
        .select("*, profiles(nome)")
        .eq("event_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("event_assignments")
        .select("id, profile_id, checkin_at, checkout_at, profiles(id, nome, especialidade)")
        .eq("event_id", id),
      supabase.from("event_signatures").select("id, tipo").eq("event_id", id),
    ]);

    if (eventRes.error) {
      toast({ title: "Evento não encontrado", variant: "destructive" });
      navigate("/events");
      return;
    }

 let eventData = eventRes.data;
    let responsibleProfileData = null;

    // 1. Busca o perfil responsável separadamente
    if (eventData?.user_id) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("nome, telefone")
        .eq("user_id", eventData.user_id)
        .single();
      responsibleProfileData = profileData;
    }

    // 2. Monta o objeto final garantindo a tipagem da interface Event
    const finalEvent: Event = {
      ...eventData,
      // Garante que o responsible_profile seja injetado respeitando a interface
      responsible_profile: responsibleProfileData,
    } as unknown as Event;

    // 3. Atualiza os estados
    setEvent(finalEvent);
    setKmInicial(eventData.km_inicial?.toString() || "");
    setKmFinal(eventData.km_final?.toString() || "");
    setAttendances(attendancesRes.data || []);
    setTeam((teamRes.data || []).filter((m: any) => m.profiles) as TeamMember[]);
    setSignatures((sigRes.data || []) as SignatureRecord[]);
    setIsLoading(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleFormClose = () => {
    setShowForm(false);
    setEditingAttendance(null);
    fetchData();
  };

  const handleSaveKm = async () => {
    if (!event) return;
    setIsSavingKm(true);

    const kmInicialNum = kmInicial ? parseFloat(kmInicial) : null;
    const kmFinalNum = kmFinal ? parseFloat(kmFinal) : null;

    if (kmInicialNum !== null && kmFinalNum !== null && kmFinalNum < kmInicialNum) {
      toast({ title: "KM final deve ser maior que o inicial", variant: "destructive" });
      setIsSavingKm(false);
      return;
    }

    const { error } = await supabase
      .from("events")
      .update({ km_inicial: kmInicialNum, km_final: kmFinalNum })
      .eq("id", event.id);

    if (error) {
      toast({ title: "Erro ao salvar quilometragem", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Quilometragem salva!" });
      await fetchData();
    }
    setIsSavingKm(false);
  };

  // Calculate fuel cost summary from event KM
  const calculateFuelSummary = () => {
    const kmIni = event?.km_inicial || 0;
    const kmFin = event?.km_final || 0;
    const totalKm = kmFin > kmIni ? kmFin - kmIni : 0;

    const valorLitro = event?.valor_litro_combustivel || 0;
    const consumoMedio = event?.consumo_medio_km_litro || 10;
    const litrosUsados = totalKm / consumoMedio;
    const custoTotal = litrosUsados * valorLitro;

    return { totalKm, litrosUsados, custoTotal, valorLitro };
  };

  // Check signatures
  const hasArrivalSignature = signatures.some((s) => s.tipo === "chegada");
  const hasDepartureSignature = signatures.some((s) => s.tipo === "saida");

  const isEventFinalized = event?.status === "finalizado";

  // Checkout requires: event finalized AND departure signature collected
  const canCheckout = isEventFinalized && hasDepartureSignature;

  // Count statuses
  const checkinCount = team.filter((m) => m.checkin_at).length;
  const checkoutCount = team.filter((m) => m.checkout_at).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!event) return null;

  if (showForm || editingAttendance) {
    return <APHForm eventId={event.id} attendanceId={editingAttendance} onClose={handleFormClose} />;
  }

  const fuelSummary = calculateFuelSummary();

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/events")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">{event.nome_evento}</h1>
            {event.tipo_unidade && (
              <Badge className="bg-primary/10 text-primary border-primary/20">{event.tipo_unidade}</Badge>
            )}
            {isEventFinalized ? (
              <Badge className="bg-stable/20 text-stable">Finalizado</Badge>
            ) : new Date(event.data_fim) < new Date() ? (
              <Badge className="bg-warning/20 text-warning border-warning/30 animate-pulse-soft">
                Aguardando Finalização
              </Badge>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {format(new Date(event.data_inicio), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {event.local}
            </span>
            {event.responsible_profile && (
              <span className="flex items-center gap-1">
                <User className="w-4 h-4" />
                Responsável: {event.responsible_profile.nome}
                {event.responsible_profile.telefone && (
                  <a
                    href={`tel:${event.responsible_profile.telefone}`}
                    className="flex items-center gap-1 text-primary hover:underline ml-1"
                  >
                    <Phone className="w-3 h-3" />
                    {event.responsible_profile.telefone}
                  </a>
                )}
              </span>
            )}
          </div>
        </div>
        {(profile?.cargo === "admin" || profile?.cargo === "gestor") && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => window.open(`/evento/${event.id}/relatorio`, "_blank")}
          >
            <Printer className="w-4 h-4" />
            Relatório
          </Button>
        )}
      </div>

      {/* Removal Alert Banner */}
      {attendances.filter((a) => a.status === "em_remocao").length > 0 && (
        <Card className="border-2 border-destructive bg-destructive/10">
          <CardContent className="p-4">
            {attendances
              .filter((a) => a.status === "em_remocao")
              .map((a) => (
                <div key={a.id} className="flex items-center gap-3">
                  <Ambulance className="w-6 h-6 text-destructive flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-destructive">Paciente em remoção hospitalar</p>
                    <p className="text-sm text-muted-foreground">
                      {a.nome_paciente}
                      {a.hospital_destino ? ` → ${a.hospital_destino}` : ""}
                    </p>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-2 gap-4">
        {event.vehicles && (
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Truck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Viatura</p>
                <p className="font-medium">{event.vehicles.prefixo}</p>
              </div>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Equipe</p>
              <p className="font-medium">
                {checkinCount}/{team.length} check-ins
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vehicle Mileage Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Gauge className="w-4 h-4" />
            Quilometragem da Viatura
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
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
              />
            </div>
          </div>
          <Button onClick={handleSaveKm} disabled={isSavingKm} size="sm" className="w-full">
            <Save className="w-4 h-4 mr-1" />
            {isSavingKm ? "Salvando..." : "Salvar Quilometragem"}
          </Button>
          {/* Show saved KM values */}
          {(event.km_inicial !== null || event.km_final !== null) && (
            <div className="text-xs text-muted-foreground text-center pt-1">
              Salvo: KM Inicial {event.km_inicial ?? "—"} | KM Final {event.km_final ?? "—"}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fuel/Mileage Summary Card */}
      {fuelSummary.totalKm > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Fuel className="w-4 h-4" />
              Resumo de Combustível
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">{fuelSummary.totalKm.toLocaleString("pt-BR")}</p>
                <p className="text-xs text-muted-foreground">KM Total</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{fuelSummary.litrosUsados.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">Litros (est.)</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">
                  R$ {fuelSummary.custoTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground">Custo (est.)</p>
              </div>
            </div>
            {fuelSummary.valorLitro === 0 && (
              <p className="text-xs text-warning text-center mt-2">
                Configure o valor do litro no evento para calcular o custo
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* New Attendance Button */}
      <Button className="w-full btn-touch gap-2" onClick={() => setShowForm(true)} disabled={isEventFinalized}>
        <Plus className="w-5 h-5" />
        Novo Atendimento
      </Button>

      {/* Attendances List */}
      <div className="space-y-3">
        <h2 className="section-header">
          <FileText className="w-5 h-5" />
          Atendimentos ({attendances.length})
        </h2>

        {attendances.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">Nenhum atendimento registrado</p>
            </CardContent>
          </Card>
        ) : (
          attendances.map((att) => (
            <Card
              key={att.id}
              className="cursor-pointer hover:shadow-sm transition-shadow"
              onClick={() => setEditingAttendance(att.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{att.nome_paciente}</p>
                    <p className="text-sm text-muted-foreground mt-1">{att.queixa_principal}</p>
                  </div>
                  <Badge
                    className={
                      att.status === "finalizado"
                        ? "bg-stable/20 text-stable"
                        : att.status === "em_remocao"
                          ? "bg-destructive/20 text-destructive"
                          : "bg-warning/20 text-warning"
                    }
                  >
                    {att.status === "finalizado" ? (
                      "Finalizado"
                    ) : att.status === "em_remocao" ? (
                      <span className="flex items-center gap-1">
                        <Ambulance className="w-3 h-3" />
                        Em Remoção
                      </span>
                    ) : (
                      "Em andamento"
                    )}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(new Date(att.created_at), "HH:mm", { locale: ptBR })}
                  </span>
                  {att.profiles && (
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {att.profiles.nome}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Event Signatures - Arrival & Departure */}
      <div className="space-y-3">
        <h2 className="section-header">
          <PenLine className="w-5 h-5" />
          Assinaturas do Responsável
        </h2>
        <EventSignature eventId={event.id} tipo="chegada" label="Chegada" onSaved={fetchData} />
        {/* Departure signature is always available - not gated on finalization */}
        <EventSignature eventId={event.id} tipo="saida" label="Saída" onSaved={fetchData} />
      </div>

      {/* Finalize Event Button */}
      {!isEventFinalized && (
        <Button
          className="w-full gap-2"
          variant="outline"
          onClick={async () => {
            const { error } = await supabase.from("events").update({ status: "finalizado" }).eq("id", event.id);
            if (error) {
              toast({ title: "Erro ao finalizar evento", description: error.message, variant: "destructive" });
            } else {
              // Release vehicle back to available
              if (event.viatura_id) {
                await supabase
                  .from("vehicles")
                  .update({ status: "disponivel" } as any)
                  .eq("id", event.viatura_id);
              }
              toast({ title: "Evento finalizado com sucesso!" });
              await fetchData();
            }
          }}
        >
          <CheckCircle2 className="w-5 h-5" />
          Finalizar Evento
        </Button>
      )}

      {isEventFinalized && (
        <Card className="border-stable/30 bg-stable/5">
          <CardContent className="py-4 text-center">
            <div className="flex items-center justify-center gap-2 text-stable">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">Evento Finalizado</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team Members - Check-in/Checkout */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            Equipe ({team.length}) — {checkoutCount}/{team.length} concluídos
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {team.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum profissional escalado</p>
          ) : (
            team.map((member) => (
              <TeamMemberCheckin
                key={member.id}
                member={member}
                eventName={event.nome_evento}
                onUpdate={fetchData}
                checkoutEnabled={canCheckout}
                horarioSaidaBase={event.horario_saida_base}
                minAntesSaidaBase={event.min_antes_saida_base}
              />
            ))
          )}
          {!canCheckout && isEventFinalized && !hasDepartureSignature && (
            <p className="text-xs text-muted-foreground text-center">
              Colete a assinatura de saída para liberar o checkout da equipe.
            </p>
          )}
          {!isEventFinalized && (
            <p className="text-xs text-muted-foreground text-center">
              Finalize o evento e colete a assinatura de saída para liberar o checkout.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
