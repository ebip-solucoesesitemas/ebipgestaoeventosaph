import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, CheckCircle, Plus } from "lucide-react";

interface SystemNotice {
  id: string;
  message: string;
  color: string;
  status: string;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
}

const COLOR_OPTIONS = [
  { value: "red", label: "Vermelho", className: "bg-red-500" },
  { value: "yellow", label: "Amarelo", className: "bg-yellow-500" },
  { value: "green", label: "Verde", className: "bg-green-500" },
  { value: "blue", label: "Azul", className: "bg-blue-500" },
  { value: "orange", label: "Laranja", className: "bg-orange-500" },
];

export default function SystemNotices() {
  const [notices, setNotices] = useState<SystemNotice[]>([]);
  const [message, setMessage] = useState("");
  const [color, setColor] = useState("yellow");
  const [tipo, setTipo] = useState("aviso");
  const [loading, setLoading] = useState(false);

  const fetchNotices = async () => {
    const { data } = await supabase
      .from("system_notices")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    setNotices((data as SystemNotice[]) || []);
  };

  useEffect(() => {
    fetchNotices();
  }, []);

  const handleCreate = async () => {
    if (!message.trim()) {
      toast.error("Informe a mensagem do aviso");
      return;
    }
    setLoading(true);
    // Finalize any active notices first
    await supabase
      .from("system_notices")
      .update({ status: "finished", finished_at: new Date().toISOString() } as any)
      .eq("status", "active");

    const { error } = await supabase
      .from("system_notices")
      .insert({ message: message.trim(), color, status: "active", tipo } as any);

    if (error) {
      toast.error("Erro ao criar aviso: " + error.message);
    } else {
      toast.success("Aviso ativado com sucesso");
      setMessage("");
      fetchNotices();
    }
    setLoading(false);
  };

  const handleFinish = async (id: string) => {
    const { error } = await supabase
      .from("system_notices")
      .update({ status: "finished", finished_at: new Date().toISOString() } as any)
      .eq("id", id);

    if (error) {
      toast.error("Erro ao finalizar aviso");
    } else {
      toast.success("Aviso finalizado");
      fetchNotices();
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Avisos do Sistema</h1>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Novo Aviso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Mensagem do aviso..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
            <div className="flex items-center gap-4">
              <Select value={color} onValueChange={setColor}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLOR_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${opt.className}`} />
                        {opt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aviso">Aviso Comum</SelectItem>
                  <SelectItem value="melhoria">Melhoria / Alteração</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleCreate} disabled={loading}>
                <Plus className="h-4 w-4 mr-1" />
                Ativar Aviso
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Histórico de Avisos</CardTitle>
          </CardHeader>
          <CardContent>
            {notices.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum aviso registrado.</p>
            ) : (
              <div className="space-y-3">
                {notices.map((n) => (
                  <div
                    key={n.id}
                    className="flex items-start justify-between border rounded-lg p-3 gap-4"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div
                        className={`w-3 h-3 rounded-full mt-1 shrink-0 ${
                          COLOR_OPTIONS.find((c) => c.value === n.color)?.className || "bg-yellow-500"
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium break-words">{n.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(n.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {(n as any).tipo === "melhoria" && (
                        <Badge variant="outline" className="text-xs">Melhoria</Badge>
                      )}
                      {n.status === "active" ? (
                        <>
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Ativo
                          </Badge>
                          <Button size="sm" variant="outline" onClick={() => handleFinish(n.id)}>
                            Finalizar
                          </Button>
                        </>
                      ) : (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Finalizado
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
