import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Package, ClipboardList } from "lucide-react";
import { toast } from "sonner";

interface Category {
  id: string;
  nome: string;
  descricao: string | null;
  ordem: number;
  ativo: boolean;
}

interface Item {
  id: string;
  category_id: string;
  nome: string;
  quantidade_ideal: number;
  unidade: string | null;
  ordem: number;
  ativo: boolean;
}

export default function ChecklistManagement() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const [catDialog, setCatDialog] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catForm, setCatForm] = useState({ nome: "", descricao: "", ordem: 0 });

  const [itemDialog, setItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [itemForm, setItemForm] = useState({
    category_id: "",
    nome: "",
    quantidade_ideal: 1,
    unidade: "",
    ordem: 0,
  });

  const loadData = async () => {
    setLoading(true);
    const [cats, its] = await Promise.all([
      supabase.from("checklist_categories").select("*").order("ordem").order("nome"),
      supabase.from("checklist_items").select("*").order("ordem").order("nome"),
    ]);
    setCategories(cats.data || []);
    setItems(its.data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const openNewCat = () => {
    setEditingCat(null);
    setCatForm({ nome: "", descricao: "", ordem: categories.length });
    setCatDialog(true);
  };
  const openEditCat = (c: Category) => {
    setEditingCat(c);
    setCatForm({ nome: c.nome, descricao: c.descricao || "", ordem: c.ordem });
    setCatDialog(true);
  };
  const saveCat = async () => {
    if (!catForm.nome.trim()) {
      toast.error("Informe o nome da categoria");
      return;
    }
    const payload = {
      nome: catForm.nome.trim(),
      descricao: catForm.descricao.trim() || null,
      ordem: catForm.ordem,
    };
    const { error } = editingCat
      ? await supabase.from("checklist_categories").update(payload).eq("id", editingCat.id)
      : await supabase.from("checklist_categories").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Categoria salva");
    setCatDialog(false);
    loadData();
  };
  const deleteCat = async (c: Category) => {
    if (!confirm(`Excluir "${c.nome}" e todos os seus itens?`)) return;
    const { error } = await supabase.from("checklist_categories").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Categoria excluída");
    loadData();
  };

  const openNewItem = (categoryId?: string) => {
    setEditingItem(null);
    const catItems = categoryId ? items.filter((i) => i.category_id === categoryId) : [];
    setItemForm({
      category_id: categoryId || categories[0]?.id || "",
      nome: "",
      quantidade_ideal: 1,
      unidade: "",
      ordem: catItems.length,
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
    };
    const { error } = editingItem
      ? await supabase.from("checklist_items").update(payload).eq("id", editingItem.id)
      : await supabase.from("checklist_items").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Item salvo");
    setItemDialog(false);
    loadData();
  };
  const deleteItem = async (it: Item) => {
    if (!confirm(`Excluir "${it.nome}"?`)) return;
    const { error } = await supabase.from("checklist_items").delete().eq("id", it.id);
    if (error) return toast.error(error.message);
    toast.success("Item excluído");
    loadData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="w-6 h-6" /> Checklist — Ambulâncias e Kits
          </h1>
          <p className="text-sm text-muted-foreground">
            Cadastre categorias (compartimentos) e os itens que devem ser conferidos.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openNewCat} className="gap-2">
            <Plus className="w-4 h-4" /> Nova Categoria
          </Button>
          <Button onClick={() => openNewItem()} disabled={categories.length === 0} className="gap-2">
            <Plus className="w-4 h-4" /> Novo Item
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando…</p>
      ) : categories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhuma categoria cadastrada. Comece criando uma categoria (compartimento).
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
                    <Badge variant="secondary">{catItems.length} {catItems.length === 1 ? "item" : "itens"}</Badge>
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
                            Qtd ideal: {it.quantidade_ideal}{it.unidade ? ` ${it.unidade}` : ""}
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
