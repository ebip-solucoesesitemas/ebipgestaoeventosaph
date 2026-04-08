import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AlertTriangle, CheckCircle, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface SystemNotice {
  id: string;
  message: string;
  color: string;
  status: string;
  tipo: string;
  finished_at: string | null;
  created_at: string;
}

const COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  red: { bg: "bg-red-600", text: "text-white", border: "border-red-700" },
  yellow: { bg: "bg-yellow-500", text: "text-yellow-950", border: "border-yellow-600" },
  green: { bg: "bg-green-600", text: "text-white", border: "border-green-700" },
  blue: { bg: "bg-blue-600", text: "text-white", border: "border-blue-700" },
  orange: { bg: "bg-orange-500", text: "text-white", border: "border-orange-600" },
};

export default function SystemBanner() {
  const { session } = useAuth();
  const [notice, setNotice] = useState<SystemNotice | null>(null);
  const [showFinished, setShowFinished] = useState(false);
  const [showAckDialog, setShowAckDialog] = useState(false);
  const [ackChecked, setAckChecked] = useState(false);
  const [ackLoading, setAckLoading] = useState(false);
  const [hasAcknowledged, setHasAcknowledged] = useState(false);

  const fetchLatestNotice = async () => {
    const { data } = await supabase
      .from("system_notices")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    setNotice(data as SystemNotice | null);
  };

  useEffect(() => {
    fetchLatestNotice();

    const channel = supabase
      .channel("system-notices-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "system_notices" },
        () => {
          setHasAcknowledged(false);
          fetchLatestNotice();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Check acknowledgement for melhoria notices
  useEffect(() => {
    const checkAck = async () => {
      if (!notice || notice.status !== "active" || (notice as any).tipo !== "melhoria" || !session?.user?.id) {
        setShowAckDialog(false);
        return;
      }

      const { data } = await supabase
        .from("notice_acknowledgements")
        .select("id")
        .eq("notice_id", notice.id)
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (data) {
        setHasAcknowledged(true);
        setShowAckDialog(false);
      } else {
        setHasAcknowledged(false);
        setShowAckDialog(true);
      }
    };

    checkAck();
  }, [notice, session?.user?.id]);

  // Check if finished notice is within 20 minutes
  useEffect(() => {
    if (!notice) {
      setShowFinished(false);
      return;
    }

    if (notice.status === "active") {
      setShowFinished(false);
      return;
    }

    if (notice.status === "finished" && notice.finished_at) {
      const finishedTime = new Date(notice.finished_at).getTime();
      const now = Date.now();
      const twentyMin = 20 * 60 * 1000;
      const remaining = twentyMin - (now - finishedTime);

      if (remaining > 0) {
        setShowFinished(true);
        const timer = setTimeout(() => setShowFinished(false), remaining);
        return () => clearTimeout(timer);
      } else {
        setShowFinished(false);
      }
    }
  }, [notice]);

  const handleAcknowledge = async () => {
    if (!notice || !session?.user?.id) return;
    setAckLoading(true);

    await supabase.from("notice_acknowledgements").insert({
      notice_id: notice.id,
      user_id: session.user.id,
    } as any);

    setHasAcknowledged(true);
    setShowAckDialog(false);
    setAckChecked(false);
    setAckLoading(false);
  };

  // Active notice
  if (notice?.status === "active") {
    const colors = COLOR_MAP[notice.color] || COLOR_MAP.yellow;
    return (
      <>
        <div
          className={`fixed top-0 left-0 right-0 z-[60] ${colors.bg} ${colors.text} ${colors.border} border-b py-2 px-4 text-center text-sm font-semibold shadow-md flex items-center justify-center gap-2`}
        >
          {(notice as any).tipo === "melhoria" ? (
            <Info className="h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0" />
          )}
          <span>{notice.message}</span>
        </div>

        {/* Acknowledgement Dialog for melhoria type */}
        <Dialog open={showAckDialog} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                Melhoria / Alteração no Sistema
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg text-sm whitespace-pre-wrap">
                {notice.message}
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="ack-check"
                  checked={ackChecked}
                  onCheckedChange={(checked) => setAckChecked(!!checked)}
                />
                <Label htmlFor="ack-check" className="text-sm cursor-pointer">
                  Estou ciente das alterações
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleAcknowledge}
                disabled={!ackChecked || ackLoading}
                className="w-full"
              >
                {ackLoading ? "Confirmando..." : "Confirmar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Finished within 20 min
  if (showFinished) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[60] bg-green-600 text-white border-b border-green-700 py-2 px-4 text-center text-sm font-semibold shadow-md flex items-center justify-center gap-2">
        <CheckCircle className="h-4 w-4 shrink-0" />
        <span>Sistema funcionando normalmente - EBIP S&S Soluções e Sistemas</span>
      </div>
    );
  }

  return null;
}
