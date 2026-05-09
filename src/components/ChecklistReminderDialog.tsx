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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function ChecklistReminderDialog() {
  const { profile, isLoading } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"ask" | "reason">("ask");
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isLoading || !profile?.id || profile.is_account_only || profile.hidden) return;

    const todayKey = `checklist_reminder_${profile.id}_${new Date().toISOString().slice(0, 10)}`;
    if (sessionStorage.getItem(todayKey)) return;

    (async () => {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const { data } = await supabase
        .from("checklist_submissions")
        .select("id")
        .eq("profile_id", profile.id)
        .gte("created_at", start)
        .limit(1);

      if (!data || data.length === 0) {
        setOpen(true);
      } else {
        sessionStorage.setItem(todayKey, "1");
      }
    })();
  }, [profile?.id, isLoading]);

  const markSeen = () => {
    if (profile?.id) {
      sessionStorage.setItem(
        `checklist_reminder_${profile.id}_${new Date().toISOString().slice(0, 10)}`,
        "1",
      );
    }
  };

  const handleYes = () => {
    markSeen();
    setOpen(false);
  };

  const handleGoChecklist = () => {
    markSeen();
    setOpen(false);
    navigate("/team/checklist");
  };

  const handleSaveReason = async () => {
    if (!motivo.trim()) {
      toast.error("Informe o motivo");
      return;
    }
    if (!profile?.id) return;
    setSaving(true);
    const { error } = await supabase.from("checklist_submissions").insert({
      profile_id: profile.id,
      base_id: profile.base_id,
      tipo: "nao_realizado",
      observacoes: motivo.trim(),
    });
    setSaving(false);
    if (error) {
      toast.error("Erro ao registrar: " + error.message);
      return;
    }
    toast.success("Motivo registrado");
    markSeen();
    setOpen(false);
    setMotivo("");
    setStep("ask");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) markSeen(); setOpen(v); }}>
      <DialogContent className="sm:max-w-md">
        {step === "ask" ? (
          <>
            <DialogHeader>
              <DialogTitle>Conferência de Checklist</DialogTitle>
              <DialogDescription>
                Você já realizou o checklist hoje?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setStep("reason")}>
                Não
              </Button>
              <Button variant="secondary" onClick={handleGoChecklist}>
                Fazer agora
              </Button>
              <Button onClick={handleYes}>Sim, já fiz</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Informe o motivo</DialogTitle>
              <DialogDescription>
                Por que o checklist ainda não foi realizado hoje?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo</Label>
              <Textarea
                id="motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Descreva o motivo..."
                rows={4}
              />
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setStep("ask")} disabled={saving}>
                Voltar
              </Button>
              <Button onClick={handleSaveReason} disabled={saving}>
                {saving ? "Salvando..." : "Registrar motivo"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
