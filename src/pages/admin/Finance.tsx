import { useState, useEffect, useCallback, useRef } from 'react';
import { localDatetimeToISO, isoToLocalDatetime } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
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
  MapPin,
  Pencil,
  Loader2,
  Route,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CepInput } from '@/components/CepInput';
import { calculateDistanceBetweenAddresses } from '@/lib/geo';

interface Base {
  id: string;
  nome: string;
  sigla: string;
  endereco: string | null;
}

interface Client {
  id: string;
  nome: string;
}

interface Budget {
  id: string;
  event_id: string | null;
  client_id: string | null;
  valor_contrato: number;
  valor_hora: number | null;
  quantidade_horas: number | null;
  descricao: string | null;
  nome_evento: string | null;
  tipo_unidade: string | null;
  status: string;
  data_vencimento: string | null;
  forma_cobranca: string | null;
  endereco_evento: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  base_id: string | null;
  km_estimado: number | null;
  valor_km: number | null;
  events?: { nome_evento: string } | null;
  clients?: { nome: string } | null;
  bases?: { sigla: string; nome: string; endereco: string | null } | null;
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
  event_budgets?: { events?: { nome_evento: string } | null; clients?: { nome: string } | null };
}

interface Event {
  id: string;
  nome_evento: string;
  data_inicio: string;
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

const formaCobrancaLabels: Record<string, string> = {
  boleto: 'Boleto',
  pix: 'PIX',
  emissao_nf: 'Emissão NF',
  empenho: 'Empenho',
  nao_cobrar: 'Não Cobrar',
  patrocinio: 'Patrocínio',
};

const tipoUnidadeLabels: Record<string, string> = {
  USB: 'USB - Unidade Básica',
  USA: 'USA - Unidade Avançada',
  semi_presencial: 'Semi Presencial',
  presencial: 'Presencial',
  usb_dois_tecnicos: 'USB dois Técnicos',
  usa_dois_enfermeiros: 'USA dois Enfermeiros',
  ambulatorio: 'Ambulatório',
  usb_somente_condutor: 'USB somente condutor',
};

const emptyBudgetForm = {
  nome_evento: '',
  client_id: '',
  valor_hora: '',
  quantidade_horas: '',
  descricao: '',
  data_vencimento: '',
  forma_cobranca: '',
  endereco_evento: '',
  cep: '',
  data_inicio: '',
  data_fim: '',
  base_id: '',
  km_estimado: '',
  valor_km: '',
  tipo_unidade: '',
};

export default function Finance() {
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [bases, setBases] = useState<Base[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [kmRate, setKmRate] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [calculatingKm, setCalculatingKm] = useState(false);
  const [creatingEvent, setCreatingEvent] = useState<string | null>(null);

  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  const [budgetForm, setBudgetForm] = useState({ ...emptyBudgetForm });
  const baseIdRef = useRef(budgetForm.base_id);

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
    const [eventsRes, clientsRes, basesRes, budgetsRes, expensesRes, paymentsRes, ratesRes] = await Promise.all([
      supabase.from('events').select('id, nome_evento, data_inicio').order('data_inicio', { ascending: false }),
      supabase.from('clients').select('id, nome').order('nome'),
      supabase.from('bases').select('id, nome, sigla, endereco').order('sigla'),
      supabase.from('event_budgets').select('*, events(nome_evento), clients(nome), bases(sigla, nome, endereco)').order('created_at', { ascending: false }),
      supabase.from('event_expenses').select('*, events(nome_evento)').order('data_despesa', { ascending: false }),
      supabase.from('client_payments').select('*, event_budgets(events(nome_evento), clients(nome))').order('data_pagamento', { ascending: false }),
      supabase.from('operational_rates').select('valor').eq('tipo', 'km').single(),
    ]);

    setEvents(eventsRes.data || []);
    setClients(clientsRes.data || []);
    setBases(basesRes.data || []);
    setBudgets((budgetsRes.data as Budget[]) || []);
    setExpenses(expensesRes.data || []);
    setPayments(paymentsRes.data || []);
    if (ratesRes.data) setKmRate(ratesRes.data.valor);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalReceitas = budgets
    .filter((b) => b.status === 'pago')
    .reduce((sum, b) => sum + Number(b.valor_contrato), 0);

  const totalPendente = budgets
    .filter((b) => b.status === 'pendente')
    .reduce((sum, b) => sum + Number(b.valor_contrato), 0);

  const totalDespesas = expenses.reduce((sum, e) => sum + Number(e.valor), 0);
  const saldo = totalReceitas - totalDespesas;

  // Check if forma_cobranca is 'empenho' (fields become optional)
  const isEmpenho = budgetForm.forma_cobranca === 'empenho';

  // Calculate valor_total from valor_hora * quantidade_horas
  const valorHoraNum = parseFloat(budgetForm.valor_hora) || 0;
  const qtdHorasNum = parseFloat(budgetForm.quantidade_horas) || 0;

  // Auto-calculate data_fim from data_inicio + quantidade_horas
  const autoCalcDataFim = useCallback((dataInicio: string, horas: string) => {
    const h = parseFloat(horas);
    if (!dataInicio || !h || h <= 0) return;
    const start = new Date(dataInicio);
    if (isNaN(start.getTime())) return;
    const end = new Date(start.getTime() + h * 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    const endStr = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`;
    setBudgetForm((prev) => ({ ...prev, data_fim: endStr }));
  }, []);
  const valorTotal = valorHoraNum * qtdHorasNum;

  // Auto-calculate KM when base and event address change
  const calculateKm = useCallback(async (baseId: string, enderecoEvento: string) => {
    if (!baseId || !enderecoEvento || enderecoEvento.length < 5) return;

    const base = bases.find((b) => b.id === baseId);
    if (!base?.endereco) {
      toast({ title: 'Base sem endereço cadastrado', description: 'Cadastre o endereço da base primeiro (use o CEP na página de Bases).', variant: 'destructive' });
      return;
    }

    setCalculatingKm(true);
    try {
      const distancia = await calculateDistanceBetweenAddresses(base.endereco, enderecoEvento);

      if (distancia !== null) {
        const kmIdaVolta = Math.round(distancia * 2 * 10) / 10;
        setBudgetForm((prev) => ({
          ...prev,
          km_estimado: kmIdaVolta.toString(),
        }));
        toast({ title: `KM calculado: ${kmIdaVolta} km (ida e volta)` });
      } else {
        toast({ title: 'Não foi possível calcular a distância', description: 'Verifique os endereços e tente novamente.', variant: 'destructive' });
      }
    } finally {
      setCalculatingKm(false);
    }
  }, [bases, toast]);

  const handleBudgetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const kmEstimado = parseFloat(budgetForm.km_estimado) || 0;
    const valorKm = parseFloat(budgetForm.valor_km) || kmRate;

    const budgetData = {
      event_id: null,
      client_id: budgetForm.client_id || null,
      valor_contrato: valorTotal || 0,
      valor_hora: valorHoraNum || 0,
      quantidade_horas: qtdHorasNum || 0,
      descricao: budgetForm.descricao || null,
      nome_evento: budgetForm.nome_evento || null,
      tipo_unidade: budgetForm.tipo_unidade || null,
      data_vencimento: budgetForm.data_vencimento || null,
      forma_cobranca: budgetForm.forma_cobranca || null,
      endereco_evento: budgetForm.endereco_evento || null,
      data_inicio: budgetForm.data_inicio ? localDatetimeToISO(budgetForm.data_inicio) : null,
      data_fim: budgetForm.data_fim ? localDatetimeToISO(budgetForm.data_fim) : null,
      base_id: budgetForm.base_id || null,
      km_estimado: kmEstimado,
      valor_km: valorKm,
    } as any;

    let error;

    if (editingBudgetId) {
      const result = await supabase.from('event_budgets').update(budgetData).eq('id', editingBudgetId);
      error = result.error;
    } else {
      const result = await supabase.from('event_budgets').insert(budgetData);
      error = result.error;
    }

    if (error) {
      toast({ title: editingBudgetId ? 'Erro ao atualizar orçamento' : 'Erro ao criar orçamento', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: editingBudgetId ? 'Orçamento atualizado!' : 'Orçamento criado!' });
      closeBudgetDialog();
      fetchData();
    }
  };

  const openEditBudget = (budget: Budget) => {
    setBudgetForm({
      nome_evento: budget.nome_evento || '',
      client_id: budget.client_id || '',
      valor_hora: budget.valor_hora?.toString() || '',
      quantidade_horas: budget.quantidade_horas?.toString() || '',
      descricao: budget.descricao || '',
      data_vencimento: budget.data_vencimento || '',
      forma_cobranca: budget.forma_cobranca || '',
      endereco_evento: budget.endereco_evento || '',
      cep: '',
      data_inicio: budget.data_inicio ? isoToLocalDatetime(budget.data_inicio) : '',
      data_fim: budget.data_fim ? isoToLocalDatetime(budget.data_fim) : '',
      base_id: budget.base_id || '',
      km_estimado: budget.km_estimado?.toString() || '',
      valor_km: budget.valor_km?.toString() || '',
      tipo_unidade: budget.tipo_unidade || '',
    });
    baseIdRef.current = budget.base_id || '';
    setEditingBudgetId(budget.id);
    setBudgetDialogOpen(true);
  };

  const closeBudgetDialog = () => {
    setBudgetDialogOpen(false);
    setEditingBudgetId(null);
    setBudgetForm({ ...emptyBudgetForm });
  };

  const handleCreateEventFromBudget = async (budget: Budget) => {
    if (!budget.data_inicio || !budget.data_fim) {
      toast({ title: 'Preencha as datas de início e fim no orçamento', variant: 'destructive' });
      return;
    }

    setCreatingEvent(budget.id);

    // Convert datetime-local values to proper ISO with timezone
    const dataInicioISO = budget.data_inicio!.includes('T') && !budget.data_inicio!.endsWith('Z')
      ? new Date(budget.data_inicio!).toISOString()
      : budget.data_inicio!;
    const dataFimISO = budget.data_fim!.includes('T') && !budget.data_fim!.endsWith('Z')
      ? new Date(budget.data_fim!).toISOString()
      : budget.data_fim!;

    const { data: newEvent, error: eventError } = await supabase.from('events').insert({
      nome_evento: budget.nome_evento || budget.descricao || 'Evento sem nome',
      local: budget.endereco_evento || 'A definir',
      data_inicio: dataInicioISO,
      data_fim: dataFimISO,
      base_id: budget.base_id || null,
    }).select('id').single();

    if (eventError || !newEvent) {
      toast({ title: 'Erro ao criar evento', variant: 'destructive' });
      setCreatingEvent(null);
      return;
    }

    // Link budget to event
    await supabase.from('event_budgets').update({ event_id: newEvent.id }).eq('id', budget.id);

    toast({ title: 'Evento criado e vinculado ao orçamento!' });
    setCreatingEvent(null);
    fetchData();
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('event_expenses').insert({
      event_id: expenseForm.event_id,
      categoria: expenseForm.categoria as any,
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
      tipo_pagamento: paymentForm.tipo_pagamento as any,
      data_pagamento: paymentForm.data_pagamento,
      observacao: paymentForm.observacao || null,
    });

    if (error) {
      toast({ title: 'Erro ao registrar pagamento', description: error.message, variant: 'destructive' });
    } else {
      await supabase.from('event_budgets').update({ status: 'pago' }).eq('id', paymentForm.budget_id);
      toast({ title: 'Pagamento registrado!' });
      setPaymentDialogOpen(false);
      setPaymentForm({ budget_id: '', valor: '', tipo_pagamento: '', data_pagamento: format(new Date(), 'yyyy-MM-dd'), observacao: '' });
      fetchData();
    }
  };

  const handleBaseChange = (baseId: string) => {
    baseIdRef.current = baseId;
    setBudgetForm((prev) => {
      const updated = { ...prev, base_id: baseId, valor_km: kmRate.toString() };
      if (updated.endereco_evento) {
        calculateKm(baseId, updated.endereco_evento);
      }
      return updated;
    });
  };

  const handleEnderecoEventoFound = (endereco: string, baseId: string) => {
    setBudgetForm((prev) => ({ ...prev, endereco_evento: endereco }));
    if (baseId) {
      calculateKm(baseId, endereco);
    }
  };

  const handleRecalculateKm = () => {
    if (budgetForm.base_id && budgetForm.endereco_evento) {
      calculateKm(budgetForm.base_id, budgetForm.endereco_evento);
    }
  };

  const kmIdaVolta = parseFloat(budgetForm.km_estimado) || 0;
  const valorKmAtual = parseFloat(budgetForm.valor_km) || kmRate;
  const custoDeslocamento = kmIdaVolta * valorKmAtual;

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
            <Button onClick={() => { setBudgetForm({ ...emptyBudgetForm }); setEditingBudgetId(null); setBudgetDialogOpen(true); }} className="btn-touch gap-2">
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
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0 flex-1">
                        {budget.nome_evento && (
                          <p className="font-semibold text-foreground">{budget.nome_evento}</p>
                        )}
                        {budget.descricao && (
                          <p className="text-sm text-muted-foreground">{budget.descricao}</p>
                        )}
                        {budget.tipo_unidade && (
                          <Badge variant="outline" className="text-xs">
                            {tipoUnidadeLabels[budget.tipo_unidade] || budget.tipo_unidade}
                          </Badge>
                        )}
                        {budget.events?.nome_evento && (
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-primary" />
                            <span>Evento: {budget.events.nome_evento}</span>
                          </div>
                        )}
                        {budget.clients && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Building2 className="w-4 h-4" />
                            {budget.clients.nome}
                          </div>
                        )}
                        {budget.bases && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            Base: {budget.bases.sigla}
                          </div>
                        )}
                        {budget.endereco_evento && (
                          <p className="text-xs text-muted-foreground">{budget.endereco_evento}</p>
                        )}
                        {budget.data_inicio && (
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(budget.data_inicio), "dd/MM/yyyy HH:mm", { locale: ptBR })} - {budget.data_fim ? format(new Date(budget.data_fim), "dd/MM/yyyy HH:mm", { locale: ptBR }) : ''}
                          </p>
                        )}
                        {budget.valor_hora && Number(budget.valor_hora) > 0 && (
                          <p className="text-xs text-muted-foreground">
                            R$ {Number(budget.valor_hora).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/h × {Number(budget.quantidade_horas || 0)} horas
                          </p>
                        )}
                        {budget.km_estimado && Number(budget.km_estimado) > 0 && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Route className="w-3 h-3" />
                            {Number(budget.km_estimado).toLocaleString('pt-BR')} km × R$ {Number(budget.valor_km || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} = R$ {(Number(budget.km_estimado) * Number(budget.valor_km || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        )}
                        {budget.forma_cobranca && (
                          <Badge variant="outline" className="text-xs">
                            {formaCobrancaLabels[budget.forma_cobranca] || budget.forma_cobranca}
                          </Badge>
                        )}
                        {budget.data_vencimento && (
                          <p className="text-xs text-muted-foreground">
                            Vence em: {format(new Date(budget.data_vencimento), 'dd/MM/yyyy')}
                          </p>
                        )}
                      </div>
                      <div className="text-right space-y-2 shrink-0">
                        <p className="text-xl font-bold">
                          R$ {Number(budget.valor_contrato).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <div className="flex items-center gap-1.5 justify-end flex-wrap">
                          <Badge className={statusColors[budget.status]}>
                            {budget.status.charAt(0).toUpperCase() + budget.status.slice(1)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 justify-end flex-wrap">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 text-xs"
                            onClick={() => openEditBudget(budget)}
                          >
                            <Pencil className="w-3 h-3" />
                            Editar
                          </Button>
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
                            {budget.status === 'pago' ? '↩ Pendente' : '✓ Pago'}
                          </Button>
                        </div>
                        {!budget.event_id && (
                          <Button
                            variant="default"
                            size="sm"
                            className="gap-1 text-xs w-full"
                            disabled={creatingEvent === budget.id}
                            onClick={() => handleCreateEventFromBudget(budget)}
                          >
                            {creatingEvent === budget.id ? (
                              <><Loader2 className="w-3 h-3 animate-spin" /> Criando...</>
                            ) : (
                              <><Calendar className="w-3 h-3" /> Criar Evento</>
                            )}
                          </Button>
                        )}
                        {budget.event_id && (
                          <Badge variant="outline" className="text-xs bg-stable/10 text-stable">
                            Evento vinculado
                          </Badge>
                        )}
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
                        <Badge variant="outline">{categoriaLabels[expense.categoria]}</Badge>
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
                          {payment.event_budgets?.events?.nome_evento || 'Orçamento'}
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
      <Dialog open={budgetDialogOpen} onOpenChange={(open) => { if (!open) closeBudgetDialog(); else setBudgetDialogOpen(true); }}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBudgetId ? 'Editar Orçamento' : 'Novo Orçamento'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleBudgetSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Evento *</Label>
              <Input
                value={budgetForm.nome_evento}
                onChange={(e) => setBudgetForm({ ...budgetForm, nome_evento: e.target.value })}
                placeholder="Ex: Cobertura Maratona 2026"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={budgetForm.client_id} onValueChange={(v) => setBudgetForm({ ...budgetForm, client_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo de Unidade</Label>
                <Select value={budgetForm.tipo_unidade} onValueChange={(v) => setBudgetForm({ ...budgetForm, tipo_unidade: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(tipoUnidadeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Forma de Cobrança</Label>
              <Select value={budgetForm.forma_cobranca} onValueChange={(v) => setBudgetForm({ ...budgetForm, forma_cobranca: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(formaCobrancaLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Valor por Hora {!isEmpenho ? '*' : ''}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={budgetForm.valor_hora}
                  onChange={(e) => setBudgetForm({ ...budgetForm, valor_hora: e.target.value })}
                  placeholder="0,00"
                  required={!isEmpenho}
                />
              </div>
              <div className="space-y-2">
                <Label>Qtd. Horas {!isEmpenho ? '*' : ''}</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={budgetForm.quantidade_horas}
                  onChange={(e) => setBudgetForm({ ...budgetForm, quantidade_horas: e.target.value })}
                  placeholder="0"
                  required={!isEmpenho}
                />
              </div>
              <div className="space-y-2">
                <Label>Valor Total</Label>
                <Input
                  type="number"
                  value={valorTotal > 0 ? valorTotal.toFixed(2) : ''}
                  readOnly
                  className="bg-muted"
                  placeholder="Calculado"
                />
              </div>
            </div>
            {isEmpenho && (
              <p className="text-xs text-muted-foreground">
                Forma de cobrança "Empenho": Valor por Hora e Qtd. Horas são opcionais.
              </p>
            )}

            <div className="space-y-2">
              <Label>Base</Label>
              <Select value={budgetForm.base_id} onValueChange={handleBaseChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a base" />
                </SelectTrigger>
                <SelectContent>
                  {bases.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.sigla} - {b.nome}
                      {b.endereco ? '' : ' (sem endereço)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {budgetForm.base_id && (() => {
                const selectedBase = bases.find(b => b.id === budgetForm.base_id);
                return selectedBase?.endereco ? (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {selectedBase.endereco}
                  </p>
                ) : (
                  <p className="text-xs text-destructive">
                    ⚠ Base sem endereço. Cadastre na página de Bases para calcular KM.
                  </p>
                );
              })()}
            </div>

            <div className="space-y-2">
              <Label>CEP do Evento</Label>
              <CepInput
                value={budgetForm.cep}
                onChange={(cep) => setBudgetForm((prev) => ({ ...prev, cep }))}
                onAddressFound={(addr) => {
                  const endereco = addr.endereco;
                  handleEnderecoEventoFound(endereco, baseIdRef.current);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Endereço do Evento</Label>
              <Input
                value={budgetForm.endereco_evento}
                onChange={(e) => setBudgetForm((prev) => ({ ...prev, endereco_evento: e.target.value }))}
                placeholder="Endereço completo"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Início</Label>
                <Input
                  type="datetime-local"
                  value={budgetForm.data_inicio}
                  onChange={(e) => setBudgetForm({ ...budgetForm, data_inicio: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Fim</Label>
                <Input
                  type="datetime-local"
                  value={budgetForm.data_fim}
                  onChange={(e) => setBudgetForm({ ...budgetForm, data_fim: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  KM Ida e Volta
                  {calculatingKm && <Loader2 className="w-3 h-3 animate-spin" />}
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.1"
                    value={budgetForm.km_estimado}
                    onChange={(e) => setBudgetForm({ ...budgetForm, km_estimado: e.target.value })}
                    placeholder="Auto-calculado"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleRecalculateKm}
                    disabled={calculatingKm || !budgetForm.base_id || !budgetForm.endereco_evento}
                    title="Recalcular KM"
                  >
                    <Route className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Valor por KM (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={budgetForm.valor_km}
                  onChange={(e) => setBudgetForm({ ...budgetForm, valor_km: e.target.value })}
                  placeholder={kmRate > 0 ? `Padrão: ${kmRate}` : '0,00'}
                />
              </div>
            </div>

            {kmIdaVolta > 0 && (
              <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                <p className="flex items-center gap-2">
                  <Route className="w-4 h-4 text-primary" />
                  <span className="font-medium">KM Total (ida e volta): {kmIdaVolta.toLocaleString('pt-BR')} km</span>
                </p>
                <p className="text-primary font-bold">
                  Custo de deslocamento: R$ {custoDeslocamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            )}

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

            <Button type="submit" className="w-full btn-touch">
              {editingBudgetId ? 'Salvar Alterações' : 'Criar Orçamento'}
            </Button>
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
              <Select value={paymentForm.budget_id} onValueChange={(v) => {
                const budget = budgets.find(b => b.id === v);
                setPaymentForm({ 
                  ...paymentForm, 
                  budget_id: v,
                  valor: budget ? Number(budget.valor_contrato).toString() : paymentForm.valor,
                });
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o orçamento" />
                </SelectTrigger>
                <SelectContent>
                  {budgets
                    .filter((b) => b.status === 'pendente')
                    .map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.nome_evento || b.descricao || b.events?.nome_evento || 'Orçamento'} - R$ {Number(b.valor_contrato).toLocaleString('pt-BR')}
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
