import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Users, Calendar, Wallet, Check, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Profile {
  id: string;
  nome: string;
  especialidade: string;
  base_id: string | null;
}

interface Event {
  id: string;
  nome_evento: string;
}

interface Payment {
  id: string;
  profile_id: string;
  event_id: string | null;
  valor: number;
  tipo_pagamento: string;
  data_pagamento: string | null;
  status: string;
  descricao: string | null;
  profiles?: { nome: string; especialidade: string };
  events?: { nome_evento: string };
}

const statusColors: Record<string, string> = {
  pendente: 'bg-warning/20 text-warning border-warning/30',
  pago: 'bg-stable/20 text-stable border-stable/30',
  cancelado: 'bg-muted text-muted-foreground',
};

const tipoPagamentoLabels: Record<string, string> = {
  pix: 'PIX',
  transferencia: 'Transferência',
  boleto: 'Boleto',
  cartao: 'Cartão',
  dinheiro: 'Dinheiro',
  cheque: 'Cheque',
};

export default function Payroll() {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedBase, setSelectedBase] = useState("all");
  const [bases, setBases] = useState<{id: string; sigla: string; nome: string}[]>([]);

  const [formData, setFormData] = useState({
    profile_id: '',
    event_id: '',
    valor: '',
    tipo_pagamento: '',
    data_pagamento: '',
    descricao: '',
  });

  useEffect(() => {
    supabase.from('bases').select('id, sigla, nome').order('sigla').then(({ data }) => {
      setBases(data || []);
    });
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const [profilesRes, eventsRes, paymentsRes] = await Promise.all([
      supabase.from('profiles').select('id, nome, especialidade, base_id').eq('hidden', false).eq('is_account_only', false).order('nome'),
      supabase.from('events').select('id, nome_evento').order('data_inicio', { ascending: false }),
      supabase
        .from('professional_payments')
        .select('*, profiles(nome, especialidade, base_id), events(nome_evento)')
        .order('created_at', { ascending: false }),
    ]);

    setProfiles(profilesRes.data || []);
    setEvents(eventsRes.data || []);
    setPayments(paymentsRes.data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredPayments = selectedBase === "all"
    ? payments
    : payments.filter((p) => {
        const profile = profiles.find(pr => pr.id === p.profile_id);
        return profile?.base_id === selectedBase;
      });

  const totalPendente = filteredPayments
    .filter((p) => p.status === 'pendente')
    .reduce((sum, p) => sum + Number(p.valor), 0);

  const totalPago = filteredPayments
    .filter((p) => p.status === 'pago')
    .reduce((sum, p) => sum + Number(p.valor), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('professional_payments').insert({
      profile_id: formData.profile_id,
      event_id: formData.event_id || null,
      valor: parseFloat(formData.valor),
      tipo_pagamento: formData.tipo_pagamento as 'pix' | 'transferencia' | 'boleto' | 'cartao' | 'dinheiro' | 'cheque',
      data_pagamento: formData.data_pagamento || null,
      status: (formData.data_pagamento ? 'pago' : 'pendente') as 'pendente' | 'pago' | 'cancelado' | 'atrasado',
      descricao: formData.descricao || null,
    });

    if (error) {
      toast({ title: 'Erro ao criar pagamento', variant: 'destructive' });
    } else {
      toast({ title: 'Pagamento criado!' });
      setIsDialogOpen(false);
      setFormData({ profile_id: '', event_id: '', valor: '', tipo_pagamento: '', data_pagamento: '', descricao: '' });
      fetchData();
    }
  };

  const handleMarkAsPaid = async (payment: Payment) => {
    const { error } = await supabase
      .from('professional_payments')
      .update({
        status: 'pago',
        data_pagamento: format(new Date(), 'yyyy-MM-dd'),
      })
      .eq('id', payment.id);

    if (error) {
      toast({ title: 'Erro ao atualizar pagamento', variant: 'destructive' });
    } else {
      toast({ title: 'Pagamento confirmado!' });
      fetchData();
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pagamentos</h1>
          <p className="text-muted-foreground">Pagamentos aos profissionais</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={selectedBase} onValueChange={setSelectedBase}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Todas as Bases" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Bases</SelectItem>
              {bases.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.sigla} — {b.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setIsDialogOpen(true)} className="btn-touch gap-2">
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Novo Pagamento</span>
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pendente</p>
                <p className="text-xl font-bold text-warning">
                  R$ {totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-stable/20 flex items-center justify-center">
                <Check className="w-5 h-5 text-stable" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pago</p>
                <p className="text-xl font-bold text-stable">
                  R$ {totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments List */}
      <div className="space-y-3">
        {payments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Wallet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum pagamento registrado</p>
            </CardContent>
          </Card>
        ) : (
          payments.map((payment) => (
            <Card key={payment.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      <span className="font-medium">{payment.profiles?.nome}</span>
                      <Badge variant="outline" className="text-xs">
                        {payment.profiles?.especialidade}
                      </Badge>
                    </div>
                    {payment.events && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        {payment.events.nome_evento}
                      </div>
                    )}
                    {payment.descricao && (
                      <p className="text-sm text-muted-foreground">{payment.descricao}</p>
                    )}
                    <Badge variant="outline">
                      {tipoPagamentoLabels[payment.tipo_pagamento]}
                    </Badge>
                  </div>
                  <div className="text-right space-y-2">
                    <p className="text-xl font-bold">
                      R$ {Number(payment.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <Badge className={statusColors[payment.status]}>
                      {payment.status === 'pago' ? 'Pago' : 'Pendente'}
                    </Badge>
                    {payment.status === 'pendente' && (
                      <div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-stable hover:text-stable"
                          onClick={() => handleMarkAsPaid(payment)}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Confirmar
                        </Button>
                      </div>
                    )}
                    {payment.data_pagamento && (
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(payment.data_pagamento), 'dd/MM/yyyy')}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Pagamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Profissional *</Label>
              <Select
                value={formData.profile_id}
                onValueChange={(v) => setFormData({ ...formData, profile_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o profissional" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome} - {p.especialidade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Evento (opcional)</Label>
              <Select
                value={formData.event_id}
                onValueChange={(v) => setFormData({ ...formData, event_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o evento" />
                </SelectTrigger>
                <SelectContent>
                  {events.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome_evento}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.valor}
                  onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Forma de Pagamento *</Label>
                <Select
                  value={formData.tipo_pagamento}
                  onValueChange={(v) => setFormData({ ...formData, tipo_pagamento: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(tipoPagamentoLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Data do Pagamento (deixe vazio para pendente)</Label>
              <Input
                type="date"
                value={formData.data_pagamento}
                onChange={(e) => setFormData({ ...formData, data_pagamento: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Ex: Plantão extra, Bônus, etc."
              />
            </div>
            <Button type="submit" className="w-full btn-touch">
              Criar Pagamento
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
