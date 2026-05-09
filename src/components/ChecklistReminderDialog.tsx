import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Stethoscope, Wrench } from "lucide-react";

type Escopo = "medico" | "enfermagem" | "viatura";

interface PendingItem {
  event_id: string;
  nome_evento: string;
  data_inicio: string;
  vehicle_prefixo?: string | null;
  escopo: Escopo;
}

const ESCOPO_LABEL: Record<Escopo, string> = {
  medico: "Kit Médico",
  enfermagem: "Kit Enfermagem",
  viatura: "Viatura",
};

export default function ChecklistReminderDialog() {
  const { profile, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!profile?.id || !user?.id) return;
    if (profile.hidden) return;

    (async () => {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

      const [assignsRes, ownedRes] = await Promise.all([
        supabase.from("event_assignments").select("event_id").eq("profile_id", profile.id),
        supabase.from("events").select("id").eq("user_id", user.id),
      ]);
      const ids = Array.from(
        new Set([
          ...(assignsRes.data || []).map((a: any) => a.event_id),
          ...(ownedRes.data || []).map((e: any) => e.id),
        ])
      );
      if (ids.length === 0) return;

      const { data: evs } = await supabase
        .from("events")
        .select("id, nome_evento, data_inicio, status, viatura_id, vehicles:viatura_id(prefixo)")
        .in("id", ids)
        .gte("data_inicio", start)
        .lt("data_inicio", end)
        .neq("status", "cancelado")
        .order("data_inicio", { ascending: true });

      if (!evs || evs.length === 0) return;

      // Discover which escopos exist in user's base (only ask for those)
      const { data: cats } = await (supabase as any)
        .from("checklist_categories")
        .select("escopo, base_id")
        .eq("ativo", true);
      const baseId = profile.base_id;
      const availableEscopos = new Set<Escopo>(
        (cats || [])
          .filter((c: any) => !c.base_id || c.base_id === baseId)
          .map((c: any) => (c.escopo || "medico") as Escopo)
      );
      if (availableEscopos.size === 0) return;

      const evIds = evs.map((e: any) => e.id);
      const { data: subs } = await (supabase as any)
        .from("checklist_submissions")
        .select("event_id, escopo, status")
        .in("event_id", evIds)
        .eq("status", "finalizado");

      const finalizedKey = new Set(
        (subs || []).map((s: any) => `${s.event_id}::${s.escopo || "medico"}`)
      );

      const items: PendingItem[] = [];
      evs.forEach((e: any) => {
        availableEscopos.forEach((esc) => {
          if (!finalizedKey.has(`${e.id}::${esc}`)) {
            items.push({
              event_id: e.id,
              nome_evento: e.nome_evento,
              data_inicio: e.data_inicio,
              vehicle_prefixo: e.vehicles?.prefixo || null,
              escopo: esc,
            });
          }
        });
      });

      if (items.length > 0) {
        setPending(items);
        setOpen(true);
      }
    })();
  }, [profile?.id, user?.id, profile?.hidden, profile?.base_id, isLoading]);

  if (pending.length === 0) return null;

  // Group by event
  const grouped = pending.reduce<Record<string, PendingItem[]>>((acc, p) => {
    (acc[p.event_id] ||= []).push(p);
    return acc;
  }, {});

  const handleGo = (item: PendingItem) => {
    setOpen(false);
    navigate(`/checklist?event_id=${item.event_id}&escopo=${item.escopo}`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Checklists pendentes</DialogTitle>
          <DialogDescription>
            Você tem {pending.length} checklist{pending.length > 1 ? "s" : ""} pendente
            {pending.length > 1 ? "s" : ""} para hoje.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
          {Object.entries(grouped).map(([eventId, items]) => {
            const first = items[0];
            return (
              <div key={eventId} className="rounded-lg border p-3 space-y-2">
                <div>
                  <p className="font-medium text-sm">{first.nome_evento}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(first.data_inicio), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    {first.vehicle_prefixo ? ` — Viatura ${first.vehicle_prefixo}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {items.map((it) => (
                    <Button
                      key={`${it.event_id}-${it.escopo}`}
                      size="sm"
                      onClick={() => handleGo(it)}
                      className="gap-1"
                    >
                      {it.escopo === "viatura" ? (
                        <Wrench className="w-3 h-3" />
                      ) : (
                        <Stethoscope className="w-3 h-3" />
                      )}
                      Fazer {ESCOPO_LABEL[it.escopo]}
                    </Button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Agora não
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
