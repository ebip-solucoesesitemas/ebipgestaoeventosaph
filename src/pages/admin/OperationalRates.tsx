import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, Settings, Navigation, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface OperationalRate {
  id: string;
  tipo: string;
  valor: number;
  descricao: string | null;
}

const tipoLabels: Record<string, string> = {
  km: 'Valor por Quilômetro (R$/km)',
};

export default function OperationalRates() {
  const { toast } = useToast();
  const [rates, setRates] = useState<OperationalRate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newRate, setNewRate] = useState({ tipo: '', valor: '', descricao: '' });
  const [creating, setCreating] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('operational_rates')
      .select('*')
      .order('tipo');

    if (data) {
      setRates(data as OperationalRate[]);
      const values: Record<string, string> = {};
      data.forEach((r: OperationalRate) => {
        values[r.id] = r.valor.toString();
      });
      setEditValues(values);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const saveRate = async (rate: OperationalRate) => {
    setSaving(rate.id);
    const { error } = await supabase
      .from('operational_rates')
      .update({ valor: parseFloat(editValues[rate.id]) || 0 })
      .eq('id', rate.id);

    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Valor salvo!' });
      fetchData();
    }
    setSaving(null);
  };

  const createRate = async () => {
    if (!newRate.tipo.trim()) {
      toast({ title: 'Informe o tipo', variant: 'destructive' });
      return;
    }
    setCreating(true);
    const { error } = await supabase.from('operational_rates').insert({
      tipo: newRate.tipo.trim(),
      valor: parseFloat(newRate.valor) || 0,
      descricao: newRate.descricao.trim() || null,
    });
    if (error) {
      toast({ title: 'Erro ao criar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Valor criado com sucesso!' });
      setDialogOpen(false);
      setNewRate({ tipo: '', valor: '', descricao: '' });
      fetchData();
    }
    setCreating(false);
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
          <h1 className="text-2xl font-bold text-foreground">Valores Operacionais</h1>
          <p className="text-muted-foreground">Configure valores de quilometragem e outros custos</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> Novo Valor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Valor Operacional</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Tipo (identificador) *</Label>
                <Input
                  value={newRate.tipo}
                  onChange={(e) => setNewRate(prev => ({ ...prev, tipo: e.target.value }))}
                  placeholder="Ex: km, diaria, pedagio"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Descrição</Label>
                <Input
                  value={newRate.descricao}
                  onChange={(e) => setNewRate(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Ex: Valor por quilômetro rodado"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newRate.valor}
                  onChange={(e) => setNewRate(prev => ({ ...prev, valor: e.target.value }))}
                  placeholder="0,00"
                />
              </div>
              <Button className="w-full" onClick={createRate} disabled={creating}>
                {creating ? 'Criando...' : 'Cadastrar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rates.map((rate) => (
          <Card key={rate.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Navigation className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">
                    {tipoLabels[rate.tipo] || rate.tipo}
                  </CardTitle>
                  {rate.descricao && (
                    <p className="text-xs text-muted-foreground">{rate.descricao}</p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">Valor (R$)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={editValues[rate.id] || ''}
                  onChange={(e) => setEditValues(prev => ({ ...prev, [rate.id]: e.target.value }))}
                  placeholder="0,00"
                />
              </div>
              <Button
                className="w-full"
                onClick={() => saveRate(rate)}
                disabled={saving === rate.id}
              >
                <Save className="w-4 h-4 mr-2" />
                {saving === rate.id ? 'Salvando...' : 'Salvar'}
              </Button>
            </CardContent>
          </Card>
        ))}

        {rates.length === 0 && (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="py-12 text-center">
              <Settings className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum valor configurado</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
