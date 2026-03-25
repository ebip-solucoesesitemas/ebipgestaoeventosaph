import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, CheckCircle } from "lucide-react";

interface SystemNotice {
  id: string;
  message: string;
  color: string;
  status: string;
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
  const [notice, setNotice] = useState<SystemNotice | null>(null);
  const [showFinished, setShowFinished] = useState(false);

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
        () => fetchLatestNotice()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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

  // Active notice
  if (notice?.status === "active") {
    const colors = COLOR_MAP[notice.color] || COLOR_MAP.yellow;
    return (
      <div
        className={`fixed top-0 left-0 right-0 z-[60] ${colors.bg} ${colors.text} ${colors.border} border-b py-2 px-4 text-center text-sm font-semibold shadow-md flex items-center justify-center gap-2`}
      >
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>{notice.message}</span>
      </div>
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
