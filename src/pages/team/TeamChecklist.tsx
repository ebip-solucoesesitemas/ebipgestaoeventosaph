import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import SignaturePad, { type SignaturePadRef } from "@/components/SignaturePad";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Package,
  History,
  Send,
  CalendarDays,
  Truck,
  MinusCircle,
  Wrench,
  Stethoscope,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Category {
  id: string;
  nome: string;
  descricao: string | null;
  ordem: number;
  base_id: string | null;
  escopo: string;
}
interface Item {
  id: string;
  category_id: string;
  nome: string;
  quantidade_ideal: number;
  unidade: string | null;
  ordem: number;
  tipo_resposta: string;
}
type ItemStatus = "ok" | "divergente" | "falta";
interface Answer {
  status: ItemStatus;
  quantidade_atual: number | null;
  observacao?: string;
}

interface Submission {
  id: string;
  created_at: string;
  tipo: string;
  observacoes: string | null;
}

interface EventOption {
  id: string;
  nome_evento: string;
  data_inicio: string;
  status: string;
  viatura_id: string | null;
  base_id: string | null;
  vehicle?: { id: string; prefixo: string; placa: string } | null;
}

interface VehicleOption {
  id: string;
  prefixo: string;
  placa: string;
}

export default function TeamChecklist() {
  const { profile, user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [observacoes, setObservacoes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<Submission[]>([]);

  const [responsavelNome, setResponsavelNome] = useState("");
  const [responsavelCargo, setResponsavelCargo] = useState("");
  const sigRef = useRef<SignaturePadRef>(null);

  const [tipo, setTipo] = useState<"diario" | "evento">("diario");
  const [escopo, setEscopo] = useState<"medico" | "viatura">("medico");
  const [events, setEvents] = useState<EventOption[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [eventId, setEventId] = useState<string>("");
  const [vehicleId, setVehicleId] = useState<string>("");

  // Load categories + items filtered by user's base AND selected scope
  useEffect(() => {
    (async () => {
      const catsRes = await supabase
        .from("checklist_categories")
        .select("*")
        .eq("ativo", true)
        .order("ordem")
        .order("nome");
      const cats = (catsRes.data || []) as Category[];
      const byBase = profile?.base_id
        ? cats.filter((c) => !c.base_id || c.base_id === profile.base_id)
        : cats;
      const filtered = byBase.filter((c) => (c.escopo || "medico") === escopo);
      setCategories(filtered);

      if (filtered.length === 0) {
        setItems([]);
        setAnswers({});
        return;
      }
      const its = await supabase
        .from("checklist_items")
        .select("*")
        .eq("ativo", true)
        .in("category_id", filtered.map((c) => c.id))
        .order("ordem")
        .order("nome");
      const itList = (its.data || []) as Item[];
      setItems(itList);
      const initial: Record<string, Answer> = {};
      itList.forEach((i) => {
        initial[i.id] =
          i.tipo_resposta === "condicao"
            ? { status: "ok", quantidade_atual: null, observacao: "" }
            : { status: "ok", quantidade_atual: i.quantidade_ideal, observacao: "" };
      });
      setAnswers(initial);
    })();
  }, [profile?.base_id, escopo]);

  // Load events: assigned OR account responsible (events.user_id)
  useEffect(() => {
    if (!profile?.id || !user?.id) return;
    (async () => {
      const [assignsRes, ownedRes] = await Promise.all([
        supabase.from("event_assignments").select("event_id").eq("profile_id", profile.id),
        supabase
          .from("events")
          .select("id")
          .eq("user_id", user.id)
          .in("status", ["agendado", "em_andamento"]),
      ]);
      const assignedIds = (assignsRes.data || []).map((a: any) => a.event_id);
      const ownedIds = (ownedRes.data || []).map((e: any) => e.id);
      const allIds = Array.from(new Set([...assignedIds, ...ownedIds]));
      if (allIds.length === 0) {
        setEvents([]);
        return;
      }
      const { data: evs } = await supabase
        .from("events")
        .select("id, nome_evento, data_inicio, status, viatura_id, base_id, vehicles:viatura_id(id, prefixo, placa)")
        .in("id", allIds)
        .in("status", ["agendado", "em_andamento"])
        .order("data_inicio", { ascending: false });
      setEvents(
        (evs || []).map((e: any) => ({
          id: e.id,
          nome_evento: e.nome_evento,
          data_inicio: e.data_inicio,
          status: e.status,
          viatura_id: e.viatura_id,
          base_id: e.base_id,
          vehicle: e.vehicles,
        }))
      );

      if (profile.base_id) {
        const { data: vs } = await supabase
          .from("vehicles")
          .select("id, prefixo, placa")
          .eq("base_id", profile.base_id)
          .order("prefixo");
        setVehicles(vs || []);
      }
    })();
  }, [profile?.id, profile?.base_id, user?.id]);

  useEffect(() => {
    if (!profile?.id) return;
    if (!responsavelNome && profile.nome) setResponsavelNome(profile.nome);
    if (!responsavelCargo && profile.especialidade) setResponsavelCargo(profile.especialidade);
    supabase
      .from("checklist_submissions")
      .select("id, created_at, tipo, observacoes")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => setHistory(data || []));
  }, [profile?.id]);

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === eventId) || null,
    [events, eventId]
  );

  useEffect(() => {
    if (tipo === "evento" && selectedEvent) {
      setVehicleId(selectedEvent.viatura_id || "");
    }
  }, [tipo, selectedEvent]);

  // ---- Quantidade handlers ----
  const setOk = (item: Item) =>
    setAnswers((p) => ({
      ...p,
      [item.id]: { ...p[item.id], status: "ok", quantidade_atual: item.quantidade_ideal },
    }));
  const setFalta = (item: Item) =>
    setAnswers((p) => ({ ...p, [item.id]: { ...p[item.id], status: "falta", quantidade_atual: 0 } }));
  const setQty = (item: Item, qty: number) => {
    const status: ItemStatus =
      qty === item.quantidade_ideal ? "ok" : qty <= 0 ? "falta" : "divergente";
    setAnswers((p) => ({ ...p, [item.id]: { ...p[item.id], status, quantidade_atual: qty } }));
  };

  // ---- Condição handlers ----
  const setCond = (item: Item, status: ItemStatus) =>
    setAnswers((p) => ({ ...p, [item.id]: { ...p[item.id], status, quantidade_atual: null } }));
  const setObs = (item: Item, obs: string) =>
    setAnswers((p) => ({ ...p, [item.id]: { ...p[item.id], observacao: obs } }));

  const stats = useMemo(() => {
    const total = items.length;
    let ok = 0, div = 0, falta = 0;
    items.forEach((it) => {
      const a = answers[it.id];
      if (!a) return;
      if (a.status === "ok") ok++;
      else if (a.status === "divergente") div++;
      else falta++;
    });
    return { total, ok, div, falta };
  }, [items, answers]);

  const condLabel = (s: ItemStatus) =>
    s === "ok" ? "OK" : s === "divergente" ? "NOK" : "N/A";

  const handleSubmit = async () => {
    if (!profile?.id) {
      toast.error("Perfil não encontrado");
      return;
    }
    if (items.length === 0) {
      toast.error("Não há itens cadastrados para sua base.");
      return;
    }
    if (!responsavelNome.trim()) {
      toast.error("Informe o nome de quem está fazendo o checklist.");
      return;
    }
    if (!responsavelCargo.trim()) {
      toast.error("Informe o cargo de quem está fazendo o checklist.");
      return;
    }
    if (!sigRef.current || sigRef.current.isEmpty()) {
      toast.error("Assine no campo de assinatura antes de enviar.");
      return;
    }
    if (tipo === "evento") {
      if (!eventId) {
        toast.error("Selecione o evento.");
        return;
      }
      if (!selectedEvent?.viatura_id) {
        toast.error("Este evento não possui viatura vinculada.");
        return;
      }
    }
    const assinatura = sigRef.current.getDataUrl("image/jpeg", 0.5);
    setSubmitting(true);
    const { data: sub, error: subErr } = await supabase
      .from("checklist_submissions")
      .insert({
        profile_id: profile.id,
        base_id: profile.base_id || null,
        tipo,
        event_id: tipo === "evento" ? eventId : null,
        vehicle_id:
          tipo === "evento"
            ? selectedEvent?.viatura_id || null
            : vehicleId || null,
        observacoes: observacoes.trim() || null,
        responsavel_nome: responsavelNome.trim(),
        responsavel_cargo: responsavelCargo.trim(),
        assinatura,
      })
      .select()
      .single();
    if (subErr || !sub) {
      setSubmitting(false);
      toast.error(subErr?.message || "Erro ao salvar conferência");
      return;
    }
    const rows = items.map((it) => {
      const a = answers[it.id];
      return {
        submission_id: sub.id,
        item_id: it.id,
        status: a?.status || "ok",
        quantidade_atual:
          it.tipo_resposta === "condicao" ? null : a?.quantidade_atual ?? it.quantidade_ideal,
        observacao: a?.observacao?.trim() || null,
      };
    });
    const { error: itemsErr } = await supabase.from("checklist_submission_items").insert(rows);
    setSubmitting(false);
    if (itemsErr) {
      toast.error(itemsErr.message);
      return;
    }
    toast.success("Checklist assinado e enviado!");
    setObservacoes("");
    setEventId("");
    setVehicleId("");
    sigRef.current?.clear();
    setHistory((prev) =>
      [
        { id: sub.id, created_at: sub.created_at, tipo: sub.tipo, observacoes: sub.observacoes },
        ...prev,
      ].slice(0, 5)
    );
  };

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package className="w-6 h-6" /> Checklist de Conferência
        </h1>
        <p className="text-sm text-muted-foreground">
          Confirme item a item conforme o escopo selecionado.
        </p>
      </div>

      {/* Tipo / Escopo / vínculo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tipo de Conferência</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Escopo *</Label>
              <Select value={escopo} onValueChange={(v) => setEscopo(v as "medico" | "viatura")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="medico">
                    <span className="flex items-center gap-2"><Stethoscope className="w-3 h-3" /> Kit Médico</span>
                  </SelectItem>
                  <SelectItem value="viatura">
                    <span className="flex items-center gap-2"><Wrench className="w-3 h-3" /> Viatura (lataria, óleo, pneus...)</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo *</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as "diario" | "evento")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="diario">Diário (base)</SelectItem>
                  <SelectItem value="evento">Vinculado a evento</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {tipo === "evento" ? (
              <>
                <div>
                  <Label className="flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" /> Evento *
                  </Label>
                  <Select value={eventId} onValueChange={setEventId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o evento" />
                    </SelectTrigger>
                    <SelectContent>
                      {events.length === 0 && (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          Nenhum evento ativo
                        </div>
                      )}
                      {events.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.nome_evento} —{" "}
                          {format(new Date(e.data_inicio), "dd/MM HH:mm", { locale: ptBR })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="flex items-center gap-1">
                    <Truck className="w-3 h-3" /> Viatura (do evento)
                  </Label>
                  <Input
                    value={
                      selectedEvent?.vehicle
                        ? `${selectedEvent.vehicle.prefixo} — ${selectedEvent.vehicle.placa}`
                        : selectedEvent
                        ? "Sem viatura vinculada"
                        : ""
                    }
                    readOnly
                    className="bg-muted"
                  />
                </div>
              </>
            ) : (
              <div className="md:col-span-2">
                <Label className="flex items-center gap-1">
                  <Truck className="w-3 h-3" /> Viatura (opcional)
                </Label>
                <Select value={vehicleId} onValueChange={setVehicleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a viatura" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.prefixo} — {v.placa}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Itens</p><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">OK</p><p className="text-2xl font-bold text-stable">{stats.ok}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">{escopo === "viatura" ? "Com Defeito" : "Divergentes"}</p><p className="text-2xl font-bold text-warning">{stats.div}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">{escopo === "viatura" ? "Não se Aplica" : "Em Falta"}</p><p className="text-2xl font-bold text-destructive">{stats.falta}</p></CardContent></Card>
      </div>

      {categories.length === 0 && (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Nenhum item de checklist cadastrado para este escopo na sua base. Aguarde o administrador.
        </CardContent></Card>
      )}

      {categories.map((cat) => {
        const catItems = items.filter((i) => i.category_id === cat.id);
        if (catItems.length === 0) return null;
        return (
          <Card key={cat.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="w-4 h-4 text-primary" />
                {cat.nome}
                <Badge variant="secondary">{catItems.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {catItems.map((it) => {
                const a = answers[it.id];
                const isCond = it.tipo_resposta === "condicao";
                return (
                  <div key={it.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{it.nome}</p>
                        {!isCond && (
                          <p className="text-xs text-muted-foreground">
                            Qtd ideal: {it.quantidade_ideal}{it.unidade ? ` ${it.unidade}` : ""}
                          </p>
                        )}
                      </div>
                      {a?.status === "ok" && (
                        <Badge className="bg-stable text-stable-foreground gap-1"><CheckCircle2 className="w-3 h-3" /> {isCond ? "OK" : "OK"}</Badge>
                      )}
                      {a?.status === "divergente" && (
                        <Badge className="bg-warning text-warning-foreground gap-1">
                          <AlertTriangle className="w-3 h-3" /> {isCond ? "NOK" : "Divergente"}
                        </Badge>
                      )}
                      {a?.status === "falta" && (
                        <Badge variant="destructive" className="gap-1">
                          {isCond ? <MinusCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {isCond ? "N/A" : "Falta"}
                        </Badge>
                      )}
                    </div>

                    {isCond ? (
                      <>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button
                            size="sm"
                            variant={a?.status === "ok" ? "default" : "outline"}
                            className={a?.status === "ok" ? "bg-stable text-stable-foreground hover:bg-stable/90" : ""}
                            onClick={() => setCond(it, "ok")}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" /> OK
                          </Button>
                          <Button
                            size="sm"
                            variant={a?.status === "divergente" ? "default" : "outline"}
                            className={a?.status === "divergente" ? "bg-warning text-warning-foreground hover:bg-warning/90" : ""}
                            onClick={() => setCond(it, "divergente")}
                          >
                            <AlertTriangle className="w-4 h-4 mr-1" /> NOK
                          </Button>
                          <Button
                            size="sm"
                            variant={a?.status === "falta" ? "destructive" : "outline"}
                            onClick={() => setCond(it, "falta")}
                          >
                            <MinusCircle className="w-4 h-4 mr-1" /> N/A
                          </Button>
                        </div>
                        <Input
                          placeholder="Observação (opcional)"
                          value={a?.observacao || ""}
                          onChange={(e) => setObs(it, e.target.value)}
                          className="text-sm"
                        />
                      </>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant={a?.status === "ok" ? "default" : "outline"}
                          className={a?.status === "ok" ? "bg-stable text-stable-foreground hover:bg-stable/90" : ""}
                          onClick={() => setOk(it)}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" /> OK
                        </Button>
                        <div className="flex items-center gap-1">
                          <Label className="text-xs">Qtd atual:</Label>
                          <Input
                            type="number"
                            min={0}
                            className="w-20 h-9"
                            value={a?.quantidade_atual ?? ""}
                            onChange={(e) => setQty(it, Number(e.target.value))}
                          />
                        </div>
                        <Button
                          size="sm"
                          variant={a?.status === "falta" ? "destructive" : "outline"}
                          onClick={() => setFalta(it)}
                        >
                          <XCircle className="w-4 h-4 mr-1" /> F (Falta)
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      {items.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Observações gerais</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder="Anotações da conferência (opcional)"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={3}
            />
            <Button className="w-full gap-2" onClick={handleSubmit} disabled={submitting}>
              <Send className="w-4 h-4" />
              {submitting ? "Enviando..." : `Assinar e Enviar como ${profile?.nome || ""}`}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              A submissão registra automaticamente seu nome, especialidade e data/hora.
            </p>
          </CardContent>
        </Card>
      )}

      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <History className="w-4 h-4" /> Suas últimas conferências
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {history.map((h) => (
              <div key={h.id} className="flex items-center justify-between border-b last:border-0 pb-2">
                <div>
                  <p className="text-sm font-medium">
                    {format(new Date(h.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                  {h.observacoes && <p className="text-xs text-muted-foreground">{h.observacoes}</p>}
                </div>
                <Badge variant="outline">{h.tipo}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
