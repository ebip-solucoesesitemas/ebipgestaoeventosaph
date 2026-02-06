import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, MapPin, Edit2, Trash2 } from 'lucide-react';

interface Base {
  id: string;
  nome: string;
  sigla: string;
  endereco: string | null;
}

export default function Bases() {
  const { toast } = useToast();
  const [bases, setBases] = useState<Base[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBase, setEditingBase] = useState<Base | null>(null);
  const [form, setForm] = useState({ nome: '', sigla: '', endereco: '' });

  const fetchBases = async () => {
    setIsLoading(true);
    const { data } = await supabase.from('bases').select('*').order('sigla');
    setBases(data || []);
    setIsLoading(false);
  };

  useEffect(() => { fetchBases(); }, []);

  const openNew = () => {
    setEditingBase(null);
    setForm({ nome: '', sigla: '', endereco: '' });
    setDialogOpen(true);
  };

  const openEdit = (base: Base) => {
    setEditingBase(base);
    setForm({ nome: base.nome, sigla: base.sigla, endereco: base.endereco || '' });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      nome: form.nome,
      sigla: form.sigla.toUpperCase(),
      endereco: form.endereco || null,
    };

    const { error } = editingBase
      ? await supabase.from('bases').update(payload).eq('id', editingBase.id)
      : await supabase.from('bases').insert(payload);

    if (error) {
      toast({ title: 'Erro ao salvar base', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: editingBase ? 'Base atualizada!' : 'Base criada!' });
      setDialogOpen(false);
      fetchBases();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta base?')) return;
    const { error } = await supabase.from('bases').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Base excluída!' });
      fetchBases();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bases Descentralizadas</h1>
          <p className="text-muted-foreground">Gerencie as bases de operação</p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="w-5 h-5" />
          Nova Base
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {bases.length === 0 ? (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="py-12 text-center">
              <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma base cadastrada</p>
            </CardContent>
          </Card>
        ) : (
          bases.map((base) => (
            <Card key={base.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <span className="text-lg font-bold text-primary">{base.sigla}</span>
                    </div>
                    <div>
                      <CardTitle className="text-base">{base.nome}</CardTitle>
                      {base.endereco && (
                        <p className="text-sm text-muted-foreground">{base.endereco}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(base)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(base.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBase ? 'Editar Base' : 'Nova Base'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex: Florianópolis"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Sigla *</Label>
              <Input
                value={form.sigla}
                onChange={(e) => setForm({ ...form, sigla: e.target.value.toUpperCase() })}
                placeholder="Ex: FLN"
                maxLength={5}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Endereço</Label>
              <Input
                value={form.endereco}
                onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                placeholder="Endereço da base"
              />
            </div>
            <Button type="submit" className="w-full">{editingBase ? 'Salvar' : 'Criar Base'}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
