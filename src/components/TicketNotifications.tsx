import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageSquare } from "lucide-react";

export default function TicketNotifications() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("global-ticket-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_tickets" },
        (payload) => {
          const ticket = payload.new as any;
          if (ticket.created_by !== user.id) {
            toast.info(`Novo chamado #${ticket.ticket_number}: ${ticket.title}`, {
              icon: <MessageSquare className="h-4 w-4" />,
              duration: 6000,
            });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "ticket_messages" },
        (payload) => {
          const msg = payload.new as any;
          if (msg.user_id !== user.id) {
            toast.info("Nova mensagem em um chamado", {
              icon: <MessageSquare className="h-4 w-4" />,
              duration: 5000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return null;
}
