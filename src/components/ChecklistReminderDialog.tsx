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

interface PendingEvent {
  id: string;
  nome_evento: string;
  data_inicio: string;
  vehicle_prefixo?: string | null;
}

export default function ChecklistReminderDialog() {
  const { profile, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [queue, setQueue] = useState<PendingEvent[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!profile?.id || !user?.id) return;
    if (profile.hidden) return;

    (async () => {
      // Today range (local)
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

      // 1. Find events today: assigned OR owned
      const [assignsRes, ownedRes] = await Promise.all([
        supabase
          .from("event_assignments")
          .select("event_id")
          .eq("profile_id", profile.id),
        supabase
          .from("events")
          .select("id")
          .eq("user_id", user.id),
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

      // 2. For each event, check if there's a finalized checklist by this user
      const evIds = evs.map((e: any) => e.id);
      const { data: subs } = await supabase
        .from("checklist_submissions")
        .select("event_id, status")
        .in("event_id", evIds)
        .eq("status", "finalizado");

      const finalizedSet = new Set((subs || []).map((s: any) => s.event_id));
      const pending = evs
        .filter((e: any) => !finalizedSet.has(e.id))
        .map((e: any) => ({
          id: e.id,
          nome_evento: e.nome_evento,
          data_inicio: e.data_inicio,
          vehicle_prefixo: e.vehicles?.prefixo || null,
        }));

      if (pending.length > 0) {
        setQueue(pending);
        setOpen(true);
      }
    })();
  }, [profile?.id, user?.id, profile?.hidden, isLoading]);

  const current = queue[0];

  const handleSkip = () => {
    const rest = queue.slice(1);
    setQueue(rest);
    if (rest.length === 0) setOpen(false);
  };

  const handleGoChecklist = () => {
    if (!current) return;
    setOpen(false);
    navigate(`/checklist?event_id=${current.id}`);
  };

  if (!current) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Checklist do Evento</DialogTitle>
          <DialogDescription>
            O evento <strong>{current.nome_evento}</strong> (
            {format(new Date(current.data_inicio), "dd/MM 'às' HH:mm", { locale: ptBR })})
            {current.vehicle_prefixo ? ` — Viatura ${current.vehicle_prefixo}` : ""} ainda não tem
            checklist finalizado. Você já realizou o checklist deste evento?
            {queue.length > 1 && (
              <span className="block mt-2 text-xs">
                ({queue.length - 1} outro(s) evento(s) pendente(s) também precisarão de checklist)
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleSkip}>
            Agora não
          </Button>
          <Button onClick={handleGoChecklist}>Fazer / continuar checklist</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
