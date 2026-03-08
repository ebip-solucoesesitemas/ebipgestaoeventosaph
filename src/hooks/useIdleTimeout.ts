import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export function useIdleTimeout(enabled: boolean) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }, []);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(logout, IDLE_TIMEOUT_MS);
  }, [logout]);

  useEffect(() => {
    if (!enabled) return;

    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, [enabled, resetTimer]);
}
