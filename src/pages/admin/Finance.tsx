import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Receipt,
  Plus,
  Calendar,
  Building2,
  CreditCard,
  Banknote,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Event {
  id: string;
  nome_evento: string;
  data_inicio: string;
}

interface Client {
  id: string;
  nome: string;
}

interface Budget {
  id: string;
  event_id: string;
  client_id: string | null;
  valor_contrato: number;
  descricao: string | null;
  status: string;
  data_vencimento: string | null;
  events?: { nome_evento: string };
  clients?: { nome: string };
}

interface Expense {
  id: string;
  event_id: string;
  categoria: string;
  descricao: string;
  valor: number;
  data_despesa: string;
  events?: { nome_evento: string };
}

interface Payment {
  id: string;
  budget_id: string;
  valor: number;
  tipo_pagamento: string;
  data_pagamento: string;
  event_budgets?: { events?: { nome_evento: string }; clients?: { nome: string } };
}

const statusColors: Record<string, string> = {
  pendente: 'bg-warning/20 text-warning border-warning/30',
  pago: 'bg-stable/20 text-stable border-stable/30',
  cancelado: 'bg-muted text-muted-foreground',
  atrasado: 'bg-critical/20 text-critical border-critical/30',
};

const categoriaLabels: Record<string, string> = {
  combustivel: 'Combustível',
  equipamento: 'Equipamento',
  diaria: 'Diária',
  alimentacao: 'Alimentação',
  hospedagem: 'Hospedagem',
  transporte: 'Transporte',
  outros: 'Outros',
};

const tipoPagamentoLabels: Record<string, string> = {
  pix: 'PIX',
  transferencia: 'Transferência',
  boleto: 'Boleto',
  cartao: 'Cartão',
  dinheiro: 'Dinheiro',
  cheque: 'Cheque',
};

export default function Finance() {
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialogs
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  // Form states
  const [budgetForm, setBudgetForm] = useState({
    event_id: '',
    client_id: '',
    valor_contrato: '',
    descricao: '',
    data_vencimento: '',
    forma_cobranca: '',
  });

  const [expenseForm, setExpenseForm] = useState({
    event_id: '',
    categoria: '',
    descricao: '',
    valor: '',
    data_despesa: format(new Date(), 'yyyy-MM-dd'),
  });

  const [paymentForm, setPaymentForm] = useState({
    budget_id: '',
    valor: '',
    tipo_pagamento: '',
    data_pagamento: format(new Date(), 'yyyy-MM-dd'),
    observacao: '',
  });

  const fetchData = async () => {
    setIsLoading(true);
    const [eventsRes, clientsRes, budgetsRes, expensesRes, paymentsRes] = await Promise.all([
      supabase.from('events').select('id, nome_evento, data_inicio').order('data_inicio', { ascending: false }),
      supabase.from('clients').select('id, nome').order('nome'),
      supabase.from('event_budgets').select('*, events(nome_evento), clients(nome)').order('created_at', { ascending: false }),
      supabase.from('event_expenses').select('*, events(nome_evento)').order('data_despesa', { ascending: false }),
      supabase.from('client_payments').select('*, event_budgets(events(nome_evento), clients(nome))').order('data_pagamento', { ascending: false }),
    ]);

    setEvents(eventsRes.data || []);
    setClients(clientsRes.data || []);
    setBudgets(budgetsRes.data || []);
    setExpenses(expensesRes.data || []);
    setPayments(paymentsRes.data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Calculate totals
  const totalReceitas = budgets
    .filter((b) => b.status === 'pago')
    .reduce((sum, b) => sum + Number(b.valor_contrato), 0);

  const totalPendente = budgets
    .filter((b) => b.status === 'pendente')
    .reduce((sum, b) => sum + Number(b.valor_contrato), 0);

  const totalDespesas = expenses.reduce((sum, e) => sum + Number(e.valor), 0);

  const saldo = totalReceitas - totalDespesas;

  // Submit handlers
  const handleBudgetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('event_budgets').insert({
      event_id: budgetForm.event_id,
      client_id: budgetForm.client_id || null,
      valor_contrato: parseFloat(budgetForm.valor_contrato),
      descricao: budgetForm.descricao || null,
      data_vencimento: budgetForm.data_vencimento || null,
      forma_cobranca: budgetForm.forma_cobranca || null,
    } as any);

    if (error) {
      toast({ title: 'Erro ao criar orçamento', variant: 'destructive' });
    } else {
      toast({ title: 'Orçamento criado!' });
      setBudgetDialogOpen(false);
      setBudgetForm({ event_id: '', client_id: '', valor_contrato: '', descricao: '', data_vencimento: '', forma_cobranca: '' });
      fetchData();
    }
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('event_expenses').insert({
      event_id: expenseForm.event_id,
      categoria: expenseForm.categoria as 'combustivel' | 'equipamento' | 'diaria' | 'alimentacao' | 'hospedagem' | 'transporte' | 'outros',
      descricao: expenseForm.descricao,
      valor: parseFloat(expenseForm.valor),
      data_despesa: expenseForm.data_despesa,
    });

    if (error) {
      toast({ title: 'Erro ao registrar despesa', variant: 'destructive' });
    } else {
      toast({ title: 'Despesa registrada!' });
      setExpenseDialogOpen(false);
      setExpenseForm({ event_id: '', categoria: '', descricao: '', valor: '', data_despesa: format(new Date(), 'yyyy-MM-dd') });
      fetchData();
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('client_payments').insert({
      budget_id: paymentForm.budget_id,
      valor: parseFloat(paymentForm.valor),
      tipo_pagamento: paymentForm.tipo_pagamento as 'pix' | 'transferencia' | 'boleto' | 'cartao' | 'dinheiro' | 'cheque',
      data_pagamento: paymentForm.data_pagamento,
      observacao: paymentForm.observacao || null,
    });

    if (error) {
      toast({ title: 'Erro ao registrar pagamento', variant: 'destructive' });
    } else {
      // Update budget status to paid
      await supabase
        .from('event_budgets')
        .update({ status: 'pago' })
        .eq('id', paymentForm.budget_id);

      toast({ title: 'Pagamento registrado!' });
      setPaymentDialogOpen(false);
      setPaymentForm({ budget_id: '', valor: '', tipo_pagamento: '', data_pagamento: format(new Date(), 'yyyy-MM-dd'), observacao: '' });
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
      <div>
        <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
        <p className="text-muted-foreground">Gestão de receitas e despesas</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-stable/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-stable" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Receitas</p>
                <p className="text-xl font-bold text-stable">
                  R$ {totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-warning" />
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
              <div className="w-10 h-10 rounded-xl bg-critical/20 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-critical" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Despesas</p>
                <p className="text-xl font-bold text-critical">
                  R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={saldo >= 0 ? 'border-stable/30' : 'border-critical/30'}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${saldo >= 0 ? 'bg-stable/20' : 'bg-critical/20'}`}>
                <DollarSign className={`w-5 h-5 ${saldo >= 0 ? 'text-stable' : 'text-critical'}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Saldo</p>
                <p className={`text-xl font-bold ${saldo >= 0 ? 'text-stable' : 'text-critical'}`}>
                  R$ {saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="budgets" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="budgets">Orçamentos</TabsTrigger>
          <TabsTrigger value="expenses">Despesas</TabsTrigger>
          <TabsTrigger value="payments">Pagamentos</TabsTrigger>
        </TabsList>

        {/* Budgets Tab */}
        <TabsContent value="budgets" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setBudgetDialogOpen(true)} className="btn-touch gap-2">
              <Plus className="w-5 h-5" />
              Novo Orçamento
            </Button>
          </div>

          <div className="space-y-3">
            {budgets.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Receipt className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhum orçamento registrado</p>
                </CardContent>
              </Card>
            ) : (
              budgets.map((budget) => (
                <Card key={budget.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-primary" />
                          <span className="font-medium">{budget.events?.nome_evento}</span>
                        </div>
                        {budget.clients && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Building2 className="w-4 h-4" />
                            {budget.clients.nome}
                          </div>
                        )}
                        {budget.data_vencimento && (
                          <p className="text-sm text-muted-foreground">
                            Vence em: {format(new Date(budget.data_vencimento), 'dd/MM/yyyy')}
                          </p>
                        )}
                      </div>
                      <div className="text-right space-y-2">
                        <p className="text-xl font-bold">
                          R$ {Number(budget.valor_contrato).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <div className="flex items-center gap-2 justify-end">
                          <Badge className={statusColors[budget.status]}>
                            {budget.status.charAt(0).toUpperCase() + budget.status.slice(1)}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-xs"
                            onClick={async () => {
                              const newStatus = budget.status === 'pago' ? 'pendente' : 'pago';
                              await supabase.from('event_budgets').update({ status: newStatus }).eq('id', budget.id);
                              fetchData();
                            }}
                          >
                            {budget.status === 'pago' ? '↩ Pendente' : '✓ Marcar Pago'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setExpenseDialogOpen(true)} className="btn-touch gap-2">
              <Plus className="w-5 h-5" />
              Nova Despesa
            </Button>
          </div>

          <div className="space-y-3">
            {expenses.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <TrendingDown className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhuma despesa registrada</p>
                </CardContent>
              </Card>
            ) : (
              expenses.map((expense) => (
                <Card key={expense.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">{expense.descricao}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {expense.events?.nome_evento}
                        </div>
                        <Badge variant="outline">
                          {categoriaLabels[expense.categoria]}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-critical">
                          - R$ {Number(expense.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(expense.data_despesa), 'dd/MM/yyyy')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setPaymentDialogOpen(true)} className="btn-touch gap-2">
              <Plus className="w-5 h-5" />
              Registrar Pagamento
            </Button>
          </div>

          <div className="space-y-3">
            {payments.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Banknote className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Nenhum pagamento registrado</p>
                </CardContent>
              </Card>
            ) : (
              payments.map((payment) => (
                <Card key={payment.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">
                          {payment.event_budgets?.events?.nome_evento}
                        </p>
                        {payment.event_budgets?.clients && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Building2 className="w-4 h-4" />
                            {payment.event_budgets.clients.nome}
                          </div>
                        )}
                        <Badge variant="outline" className="gap-1">
                          <CreditCard className="w-3 h-3" />
                          {tipoPagamentoLabels[payment.tipo_pagamento]}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-stable">
                          + R$ {Number(payment.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(payment.data_pagamento), 'dd/MM/yyyy')}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Budget Dialog */}
      <Dialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Orçamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleBudgetSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Evento *</Label>
              <Select value={budgetForm.event_id} onValueChange={(v) => setBudgetForm({ ...budgetForm, event_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o evento" />
                </SelectTrigger>
                <SelectContent>
                  {events.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.nome_evento}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={budgetForm.client_id} onValueChange={(v) => setBudgetForm({ ...budgetForm, client_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor do Contrato *</Label>
              <Input
                type="number"
                step="0.01"
                value={budgetForm.valor_contrato}
                onChange={(e) => setBudgetForm({ ...budgetForm, valor_contrato: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Data de Vencimento</Label>
              <Input
                type="date"
                value={budgetForm.data_vencimento}
                onChange={(e) => setBudgetForm({ ...budgetForm, data_vencimento: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={budgetForm.descricao}
                onChange={(e) => setBudgetForm({ ...budgetForm, descricao: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Forma de Cobrança</Label>
              <Select value={budgetForm.forma_cobranca} onValueChange={(v) => setBudgetForm({ ...budgetForm, forma_cobranca: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="emissao_nf">Emissão NF</SelectItem>
                  <SelectItem value="empenho">Empenho</SelectItem>
                  <SelectItem value="nao_cobrar">Não Cobrar</SelectItem>
                  <SelectItem value="patrocinio">Patrocínio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full btn-touch">Criar Orçamento</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Expense Dialog */}
      <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Despesa</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleExpenseSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Evento *</Label>
              <Select value={expenseForm.event_id} onValueChange={(v) => setExpenseForm({ ...expenseForm, event_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o evento" />
                </SelectTrigger>
                <SelectContent>
                  {events.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.nome_evento}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select value={expenseForm.categoria} onValueChange={(v) => setExpenseForm({ ...expenseForm, categoria: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categoriaLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input
                value={expenseForm.descricao}
                onChange={(e) => setExpenseForm({ ...expenseForm, descricao: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={expenseForm.valor}
                  onChange={(e) => setExpenseForm({ ...expenseForm, valor: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input
                  type="date"
                  value={expenseForm.data_despesa}
                  onChange={(e) => setExpenseForm({ ...expenseForm, data_despesa: e.target.value })}
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full btn-touch">Registrar Despesa</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Orçamento *</Label>
              <Select value={paymentForm.budget_id} onValueChange={(v) => setPaymentForm({ ...paymentForm, budget_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o orçamento" />
                </SelectTrigger>
                <SelectContent>
                  {budgets
                    .filter((b) => b.status === 'pendente')
                    .map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.events?.nome_evento} - R$ {Number(b.valor_contrato).toLocaleString('pt-BR')}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor Pago *</Label>
              <Input
                type="number"
                step="0.01"
                value={paymentForm.valor}
                onChange={(e) => setPaymentForm({ ...paymentForm, valor: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Forma de Pagamento *</Label>
              <Select value={paymentForm.tipo_pagamento} onValueChange={(v) => setPaymentForm({ ...paymentForm, tipo_pagamento: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(tipoPagamentoLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data do Pagamento *</Label>
              <Input
                type="date"
                value={paymentForm.data_pagamento}
                onChange={(e) => setPaymentForm({ ...paymentForm, data_pagamento: e.target.value })}
                required
              />
            </div>
            <Button type="submit" className="w-full btn-touch">Registrar Pagamento</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
