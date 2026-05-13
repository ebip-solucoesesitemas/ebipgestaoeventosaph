import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Calendar,
  MapPin,
  Truck,
  Users,
  Edit,
  Trash2,
  ArrowLeft,
  Eye,
  Clock,
  Copy,
  MessageCircle,
  Search,
  Filter,
  XCircle,
  Phone,
  User,
} from "lucide-react";
import { CepInput } from "@/components/CepInput";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { localDatetimeToISO, isoToLocalDatetime } from "@/lib/utils";

interface Vehicle {
  id: string;
  modelo: string;
  placa: string;
  prefixo: string;
  status: string;
}

interface Profile {
  id: string;
  nome: string;
  especialidade: string;
}

interface Event {
  id: string;
  nome_evento: string;
  data_inicio: string;
  data_fim: string;
  local: string;
  viatura_id: string | null;
  equipe_completa: boolean;
  equipe_minima: number;
  status: string;
  vehicles?: Vehicle;
}

interface EventAssignment {
  id: string;
  profile_id: string;
  profiles?: Profile;
}

interface Base {
  id: string;
  nome: string;
  sigla: string;
}

interface Client {
  id: string;
  nome: string;
  endereco: string | null;
}

interface UserAccount {
  id: string;
  nome: string;
  user_id: string;
}

export default function BaseEvents() {
  const { baseId } = useParams<{ baseId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [base, setBase] = useState<Base | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [assignments, setAssignments] = useState<Record<string, EventAssignment[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [profileSearch, setProfileSearch] = useState("");
  const [filterEventName, setFilterEventName] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterProfessional, setFilterProfessional] = useState("");
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    nome_evento: "",
    data_inicio: "",
    data_fim: "",
    local: "",
    cep_local: "",
    viatura_id: "",
    client_id: "",
    equipe_completa: false,
    equipe_minima: 2,
    min_antes_saida_base: "",
    horario_saida_base: "",
    user_id: "",
    selectedProfiles: [] as string[],
    tipo_unidade: "",
    responsavel_evento: "",
    responsavel_telefone: "",
    valor_evento: "",
    forma_cobranca: "",
    data_vencimento: "",
    existing_budget_id: "",
  });

  // Cancel dialog state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelEventId, setCancelEventId] = useState<string | null>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchData = async () => {
    if (!baseId) return;
    setIsLoading(true);

    const [baseRes, eventsRes, allVehiclesRes, availableVehiclesRes, profilesRes, clientsRes, accountsRes] =
      await Promise.all([
        supabase.from("bases").select("id, nome, sigla").eq("id", baseId).single(),
        supabase
          .from("events")
          .select("*, vehicles(*)")
          .eq("base_id", baseId)
          .order("data_inicio", { ascending: false }),
        supabase.from("vehicles").select("*").order("prefixo"),
        supabase.from("vehicles").select("*").eq("base_id", baseId).neq("status", "manutencao"),
        supabase
          .from("profiles")
          .select("id, nome, especialidade")
          .eq("hidden", false)
          .eq("is_account_only", false)
          .eq("base_id", baseId)
          .order("nome"),
        supabase.from("clients").select("id, nome, endereco").order("nome"),
        supabase
          .from("profiles")
          .select("id, nome, user_id")
          .not("user_id", "is", null)
          .eq("hidden", false)
          .order("nome"),
      ]);

    if (baseRes.data) setBase(baseRes.data);
    if (eventsRes.data) {
      setEvents(eventsRes.data);
      const eventIds = eventsRes.data.map((e) => e.id);
      if (eventIds.length > 0) {
        const { data: assignmentsData } = await supabase
          .from("event_assignments")
          .select("*, profiles(id, nome, especialidade)")
          .in("event_id", eventIds);

        const grouped: Record<string, EventAssignment[]> = {};
        assignmentsData?.forEach((a) => {
          if (!grouped[a.event_id]) grouped[a.event_id] = [];
          grouped[a.event_id].push(a);
        });
        setAssignments(grouped);
      }
    }
    if (allVehiclesRes.data) setAllVehicles(allVehiclesRes.data);
    if (availableVehiclesRes.data) setVehicles(availableVehiclesRes.data);
    if (profilesRes.data) setProfiles(profilesRes.data);
    if (clientsRes.data) setClients(clientsRes.data);
    if (accountsRes.data) setUserAccounts(accountsRes.data as UserAccount[]);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [baseId]);

  const resetForm = () => {
    setFormData({
      nome_evento: "",
      data_inicio: "",
      data_fim: "",
      local: "",
      cep_local: "",
      viatura_id: "",
      client_id: "",
      equipe_completa: false,
      equipe_minima: 2,
      min_antes_saida_base: "",
      horario_saida_base: "",
      user_id: "",
      selectedProfiles: [],
      tipo_unidade: "",
      responsavel_evento: "",
      responsavel_telefone: "",
    });
    setEditingEvent(null);
  };

  const openEditDialog = async (event: Event) => {
    setEditingEvent(event);
    const { data } = await supabase
      .from("events")
      .select("min_antes_saida_base, horario_saida_base, client_id, user_id, tipo_unidade, responsavel_telefone")
      .eq("id", event.id)
      .single();
    setFormData({
      nome_evento: event.nome_evento,
      data_inicio: isoToLocalDatetime(event.data_inicio),
      data_fim: isoToLocalDatetime(event.data_fim),
      local: event.local,
      cep_local: "",
      viatura_id: event.viatura_id || "",
      client_id: (data as any)?.client_id || "",
      equipe_completa: event.equipe_completa || false,
      equipe_minima: event.equipe_minima || 2,
      min_antes_saida_base: (data as any)?.min_antes_saida_base?.toString() || "",
      horario_saida_base: (data as any)?.horario_saida_base ? isoToLocalDatetime((data as any).horario_saida_base) : "",
      user_id: (data as any)?.user_id || "",
      selectedProfiles: assignments[event.id]?.map((a) => a.profile_id) || [],
      tipo_unidade: (data as any)?.tipo_unidade || "",
      responsavel_evento: (data as any)?.responsavel_evento || "",
      responsavel_telefone: (data as any)?.responsavel_telefone || "",
    });
    setDialogOpen(true);
  };

  const checkVehicleConflict = async (
    viaturaId: string,
    dataInicio: string,
    dataFim: string,
    editingEventId?: string,
  ) => {
    let query = supabase
      .from("events")
      .select("id, nome_evento, data_inicio, data_fim")
      .eq("viatura_id", viaturaId)
      .neq("status", "finalizado");

    if (editingEventId) {
      query = query.neq("id", editingEventId);
    }

    const { data } = await query;
    if (!data) return [];

    const novoInicio = new Date(dataInicio);
    const novoFim = new Date(dataFim);

    return data.filter((ev) => {
      const evInicio = new Date(ev.data_inicio);
      const evFim = new Date(ev.data_fim);
      return novoInicio < evFim && novoFim > evInicio;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
    const dataInicioISO = localDatetimeToISO(formData.data_inicio);
    const dataFimISO = localDatetimeToISO(formData.data_fim);

    // Validar conflito de viatura
    if (formData.viatura_id) {
      const conflitos = await checkVehicleConflict(formData.viatura_id, dataInicioISO, dataFimISO, editingEvent?.id);
      if (conflitos.length > 0) {
        const confirmar = confirm(
          `A viatura já está reservada para o evento "${conflitos[0].nome_evento}" neste período.\n\nDeseja continuar mesmo assim?`,
        );
        if (!confirmar) return;
      }
    }

    const eventData = {
      nome_evento: formData.nome_evento,
      data_inicio: dataInicioISO,
      data_fim: dataFimISO,
      local: formData.local,
      viatura_id: formData.viatura_id || null,
      client_id: formData.client_id || null,
      equipe_completa: formData.equipe_completa,
      equipe_minima: formData.equipe_minima,
      min_antes_saida_base: formData.min_antes_saida_base ? parseInt(formData.min_antes_saida_base) : null,
      horario_saida_base: formData.horario_saida_base ? localDatetimeToISO(formData.horario_saida_base) : null,
      user_id: formData.user_id || null,
      base_id: baseId,
      tipo_unidade: formData.tipo_unidade || null,
      responsavel_evento: formData.responsavel_evento || null,
      responsavel_telefone: formData.responsavel_telefone || null,
    };

    let eventId: string;
    const oldViaturaId = editingEvent?.viatura_id;

    if (editingEvent) {
      const { error } = await supabase.from("events").update(eventData).eq("id", editingEvent.id);
      if (error) {
        toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
        return;
      }
      eventId = editingEvent.id;
      await supabase.from("event_assignments").delete().eq("event_id", eventId);
      if (oldViaturaId && oldViaturaId !== formData.viatura_id) {
        await supabase.from("vehicles").update({ status: "disponivel" }).eq("id", oldViaturaId);
      }
    } else {
      const { data, error } = await supabase.from("events").insert(eventData).select().single();
      if (error) {
        toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
        return;
      }
      eventId = data.id;
    }

    if (formData.viatura_id) {
      await supabase.from("vehicles").update({ status: "em_uso" }).eq("id", formData.viatura_id);
    }

    if (formData.selectedProfiles.length > 0) {
      await supabase
        .from("event_assignments")
        .insert(formData.selectedProfiles.map((profileId) => ({ event_id: eventId, profile_id: profileId })));
    }

    toast({ title: editingEvent ? "Evento atualizado!" : "Evento criado!" });
    setDialogOpen(false);
    resetForm();
    await fetchData();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este evento?")) return;
    const event = events.find((e) => e.id === id);
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      if (event?.viatura_id) {
        await supabase.from("vehicles").update({ status: "disponivel" }).eq("id", event.viatura_id);
      }
      toast({ title: "Evento excluído!" });
      fetchData();
    }
  };

  const toggleProfile = (profileId: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedProfiles: prev.selectedProfiles.includes(profileId)
        ? prev.selectedProfiles.filter((id) => id !== profileId)
        : [...prev.selectedProfiles, profileId],
    }));
  };

  const getAvailableVehicles = () => {
    if (editingEvent?.viatura_id) {
      const current = allVehicles.find((v) => v.id === editingEvent.viatura_id);
      if (current && !vehicles.find((v) => v.id === current.id)) return [...vehicles, current];
    }
    return vehicles;
  };

  const duplicateEvent = (event: Event) => {
    setEditingEvent(null);
    const fetchDetails = async () => {
      const { data } = await supabase
        .from("events")
        .select("min_antes_saida_base, horario_saida_base, client_id, user_id, tipo_unidade, responsavel_telefone")
        .eq("id", event.id)
        .single();
      setFormData({
        nome_evento: event.nome_evento,
        data_inicio: "",
        data_fim: "",
        local: event.local,
        cep_local: "",
        viatura_id: "",
        client_id: (data as any)?.client_id || "",
        equipe_completa: false,
        equipe_minima: event.equipe_minima || 2,
        min_antes_saida_base: (data as any)?.min_antes_saida_base?.toString() || "",
        horario_saida_base: "",
        user_id: (data as any)?.user_id || "",
        selectedProfiles: assignments[event.id]?.map((a) => a.profile_id) || [],
        tipo_unidade: (data as any)?.tipo_unidade || "",
        responsavel_evento: (data as any)?.responsavel_evento || "",
        responsavel_telefone: (data as any)?.responsavel_telefone || "",
      });
    };
    fetchDetails();
    setDialogOpen(true);
    toast({ title: "Evento duplicado", description: "Ajuste as datas e salve como novo evento." });
  };

  const handleCancelEvent = async () => {
    if (!cancelEventId || !motivoCancelamento.trim()) return;
    setIsCancelling(true);

    const event = events.find((e) => e.id === cancelEventId);

    const { error } = await supabase
      .from("events")
      .update({
        status: "cancelado",
        motivo_cancelamento: motivoCancelamento.trim(),
      } as any)
      .eq("id", cancelEventId);

    if (error) {
      toast({ title: "Erro ao cancelar evento", description: error.message, variant: "destructive" });
    } else {
      if (event?.viatura_id) {
        await supabase.from("vehicles").update({ status: "disponivel" }).eq("id", event.viatura_id);
      }
      toast({ title: "Evento cancelado com sucesso" });
      setCancelDialogOpen(false);
      setCancelEventId(null);
      setMotivoCancelamento("");
      await fetchData();
    }
    setIsCancelling(false);
  };

  const sendWhatsApp = (event: Event, profileId: string) => {
    const sendMessage = async () => {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("nome, telefone")
        .eq("id", profileId)
        .single();

      const telefone = (profileData as any)?.telefone;
      if (!telefone) {
        toast({ title: "Profissional sem telefone cadastrado", variant: "destructive" });
        return;
      }

      const dataInicio = format(new Date(event.data_inicio), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
      const dataFim = format(new Date(event.data_fim), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

      // --- LINHA ADICIONADA: Definindo o link (usando 'as any' para evitar erro de build) ---
      const linkAcesso = (event as any).link_acesso || "https://ebipgestaoeventosaph.lovable.app";

      let message = `*Confirmação de Evento*\n\n📋 *Evento:* ${event.nome_evento}\n📅 *Início:* ${dataInicio}\n📅 *Fim:* ${dataFim}\n📍 *Local:* ${event.local}\n`;

      // --- LINHA ADICIONADA: Inserindo o link na mensagem ---
      message += `🔗 *Link:* ${linkAcesso}\n`;

      if (event.vehicles) {
        message += `🚑 *VTR:* ${event.vehicles.prefixo} - ${event.vehicles.modelo} (${(event.vehicles as any).placa})\n`;
      }

      message += `\nPor favor, confirme sua presença.`;

      const phone = telefone.replace(/\D/g, "");
      const phoneWithCountry = phone.startsWith("55") ? phone : `55${phone}`;
      window.open(`https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`, "_blank");
    };
    sendMessage();
  };
  const getEventStatus = (event: Event) => {
    if (event.status === "cancelado") return { label: "Cancelado", color: "bg-red-600 text-white" };
    if (event.status === "finalizado") return { label: "Finalizado", color: "bg-stable/20 text-stable" };
    const now = new Date();
    const start = new Date(event.data_inicio);
    const end = new Date(event.data_fim);
    if (now < start) return { label: "Agendado", color: "bg-muted text-muted-foreground" };
    if (now >= start && now <= end) return { label: "Em andamento", color: "bg-warning/20 text-warning" };
    return { label: "Aguardando Finalização", color: "bg-warning/20 text-warning animate-pulse-soft" };
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
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Eventos — {base?.sigla} {base?.nome}
            </h1>
            <p className="text-muted-foreground">Eventos vinculados a esta base</p>
          </div>
        </div>

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="btn-touch gap-2">
              <Plus className="w-5 h-5" />
              Novo Evento
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingEvent ? "Editar Evento" : "Novo Evento"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Base Vinculada</Label>
                <Input value={base ? `${base.sigla} — ${base.nome}` : ""} disabled className="input-touch bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Nome do Evento</Label>
                <Input
                  value={formData.nome_evento}
                  onChange={(e) => setFormData((prev) => ({ ...prev, nome_evento: e.target.value }))}
                  placeholder="Ex: Show Rock in Rio"
                  className="input-touch"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Início</Label>
                  <Input
                    type="datetime-local"
                    value={formData.data_inicio}
                    onChange={(e) => setFormData((prev) => ({ ...prev, data_inicio: e.target.value }))}
                    className="input-touch"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fim</Label>
                  <Input
                    type="datetime-local"
                    value={formData.data_fim}
                    onChange={(e) => setFormData((prev) => ({ ...prev, data_fim: e.target.value }))}
                    className="input-touch"
                    required
                  />
                </div>
              </div>
              {formData.data_inicio &&
                formData.data_fim &&
                (() => {
                  const diff = new Date(formData.data_fim).getTime() - new Date(formData.data_inicio).getTime();
                  if (diff > 0) {
                    const totalMin = Math.round(diff / 60000);
                    const h = Math.floor(totalMin / 60);
                    const m = totalMin % 60;
                    return (
                      <p className="text-sm text-muted-foreground font-medium">
                        ⏱ Duração: {h > 0 ? `${h}h` : ""}
                        {m > 0 ? ` ${m}min` : ""}
                      </p>
                    );
                  }
                  return null;
                })()}
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(clientId) => {
                    const client = clients.find((c) => c.id === clientId);
                    setFormData((prev) => ({
                      ...prev,
                      client_id: clientId,
                      local: client?.endereco || prev.local,
                    }));
                  }}
                >
                  <SelectTrigger className="input-touch">
                    <SelectValue placeholder="Selecione um cliente (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Responsável do Evento</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    value={formData.responsavel_evento}
                    onChange={(e) => setFormData((prev) => ({ ...prev, responsavel_evento: e.target.value }))}
                    placeholder="Nome do responsável"
                    className="input-touch"
                  />
                  <Input
                    value={formData.responsavel_telefone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, responsavel_telefone: e.target.value }))}
                    placeholder="Telefone do responsável"
                    className="input-touch"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Conta Responsável</Label>
                <Select
                  value={formData.user_id}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, user_id: v }))}
                >
                  <SelectTrigger className="input-touch">
                    <SelectValue placeholder="Selecione uma conta (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {userAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.user_id}>
                        {a.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>CEP do Local</Label>
                <CepInput
                  value={formData.cep_local || ""}
                  onChange={(cep) => setFormData((prev) => ({ ...prev, cep_local: cep }))}
                  onAddressFound={(addr) => setFormData((prev) => ({ ...prev, local: addr.endereco }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Local</Label>
                <Input
                  value={formData.local}
                  onChange={(e) => setFormData((prev) => ({ ...prev, local: e.target.value }))}
                  placeholder="Endereço do evento"
                  className="input-touch"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Viatura</Label>
                <Select
                  value={formData.viatura_id}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, viatura_id: v }))}
                >
                  <SelectTrigger className="input-touch">
                    <SelectValue placeholder="Selecione uma viatura" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableVehicles().map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.prefixo} - {v.modelo} ({v.placa})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="space-y-2">
                  <Label>Tipo de Unidade</Label>
                  <Select
                    value={formData.tipo_unidade}
                    onValueChange={(v) => setFormData((prev) => ({ ...prev, tipo_unidade: v }))}
                  >
                    <SelectTrigger className="input-touch">
                      <SelectValue placeholder="Selecione o tipo de unidade (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Semi Presencial">Semi Presencial</SelectItem>
                      <SelectItem value="Presencial">Presencial</SelectItem>
                      <SelectItem value="USB">USB</SelectItem>
                      <SelectItem value="USA">USA</SelectItem>
                      <SelectItem value="USB dois Técnicos">USB dois Técnicos</SelectItem>
                      <SelectItem value="USA dois Enfermeiros">USA dois Enfermeiros</SelectItem>
                      <SelectItem value="Ambulatório">Ambulatório</SelectItem>
                      <SelectItem value="USB somente condutor">USB somente condutor</SelectItem>
                      <SelectItem value="Usb Plantão">Usb Plantão</SelectItem>
                      <SelectItem value="Usb Plantão + Médico">Usb Plantão + Médico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-3 p-4 border rounded-xl bg-muted/50">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Saída da Base
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Horário de Saída da Base</Label>
                    <Input
                      type="datetime-local"
                      value={formData.horario_saida_base}
                      onChange={(e) => setFormData((prev) => ({ ...prev, horario_saida_base: e.target.value }))}
                      className="input-touch"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Min. antes p/ Check-in</Label>
                    <Input
                      type="number"
                      min={0}
                      value={formData.min_antes_saida_base}
                      onChange={(e) => setFormData((prev) => ({ ...prev, min_antes_saida_base: e.target.value }))}
                      placeholder="Ex: 30"
                      className="input-touch"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Profissionais só poderão fazer check-in dentro do período configurado antes do horário de saída
                </p>
              </div>
              <div className="space-y-3 p-4 border rounded-xl bg-muted/50">
                <Label className="text-base font-semibold">Equipe</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Equipe Mínima</Label>
                    <Input
                      type="number"
                      min={1}
                      value={formData.equipe_minima}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, equipe_minima: parseInt(e.target.value) || 2 }))
                      }
                      className="input-touch"
                    />
                  </div>
                  <div className="flex items-center space-x-2 pt-6">
                    <Checkbox
                      id="equipe_completa"
                      checked={formData.equipe_completa}
                      onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, equipe_completa: !!checked }))}
                    />
                    <Label htmlFor="equipe_completa" className="text-sm cursor-pointer">
                      Equipe completa
                    </Label>
                  </div>
                </div>
              </div>
              <div className="space-y-3 p-4 border rounded-xl bg-muted/50">
                <Label className="text-base font-semibold">Escalar Profissionais</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar profissional..."
                    value={profileSearch}
                    onChange={(e) => setProfileSearch(e.target.value)}
                    className="pl-10 input-touch"
                  />
                </div>
                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                  {profiles
                    .filter(
                      (p) =>
                        p.nome.toLowerCase().includes(profileSearch.toLowerCase()) ||
                        p.especialidade.toLowerCase().includes(profileSearch.toLowerCase()),
                    )
                    .map((p) => (
                      <label
                        key={p.id}
                        className="flex items-center gap-2 text-sm cursor-pointer hover:bg-accent/50 p-1.5 rounded"
                      >
                        <Checkbox
                          checked={formData.selectedProfiles.includes(p.id)}
                          onCheckedChange={() => toggleProfile(p.id)}
                        />
                        <span>{p.nome}</span>
                        <Badge variant="outline" className="text-xs ml-auto">
                          {p.especialidade}
                        </Badge>
                      </label>
                    ))}
                </div>
              </div>
              <Button type="submit" className="w-full btn-touch" disabled={saving}>
                {saving ? "Salvando..." : editingEvent ? "Salvar" : "Criar Evento"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground flex items-center gap-1">
            <Filter className="w-3 h-3" /> Nome
          </Label>
          <Input
            placeholder="Buscar evento..."
            value={filterEventName}
            onChange={(e) => setFilterEventName(e.target.value)}
            className="input-touch w-44"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Data</Label>
          <Input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="input-touch w-44"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Mês</Label>
          <Select value={filterMonth || "all"} onValueChange={(v) => setFilterMonth(v === "all" ? "" : v)}>
            <SelectTrigger className="input-touch w-36">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {[
                "Janeiro",
                "Fevereiro",
                "Março",
                "Abril",
                "Maio",
                "Junho",
                "Julho",
                "Agosto",
                "Setembro",
                "Outubro",
                "Novembro",
                "Dezembro",
              ].map((m, i) => (
                <SelectItem key={i} value={String(i + 1)}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Ano</Label>
          <Select value={filterYear || "all"} onValueChange={(v) => setFilterYear(v === "all" ? "" : v)}>
            <SelectTrigger className="input-touch w-28">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {[...new Set(events.map((e) => new Date(e.data_inicio).getFullYear()))]
                .sort((a, b) => b - a)
                .map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Profissional</Label>
          <Input
            placeholder="Nome do profissional..."
            value={filterProfessional}
            onChange={(e) => setFilterProfessional(e.target.value)}
            className="input-touch w-44"
          />
        </div>
        {(filterEventName || filterDate || filterMonth || filterYear || filterProfessional) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilterEventName("");
              setFilterDate("");
              setFilterMonth("");
              setFilterYear("");
              setFilterProfessional("");
            }}
          >
            Limpar filtros
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(() => {
          const filtered = events.filter((event) => {
            if (filterEventName && !event.nome_evento.toLowerCase().includes(filterEventName.toLowerCase()))
              return false;
            // Extract date parts from ISO string directly to avoid timezone issues
            const eventDateStr = event.data_inicio.slice(0, 10);
            if (filterDate) {
              if (eventDateStr !== filterDate) return false;
            }
            if (filterMonth && !filterDate) {
              const eventMonth = parseInt(eventDateStr.split("-")[1], 10).toString();
              if (eventMonth !== filterMonth) return false;
            }
            if (filterYear && !filterDate) {
              const eventYear = eventDateStr.split("-")[0];
              if (eventYear !== filterYear) return false;
            }
            if (filterProfessional) {
              const eventAssigns = assignments[event.id] || [];
              const match = eventAssigns.some((a) =>
                a.profiles?.nome?.toLowerCase().includes(filterProfessional.toLowerCase()),
              );
              if (!match) return false;
            }
            return true;
          });

          if (filtered.length === 0)
            return (
              <Card className="md:col-span-2 lg:col-span-3">
                <CardContent className="py-12 text-center">
                  <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {events.length === 0
                      ? "Nenhum evento nesta base"
                      : "Nenhum evento encontrado com os filtros aplicados"}
                  </p>
                </CardContent>
              </Card>
            );

          return filtered.map((event) => {
            const status = getEventStatus(event);
            const eventAssigns = assignments[event.id] || [];
            return (
              <Card
                key={event.id}
                className={`cursor-pointer hover:shadow-md transition-shadow ${event.status === 'cancelado' ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20' : ''}`}
                onClick={() => navigate(`/admin/events/${event.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{event.nome_evento}</CardTitle>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" title="Duplicar" onClick={() => duplicateEvent(event)}>
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(event)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      {event.status !== "cancelado" && event.status !== "finalizado" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Cancelar evento"
                          onClick={() => {
                            setCancelEventId(event.id);
                            setMotivoCancelamento("");
                            setCancelDialogOpen(true);
                          }}
                        >
                          <XCircle className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(event.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  <Badge className={status.color}>{status.label}</Badge>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{format(new Date(event.data_inicio), "dd/MM/yy HH:mm", { locale: ptBR })}</span>
                    <span>→</span>
                    <span>{format(new Date(event.data_fim), "dd/MM/yy HH:mm", { locale: ptBR })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="truncate">{event.local}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {event.vehicles && (
                      <Badge variant="secondary" className="gap-1">
                        <Truck className="w-3 h-3" /> {event.vehicles.prefixo}
                      </Badge>
                    )}
                    {eventAssigns.map((a) => (
                      <div key={a.id} className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                        <Badge variant="outline" className="gap-1">
                          <Users className="w-3 h-3" />
                          {a.profiles?.nome}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          title="Enviar confirmação via WhatsApp"
                          onClick={() => sendWhatsApp(event, a.profile_id)}
                        >
                          <MessageCircle className="w-3 h-3 text-stable" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          });
        })()}
      </div>

      {/* Cancel Event Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={(open) => {
        setCancelDialogOpen(open);
        if (!open) { setCancelEventId(null); setMotivoCancelamento(""); }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Cancelar Evento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja cancelar este evento? Esta ação não pode ser desfeita.
            </p>
            <div className="space-y-2">
              <Label>Motivo do cancelamento *</Label>
              <Textarea
                value={motivoCancelamento}
                onChange={(e) => setMotivoCancelamento(e.target.value)}
                placeholder="Informe o motivo do cancelamento..."
                rows={3}
                required
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
                Voltar
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelEvent}
                disabled={!motivoCancelamento.trim() || isCancelling}
              >
                {isCancelling ? "Cancelando..." : "Confirmar Cancelamento"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
