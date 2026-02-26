import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Phone, Plus, Trash2, Pencil } from 'lucide-react';

interface RegPhone {
  id: string;
  nome: string;
  telefone: string;
  descricao: string | null;
}

export default function RegulationPhones() {
  const { toast } = useToast();
  const [phones, setPhones] = useState<RegPhone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [descricao, setDescricao] = useState('');

  const fetchPhones = async () => {
    const { data } = await supabase.from('regulation_phones').select('*').order('nome');
    setPhones(data || []);
    setIsLoading(false);
  };

  useEffect(() => { fetchPhones(); }, []);

  const resetForm = () => {
    setNome(''); setTelefone(''); setDescricao(''); setEditingId(null);
  };

  const handleSave = async () => {
    if (!nome.trim() || !telefone.trim()) {
      toast({ title: 'Preencha nome e telefone', variant: 'destructive' });
      return;
    }

    const payload = { nome: nome.trim(), telefone: telefone.trim(), descricao: descricao.trim() || null };

    if (editingId) {
      const { error } = await supabase.from('regulation_phones').update(payload).eq('id', editingId);
      if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Telefone atualizado!' });
    } else {
      const { error } = await supabase.from('regulation_phones').insert(payload);
      if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Telefone cadastrado!' });
    }

    setShowDialog(false);
    resetForm();
    fetchPhones();
  };

  const handleEdit = (p: RegPhone) => {
    setEditingId(p.id); setNome(p.nome); setTelefone(p.telefone); setDescricao(p.descricao || '');
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('regulation_phones').delete().eq('id', id);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Telefone removido!' });
    fetchPhones();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Telefones da Regulação</h1>
        <Dialog open={showDialog} onOpenChange={(o) => { setShowDialog(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" />Novo</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar' : 'Novo'} Telefone</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: SAMU Regional" />
              </div>
              <div className="space-y-2">
                <Label>Telefone *</Label>
                <Input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="Ex: 192" />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Opcional" />
              </div>
              <Button onClick={handleSave} className="w-full">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : phones.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhum telefone cadastrado
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {phones.map(p => (
            <Card key={p.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{p.nome}</p>
                    <p className="text-sm text-muted-foreground">{p.telefone}</p>
                    {p.descricao && <p className="text-xs text-muted-foreground">{p.descricao}</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(p)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
