import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Pencil,
  Trash2,
  Package,
  ClipboardList,
  History,
  Eye,
  FileDown,
  Filter,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Base {
  id: string;
  nome: string;
  sigla: string;
}
interface Category {
  id: string;
  nome: string;
  descricao: string | null;
  ordem: number;
  ativo: boolean;
  base_id: string | null;
  escopo: string;
}
interface Item {
  id: string;
  category_id: string;
  nome: string;
  quantidade_ideal: number;
  unidade: string | null;
  ordem: number;
  ativo: boolean;
  tipo_resposta: string;
}

interface SubmissionRow {
  id: string;
  created_at: string;
  tipo: string;
  observacoes: string | null;
  base_id: string | null;
  vehicle_id: string | null;
  event_id: string | null;
  profile_id: string;
  profiles?: { nome: string; especialidade: string; base_id: string | null } | null;
  events?: { nome_evento: string } | null;
  vehicles?: { prefixo: string; placa: string } | null;
  checklist_submission_items: Array<{
    status: string;
    quantidade_atual: number | null;
    observacao: string | null;
    checklist_items: {
      nome: string;
      quantidade_ideal: number;
      unidade: string | null;
      tipo_resposta: string;
      checklist_categories: { nome: string; base_id: string | null; escopo: string } | null;
    } | null;
  }>;
}

const ALL = "__all__";

export default function ChecklistManagement() {
  const { profile } = useAuth();
  const isOperacional = profile?.cargo === "operacional";
  const lockedBaseId = isOperacional ? profile?.base_id || null : null;

  const [bases, setBases] = useState<Base[]>([]);
  const [selectedBaseId, setSelectedBaseId] = useState<string>("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const [catDialog, setCatDialog] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catForm, setCatForm] = useState({ nome: "", descricao: "", ordem: 0, escopo: "medico" });

  const [itemDialog, setItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [itemForm, setItemForm] = useState({
    category_id: "",
    nome: "",
    quantidade_ideal: 1,
    unidade: "",
    ordem: 0,
    tipo_resposta: "quantidade",
  });

  // History
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [filtroBase, setFiltroBase] = useState<string>(ALL);
  const [filtroProfile, setFiltroProfile] = useState<string>(ALL);
  const [filtroEvento, setFiltroEvento] = useState<string>(ALL);
  const [filtroTipo, setFiltroTipo] = useState<string>(ALL);
  const [filtroEscopo, setFiltroEscopo] = useState<string>(ALL);
  const [filtroDe, setFiltroDe] = useState<string>("");
  const [filtroAte, setFiltroAte] = useState<string>("");
  const [detail, setDetail] = useState<SubmissionRow | null>(null);

  // Load bases
  useEffect(() => {
    supabase
      .from("bases")
      .select("id, nome, sigla")
      .order("nome")
      .then(({ data }) => {
        const list = data || [];
        setBases(list);
        if (lockedBaseId) {
          setSelectedBaseId(lockedBaseId);
          setFiltroBase(lockedBaseId);
        } else if (list.length > 0 && !selectedBaseId) {
          setSelectedBaseId(list[0].id);
        }
      });
  }, [lockedBaseId]);

  const loadCatalog = async () => {
    if (!selectedBaseId) return;
    setLoading(true);
    const cats = await supabase
      .from("checklist_categories")
      .select("*")
      .eq("base_id", selectedBaseId)
      .order("ordem")
      .order("nome");
    const catList = (cats.data || []) as Category[];
    setCategories(catList);
    if (catList.length === 0) {
      setItems([]);
    } else {
      const its = await supabase
        .from("checklist_items")
        .select("*")
        .in("category_id", catList.map((c) => c.id))
        .order("ordem")
        .order("nome");
      setItems(its.data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBaseId]);

  const openNewCat = () => {
    setEditingCat(null);
    setCatForm({ nome: "", descricao: "", ordem: categories.length, escopo: "medico" });
    setCatDialog(true);
  };
  const openEditCat = (c: Category) => {
    setEditingCat(c);
    setCatForm({ nome: c.nome, descricao: c.descricao || "", ordem: c.ordem, escopo: c.escopo || "medico" });
    setCatDialog(true);
  };
  const saveCat = async () => {
    if (!catForm.nome.trim()) {
      toast.error("Informe o nome da categoria");
      return;
    }
    if (!selectedBaseId) {
      toast.error("Selecione uma base");
      return;
    }
    const payload = {
      nome: catForm.nome.trim(),
      descricao: catForm.descricao.trim() || null,
      ordem: catForm.ordem,
      base_id: selectedBaseId,
      escopo: catForm.escopo,
    };
    const { error } = editingCat
      ? await supabase.from("checklist_categories").update(payload).eq("id", editingCat.id)
      : await supabase.from("checklist_categories").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Categoria salva");
    setCatDialog(false);
    loadCatalog();
  };
  const deleteCat = async (c: Category) => {
    if (!confirm(`Excluir "${c.nome}" e todos os seus itens?`)) return;
    const { error } = await supabase.from("checklist_categories").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Categoria excluída");
    loadCatalog();
  };

  const openNewItem = (categoryId?: string) => {
    setEditingItem(null);
    const catItems = categoryId ? items.filter((i) => i.category_id === categoryId) : [];
    const cat = categories.find((c) => c.id === (categoryId || categories[0]?.id));
    setItemForm({
      category_id: categoryId || categories[0]?.id || "",
      nome: "",
      quantidade_ideal: 1,
      unidade: "",
      ordem: catItems.length,
      tipo_resposta: cat?.escopo === "viatura" ? "condicao" : "quantidade",
    });
    setItemDialog(true);
  };
  const openEditItem = (it: Item) => {
    setEditingItem(it);
    setItemForm({
      category_id: it.category_id,
      nome: it.nome,
      quantidade_ideal: it.quantidade_ideal,
      unidade: it.unidade || "",
      ordem: it.ordem,
      tipo_resposta: it.tipo_resposta || "quantidade",
    });
    setItemDialog(true);
  };
  const saveItem = async () => {
    if (!itemForm.nome.trim() || !itemForm.category_id) {
      toast.error("Preencha categoria e nome do item");
      return;
    }
    const payload = {
      category_id: itemForm.category_id,
      nome: itemForm.nome.trim(),
      quantidade_ideal: Math.max(0, Number(itemForm.quantidade_ideal) || 0),
      unidade: itemForm.unidade.trim() || null,
      ordem: itemForm.ordem,
      tipo_resposta: itemForm.tipo_resposta,
    };
    const { error } = editingItem
      ? await supabase.from("checklist_items").update(payload).eq("id", editingItem.id)
      : await supabase.from("checklist_items").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Item salvo");
    setItemDialog(false);
    loadCatalog();
  };
  const deleteItem = async (it: Item) => {
    if (!confirm(`Excluir "${it.nome}"?`)) return;
    const { error } = await supabase.from("checklist_items").delete().eq("id", it.id);
    if (error) return toast.error(error.message);
    toast.success("Item excluído");
    loadCatalog();
  };

  // ----- HISTORY -----
  const loadHistory = async () => {
    setHistoryLoading(true);
    const { data, error } = await supabase
      .from("checklist_submissions")
      .select(
        `id, created_at, tipo, observacoes, base_id, vehicle_id, event_id, profile_id,
         profiles:profile_id (nome, especialidade, base_id),
         events:event_id (nome_evento),
         vehicles:vehicle_id (prefixo, placa),
         checklist_submission_items (
           status, quantidade_atual, observacao,
           checklist_items (
             nome, quantidade_ideal, unidade, tipo_resposta,
             checklist_categories (nome, base_id, escopo)
           )
         )`
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      toast.error(error.message);
      setHistoryLoading(false);
      return;
    }
    setSubmissions((data as any) || []);
    setHistoryLoading(false);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const filteredSubs = useMemo(() => {
    return submissions.filter((s) => {
      const day = s.created_at.slice(0, 10); // YYYY-MM-DD
      if (filtroDe && day < filtroDe) return false;
      if (filtroAte && day > filtroAte) return false;
      if (filtroTipo !== ALL && s.tipo !== filtroTipo) return false;
      if (filtroProfile !== ALL && s.profile_id !== filtroProfile) return false;
      if (filtroEvento !== ALL && s.event_id !== filtroEvento) return false;
      if (filtroBase !== ALL) {
        const subBase = s.base_id || s.profiles?.base_id || null;
        if (subBase !== filtroBase) return false;
      }
      if (filtroEscopo !== ALL) {
        const escopos = new Set(
          s.checklist_submission_items
            .map((it) => it.checklist_items?.checklist_categories?.escopo)
            .filter(Boolean) as string[]
        );
        if (!escopos.has(filtroEscopo)) return false;
      }
      return true;
    });
  }, [submissions, filtroBase, filtroProfile, filtroEvento, filtroTipo, filtroEscopo, filtroDe, filtroAte]);

  const profOptions = useMemo(() => {
    const map = new Map<string, string>();
    submissions.forEach((s) => {
      if (s.profile_id && s.profiles?.nome) map.set(s.profile_id, s.profiles.nome);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [submissions]);
  const evOptions = useMemo(() => {
    const map = new Map<string, string>();
    submissions.forEach((s) => {
      if (s.event_id && s.events?.nome_evento) map.set(s.event_id, s.events.nome_evento);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [submissions]);

  const countsOf = (s: SubmissionRow) => {
    let ok = 0,
      div = 0,
      falta = 0;
    s.checklist_submission_items.forEach((it) => {
      if (it.status === "ok") ok++;
      else if (it.status === "divergente") div++;
      else if (it.status === "falta") falta++;
    });
    return { ok, div, falta, total: s.checklist_submission_items.length };
  };

  const baseName = (id: string | null | undefined) =>
    bases.find((b) => b.id === id)?.nome || "—";

  const downloadPdf = (s: SubmissionRow) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Anjos da Vida Saúde", 14, 16);
    doc.setFontSize(11);
    doc.text("Conferência de Checklist", 14, 24);
    const dateStr = format(new Date(s.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    const meta = [
      ["Data/Hora", dateStr],
      ["Profissional", `${s.profiles?.nome || "—"} (${s.profiles?.especialidade || "—"})`],
      ["Base", baseName(s.base_id || s.profiles?.base_id)],
      ["Tipo", s.tipo],
      ["Evento", s.events?.nome_evento || "—"],
      ["Viatura", s.vehicles ? `${s.vehicles.prefixo} — ${s.vehicles.placa}` : "—"],
      ["Observações", s.observacoes || "—"],
    ];
    autoTable(doc, {
      startY: 30,
      head: [["Campo", "Valor"]],
      body: meta,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 64, 175] },
    });

    // Group items by category
    const groups = new Map<string, Array<typeof s.checklist_submission_items[number]>>();
    s.checklist_submission_items.forEach((it) => {
      const cat = it.checklist_items?.checklist_categories?.nome || "Sem categoria";
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(it);
    });

    let y = (doc as any).lastAutoTable.finalY + 6;
    Array.from(groups.entries()).forEach(([cat, list]) => {
      doc.setFontSize(11);
      doc.text(cat, 14, y);
      autoTable(doc, {
        startY: y + 2,
        head: [["Item", "Ideal/Tipo", "Atual/Resposta", "Status", "Obs."]],
        body: list.map((it) => {
          const isCond = it.checklist_items?.tipo_resposta === "condicao";
          const statusLabel = isCond
            ? it.status === "ok" ? "OK" : it.status === "divergente" ? "NOK" : "N/A"
            : it.status.toUpperCase();
          return [
            it.checklist_items?.nome || "—",
            isCond ? "Condição" : `${it.checklist_items?.quantidade_ideal ?? "-"}${it.checklist_items?.unidade ? " " + it.checklist_items.unidade : ""}`,
            isCond ? statusLabel : (it.quantidade_atual ?? "-"),
            statusLabel,
            it.observacao || "",
          ];
        }),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [30, 64, 175] },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    });

    doc.save(`checklist-${dateStr.replace(/[/: ]/g, "-")}.pdf`);
  };

  const clearFilters = () => {
    setFiltroBase(lockedBaseId || ALL);
    setFiltroProfile(ALL);
    setFiltroEvento(ALL);
    setFiltroTipo(ALL);
    setFiltroEscopo(ALL);
    setFiltroDe("");
    setFiltroAte("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="w-6 h-6" /> Checklist — Ambulâncias e Kits
        </h1>
        <p className="text-sm text-muted-foreground">
          Cadastre categorias e itens por base e acompanhe o histórico de conferências.
        </p>
      </div>

      <Tabs defaultValue="catalogo">
        <TabsList>
          <TabsTrigger value="catalogo" className="gap-2">
            <Package className="w-4 h-4" /> Categorias e Itens
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-2">
            <History className="w-4 h-4" /> Histórico de Conferências
          </TabsTrigger>
        </TabsList>

        {/* CATALOGO TAB */}
        <TabsContent value="catalogo" className="space-y-4">
          <Card>
            <CardContent className="p-4 flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[220px]">
                <Label>Base *</Label>
                <Select
                  value={selectedBaseId}
                  onValueChange={setSelectedBaseId}
                  disabled={!!lockedBaseId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a base" />
                  </SelectTrigger>
                  <SelectContent>
                    {bases.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.nome} ({b.sigla})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedBaseId && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Editando o checklist da base{" "}
                    <strong>{baseName(selectedBaseId)}</strong>.
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={openNewCat} className="gap-2" disabled={!selectedBaseId}>
                  <Plus className="w-4 h-4" /> Nova Categoria
                </Button>
                <Button
                  onClick={() => openNewItem()}
                  disabled={categories.length === 0}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" /> Novo Item
                </Button>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <p className="text-muted-foreground">Carregando…</p>
          ) : categories.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Nenhuma categoria cadastrada para esta base. Comece criando uma categoria
                (compartimento).
              </CardContent>
            </Card>
          ) : (
            categories.map((cat) => {
              const catItems = items.filter((i) => i.category_id === cat.id);
              return (
                <Card key={cat.id}>
                  <CardHeader className="flex flex-row items-center justify-between gap-2">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-primary" />
                        {cat.nome}
                        <Badge variant="secondary">
                          {catItems.length} {catItems.length === 1 ? "item" : "itens"}
                        </Badge>
                        <Badge variant={cat.escopo === "viatura" ? "default" : "outline"}>
                          {cat.escopo === "viatura" ? "Viatura" : "Kit Médico"}
                        </Badge>
                      </CardTitle>
                      {cat.descricao && (
                        <p className="text-sm text-muted-foreground mt-1">{cat.descricao}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openNewItem(cat.id)}>
                        <Plus className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openEditCat(cat)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteCat(cat)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {catItems.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum item cadastrado.</p>
                    ) : (
                      <div className="divide-y">
                        {catItems.map((it) => (
                          <div key={it.id} className="flex items-center justify-between py-2">
                            <div>
                              <p className="font-medium">{it.nome}</p>
                              <p className="text-xs text-muted-foreground">
                                Qtd ideal: {it.quantidade_ideal}
                                {it.unidade ? ` ${it.unidade}` : ""}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={() => openEditItem(it)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => deleteItem(it)}>
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* HISTORICO TAB */}
        <TabsContent value="historico" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="w-4 h-4" /> Filtros
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                <X className="w-4 h-4" /> Limpar
              </Button>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              <div>
                <Label className="text-xs">Base</Label>
                <Select value={filtroBase} onValueChange={setFiltroBase} disabled={!!lockedBaseId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Todas</SelectItem>
                    {bases.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Profissional</Label>
                <Select value={filtroProfile} onValueChange={setFiltroProfile}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Todos</SelectItem>
                    {profOptions.map(([id, nome]) => (
                      <SelectItem key={id} value={id}>{nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Evento</Label>
                <Select value={filtroEvento} onValueChange={setFiltroEvento}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Todos</SelectItem>
                    {evOptions.map(([id, nome]) => (
                      <SelectItem key={id} value={id}>{nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Todos</SelectItem>
                    <SelectItem value="diario">Diário</SelectItem>
                    <SelectItem value="evento">Evento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Escopo</Label>
                <Select value={filtroEscopo} onValueChange={setFiltroEscopo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Todos</SelectItem>
                    <SelectItem value="medico">Kit Médico</SelectItem>
                    <SelectItem value="viatura">Viatura</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">De</Label>
                <Input type="date" value={filtroDe} onChange={(e) => setFiltroDe(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Até</Label>
                <Input type="date" value={filtroAte} onChange={(e) => setFiltroAte(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {historyLoading ? (
                <p className="p-6 text-muted-foreground">Carregando...</p>
              ) : filteredSubs.length === 0 ? (
                <p className="p-6 text-center text-muted-foreground">
                  Nenhuma conferência encontrada com os filtros atuais.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Profissional</TableHead>
                        <TableHead>Base</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Evento</TableHead>
                        <TableHead>Viatura</TableHead>
                        <TableHead className="text-center">Itens</TableHead>
                        <TableHead className="text-center">OK</TableHead>
                        <TableHead className="text-center">Div.</TableHead>
                        <TableHead className="text-center">Falta</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSubs.map((s) => {
                        const c = countsOf(s);
                        return (
                          <TableRow key={s.id}>
                            <TableCell className="text-xs">
                              {format(new Date(s.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm font-medium">{s.profiles?.nome || "—"}</div>
                              <div className="text-xs text-muted-foreground">
                                {s.profiles?.especialidade || ""}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              {baseName(s.base_id || s.profiles?.base_id)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={s.tipo === "evento" ? "default" : "outline"}>
                                {s.tipo}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{s.events?.nome_evento || "—"}</TableCell>
                            <TableCell className="text-sm">
                              {s.vehicles ? `${s.vehicles.prefixo}` : "—"}
                            </TableCell>
                            <TableCell className="text-center">{c.total}</TableCell>
                            <TableCell className="text-center text-stable font-medium">{c.ok}</TableCell>
                            <TableCell className="text-center text-warning font-medium">{c.div}</TableCell>
                            <TableCell className="text-center text-destructive font-medium">{c.falta}</TableCell>
                            <TableCell>
                              <Button size="sm" variant="ghost" onClick={() => setDetail(s)}>
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhe da Conferência</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Data:</span>{" "}
                  {format(new Date(detail.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</div>
                <div><span className="text-muted-foreground">Tipo:</span> {detail.tipo}</div>
                <div><span className="text-muted-foreground">Profissional:</span>{" "}
                  {detail.profiles?.nome} ({detail.profiles?.especialidade})</div>
                <div><span className="text-muted-foreground">Base:</span>{" "}
                  {baseName(detail.base_id || detail.profiles?.base_id)}</div>
                <div><span className="text-muted-foreground">Evento:</span>{" "}
                  {detail.events?.nome_evento || "—"}</div>
                <div><span className="text-muted-foreground">Viatura:</span>{" "}
                  {detail.vehicles ? `${detail.vehicles.prefixo} — ${detail.vehicles.placa}` : "—"}</div>
              </div>
              {detail.observacoes && (
                <div className="bg-muted p-3 rounded-md text-sm">
                  <strong>Observações:</strong> {detail.observacoes}
                </div>
              )}

              {Array.from(
                detail.checklist_submission_items.reduce((acc, it) => {
                  const key = it.checklist_items?.checklist_categories?.nome || "Sem categoria";
                  if (!acc.has(key)) acc.set(key, []);
                  acc.get(key)!.push(it);
                  return acc;
                }, new Map<string, typeof detail.checklist_submission_items>()).entries()
              ).map(([cat, list]) => (
                <div key={cat}>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Package className="w-4 h-4" /> {cat}
                  </h4>
                  <div className="border rounded-md divide-y">
                    {list.map((it, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 text-sm">
                        <div className="flex-1">
                          <p className="font-medium">{it.checklist_items?.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            Ideal: {it.checklist_items?.quantidade_ideal}
                            {it.checklist_items?.unidade ? ` ${it.checklist_items.unidade}` : ""}
                            {" • "}Atual: {it.quantidade_atual ?? "-"}
                          </p>
                        </div>
                        <Badge
                          variant={
                            it.status === "ok"
                              ? "default"
                              : it.status === "divergente"
                              ? "secondary"
                              : "destructive"
                          }
                          className={
                            it.status === "ok"
                              ? "bg-stable text-stable-foreground"
                              : it.status === "divergente"
                              ? "bg-warning text-warning-foreground"
                              : ""
                          }
                        >
                          {it.status.toUpperCase()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            {detail && (
              <Button onClick={() => downloadPdf(detail)} className="gap-2">
                <FileDown className="w-4 h-4" /> Baixar PDF
              </Button>
            )}
            <Button variant="outline" onClick={() => setDetail(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={catDialog} onOpenChange={setCatDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCat ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome *</Label>
              <Input
                value={catForm.nome}
                onChange={(e) => setCatForm({ ...catForm, nome: e.target.value })}
                placeholder="Ex.: Mochila Azul - Vias Aéreas"
              />
            </div>
            <div>
              <Label>Escopo *</Label>
              <Select value={catForm.escopo} onValueChange={(v) => setCatForm({ ...catForm, escopo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="medico">Kit Médico (quantidade)</SelectItem>
                  <SelectItem value="viatura">Viatura (condição: OK/NOK/NA)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Define o tipo de conferência: itens com quantidade ou checagem de condição.
              </p>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={catForm.descricao}
                onChange={(e) => setCatForm({ ...catForm, descricao: e.target.value })}
                rows={2}
              />
            </div>
            <div>
              <Label>Ordem de exibição</Label>
              <Input
                type="number"
                value={catForm.ordem}
                onChange={(e) => setCatForm({ ...catForm, ordem: Number(e.target.value) })}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Esta categoria será criada na base <strong>{baseName(selectedBaseId)}</strong>.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialog(false)}>Cancelar</Button>
            <Button onClick={saveCat}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item Dialog */}
      <Dialog open={itemDialog} onOpenChange={setItemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar Item" : "Novo Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Categoria *</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={itemForm.category_id}
                onChange={(e) => setItemForm({ ...itemForm, category_id: e.target.value })}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Nome do Material/Medicamento *</Label>
              <Input
                value={itemForm.nome}
                onChange={(e) => setItemForm({ ...itemForm, nome: e.target.value })}
                placeholder="Ex.: Cânula de Guedel nº 3"
              />
            </div>
            <div>
              <Label>Tipo de resposta *</Label>
              <Select
                value={itemForm.tipo_resposta}
                onValueChange={(v) => setItemForm({ ...itemForm, tipo_resposta: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="quantidade">Quantidade (ideal vs atual)</SelectItem>
                  <SelectItem value="condicao">Condição (OK / NOK / N/A)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {itemForm.tipo_resposta === "quantidade" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Quantidade Ideal *</Label>
                  <Input
                    type="number"
                    min={0}
                    value={itemForm.quantidade_ideal}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, quantidade_ideal: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label>Unidade</Label>
                  <Input
                    value={itemForm.unidade}
                    onChange={(e) => setItemForm({ ...itemForm, unidade: e.target.value })}
                    placeholder="un, amp, fr…"
                  />
                </div>
              </div>
            )}
            <div>
              <Label>Ordem dentro da categoria</Label>
              <Input
                type="number"
                value={itemForm.ordem}
                onChange={(e) => setItemForm({ ...itemForm, ordem: Number(e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialog(false)}>Cancelar</Button>
            <Button onClick={saveItem}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
