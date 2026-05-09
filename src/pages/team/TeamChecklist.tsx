import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { CheckCircle2, AlertTriangle, XCircle, Package, History, Send } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Category { id: string; nome: string; descricao: string | null; ordem: number }
interface Item {
  id: string;
  category_id: string;
  nome: string;
  quantidade_ideal: number;
  unidade: string | null;
  ordem: number;
}
type ItemStatus = "ok" | "divergente" | "falta";
interface Answer { status: ItemStatus; quantidade_atual: number | null }

interface Submission {
  id: string;
  created_at: string;
  tipo: string;
  observacoes: string | null;
}

export default function TeamChecklist() {
  const { profile } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [observacoes, setObservacoes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<Submission[]>([]);

  useEffect(() => {
    (async () => {
      const [cats, its] = await Promise.all([
        supabase.from("checklist_categories").select("*").eq("ativo", true).order("ordem").order("nome"),
        supabase.from("checklist_items").select("*").eq("ativo", true).order("ordem").order("nome"),
      ]);
      setCategories(cats.data || []);
      setItems(its.data || []);
      const initial: Record<string, Answer> = {};
      (its.data || []).forEach((i) => {
        initial[i.id] = { status: "ok", quantidade_atual: i.quantidade_ideal };
      });
      setAnswers(initial);
    })();
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    supabase
      .from("checklist_submissions")
      .select("id, created_at, tipo, observacoes")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => setHistory(data || []));
  }, [profile?.id]);

  const setOk = (item: Item) =>
    setAnswers((p) => ({
      ...p,
      [item.id]: { status: "ok", quantidade_atual: item.quantidade_ideal },
    }));
  const setFalta = (item: Item) =>
    setAnswers((p) => ({ ...p, [item.id]: { status: "falta", quantidade_atual: 0 } }));
  const setQty = (item: Item, qty: number) => {
    const status: ItemStatus =
      qty === item.quantidade_ideal ? "ok" : qty <= 0 ? "falta" : "divergente";
    setAnswers((p) => ({ ...p, [item.id]: { status, quantidade_atual: qty } }));
  };

  const stats = useMemo(() => {
    const total = items.length;
    let ok = 0,
      div = 0,
      falta = 0;
    items.forEach((it) => {
      const a = answers[it.id];
      if (!a) return;
      if (a.status === "ok") ok++;
      else if (a.status === "divergente") div++;
      else falta++;
    });
    return { total, ok, div, falta };
  }, [items, answers]);

  const handleSubmit = async () => {
    if (!profile?.id) {
      toast.error("Perfil não encontrado");
      return;
    }
    if (items.length === 0) {
      toast.error("Não há itens cadastrados.");
      return;
    }
    setSubmitting(true);
    const { data: sub, error: subErr } = await supabase
      .from("checklist_submissions")
      .insert({
        profile_id: profile.id,
        base_id: profile.base_id || null,
        tipo: "diario",
        observacoes: observacoes.trim() || null,
      })
      .select()
      .single();
    if (subErr || !sub) {
      setSubmitting(false);
      toast.error(subErr?.message || "Erro ao salvar conferência");
      return;
    }
    const rows = items.map((it) => ({
      submission_id: sub.id,
      item_id: it.id,
      status: answers[it.id]?.status || "ok",
      quantidade_atual: answers[it.id]?.quantidade_atual ?? it.quantidade_ideal,
    }));
    const { error: itemsErr } = await supabase.from("checklist_submission_items").insert(rows);
    setSubmitting(false);
    if (itemsErr) {
      toast.error(itemsErr.message);
      return;
    }
    toast.success("Checklist assinado e enviado!");
    setObservacoes("");
    setHistory((prev) => [
      { id: sub.id, created_at: sub.created_at, tipo: sub.tipo, observacoes: sub.observacoes },
      ...prev,
    ].slice(0, 5));
  };

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Package className="w-6 h-6" /> Checklist de Conferência
        </h1>
        <p className="text-sm text-muted-foreground">
          Confirme item a item. Use "OK" se a quantidade está correta, ajuste se divergente, ou marque "F" se em falta.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Itens</p><p className="text-2xl font-bold">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">OK</p><p className="text-2xl font-bold text-stable">{stats.ok}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Divergentes</p><p className="text-2xl font-bold text-warning">{stats.div}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Em Falta</p><p className="text-2xl font-bold text-destructive">{stats.falta}</p></CardContent></Card>
      </div>

      {categories.length === 0 && (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Nenhum item de checklist cadastrado. Aguarde o administrador.
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
                return (
                  <div key={it.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{it.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          Qtd ideal: {it.quantidade_ideal}{it.unidade ? ` ${it.unidade}` : ""}
                        </p>
                      </div>
                      {a?.status === "ok" && (
                        <Badge className="bg-stable text-stable-foreground gap-1"><CheckCircle2 className="w-3 h-3" /> OK</Badge>
                      )}
                      {a?.status === "divergente" && (
                        <Badge className="bg-warning text-warning-foreground gap-1"><AlertTriangle className="w-3 h-3" /> Divergente</Badge>
                      )}
                      {a?.status === "falta" && (
                        <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> Falta</Badge>
                      )}
                    </div>
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
