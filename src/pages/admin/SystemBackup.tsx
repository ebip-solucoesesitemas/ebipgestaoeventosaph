import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Database,
  Download,
  Loader2,
  RefreshCw,
  Shield,
  Trash2,
  Play,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface BackupRow {
  id: string;
  created_at: string;
  source: "auto" | "manual";
  storage_path: string;
  file_size_bytes: number;
  total_rows: number;
  tables_count: number;
  status: "success" | "partial" | "failed";
  error_message: string | null;
  created_by: string | null;
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function SystemBackup() {
  const { profile, isLoading } = useAuth();
  const [rows, setRows] = useState<BackupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("system_backups" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) toast.error("Erro ao carregar backups: " + error.message);
    setRows((data as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (profile?.hidden) load();
  }, [profile?.hidden]);

  if (isLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!profile?.hidden) return <Navigate to="/admin/events" replace />;

  const lastAuto = rows.find((r) => r.source === "auto");

  const runNow = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("run-system-backup", {
        body: { source: "manual" },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("Backup gerado com sucesso");
      await load();
    } catch (e: any) {
      toast.error("Falha ao gerar backup: " + (e?.message || e));
    } finally {
      setRunning(false);
    }
  };

  const downloadBackup = async (row: BackupRow) => {
    setDownloadingId(row.id);
    try {
      const url = `https://hzndneczqbszkvvsyvjr.supabase.co/functions/v1/run-system-backup?action=signed-url&id=${row.id}`;
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json();
      if (!res.ok || !j.url) throw new Error(j.error || "Falha ao gerar link");
      const a = document.createElement("a");
      a.href = j.url;
      a.download = row.storage_path.split("/").pop() || "backup.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e: any) {
      toast.error("Erro no download: " + (e?.message || e));
    } finally {
      setDownloadingId(null);
    }
  };

  const deleteBackup = async (id: string) => {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    try {
      const { error: sErr } = await supabase.storage
        .from("system-backups")
        .remove([row.storage_path]);
      if (sErr) console.warn("storage remove", sErr);
      const { error } = await supabase.from("system_backups" as any).delete().eq("id", id);
      if (error) throw error;
      toast.success("Backup removido");
      setRows((r) => r.filter((x) => x.id !== id));
    } catch (e: any) {
      toast.error("Erro ao excluir: " + (e?.message || e));
    } finally {
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="container max-w-6xl mx-auto p-4 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Configurações de Sistema e Backup</h1>
          <p className="text-sm text-muted-foreground">
            Área restrita ao Super-Administrador. Os backups automáticos rodam diariamente;
            também é possível executar manualmente.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Backup Automático
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Diariamente às <strong>03:00</strong> (horário do servidor) o sistema gera um{" "}
            <code>.zip</code> completo com as tabelas vitais e guarda no armazenamento seguro do
            Lovable Cloud. Mantém os <strong>30 backups mais recentes</strong>; os mais antigos
            são apagados automaticamente.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Status</div>
              <div className="font-medium flex items-center gap-1 mt-1">
                <span className="w-2 h-2 rounded-full bg-green-500" /> Ativo
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Último backup automático</div>
              <div className="font-medium mt-1">
                {lastAuto
                  ? format(new Date(lastAuto.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                  : "—"}
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Retenção</div>
              <div className="font-medium mt-1">30 backups</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={runNow} disabled={running}>
              {running ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Executar agora (servidor)
            </Button>
            <Button variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Backups</CardTitle>
          <p className="text-sm text-muted-foreground">
            Backups armazenados no servidor (automáticos e manuais).
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nenhum backup ainda. Clique em "Executar agora" para gerar o primeiro.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/hora</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Tamanho</TableHead>
                  <TableHead>Registros</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">
                      {format(new Date(r.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.source === "auto" ? "default" : "secondary"}>
                        {r.source === "auto" ? "Automático" : "Manual"}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatBytes(r.file_size_bytes)}</TableCell>
                    <TableCell>{r.total_rows.toLocaleString("pt-BR")}</TableCell>
                    <TableCell>
                      {r.status === "success" && (
                        <Badge className="bg-green-600 hover:bg-green-600">OK</Badge>
                      )}
                      {r.status === "partial" && (
                        <Badge className="bg-yellow-600 hover:bg-yellow-600">Parcial</Badge>
                      )}
                      {r.status === "failed" && <Badge variant="destructive">Falhou</Badge>}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => downloadBackup(r)}
                        disabled={downloadingId === r.id}
                        title="Baixar"
                      >
                        {downloadingId === r.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setConfirmDeleteId(r.id)}
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={!!confirmDeleteId}
        onOpenChange={(open) => !open && setConfirmDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir backup?</AlertDialogTitle>
            <AlertDialogDescription>
              O arquivo .zip será removido permanentemente do armazenamento. Esta ação não pode
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDeleteId && deleteBackup(confirmDeleteId)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
