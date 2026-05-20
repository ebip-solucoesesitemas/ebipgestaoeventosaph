import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Receipt,
  Calendar,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Base {
  id: string;
  nome: string;
  sigla: string;
}

interface Budget {
  id: string;
  event_id: string | null;
  client_id: string | null;
  valor_contrato: number;
  descricao: string | null;
  nome_evento: string | null;
  status: string;
  data_vencimento: string | null;
  forma_cobranca: string | null;
  created_at: string | null;
  clients?: { nome: string } | null;
  events?: { nome_evento: string } | null;
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

const statusColors: Record<string, string> = {
  pendente: 'bg-warning/20 text-warning border-warning/30',
  pago: 'bg-stable/20 text-stable border-stable/30',
  cancelado: 'bg-muted text-muted-foreground',
  atrasado: 'bg-critical/20 text-critical border-critical/30',
};

const formaCobrancaLabels: Record<string, string> = {
  boleto: 'Boleto',
  pix: 'PIX',
  emissao_nf: 'Emissão NF',
  empenho: 'Empenho',
  nao_cobrar: 'Não Cobrar',
  patrocinio: 'Patrocínio',
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

export default function BaseFinance() {
  const { baseId } = useParams<{ baseId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [base, setBase] = useState<Base | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!baseId) return;

    const fetchData = async () => {
      setIsLoading(true);

      const [baseRes, budgetsRes, eventsRes] = await Promise.all([
        supabase.from('bases').select('id, nome, sigla').eq('id', baseId).single(),
        supabase.from('event_budgets').select('*, clients(nome), events(nome_evento)').eq('base_id', baseId).order('created_at', { ascending: false }),
        supabase.from('events').select('id').eq('base_id', baseId),
      ]);

      if (baseRes.data) setBase(baseRes.data);
      if (budgetsRes.data) setBudgets(budgetsRes.data as Budget[]);

      // Fetch expenses for events in this base
      if (eventsRes.data && eventsRes.data.length > 0) {
        const eventIds = eventsRes.data.map(e => e.id);
        const { data: expensesData } = await supabase
          .from('event_expenses')
          .select('*, events(nome_evento)')
          .in('event_id', eventIds)
          .order('data_despesa', { ascending: false });
        setExpenses(expensesData || []);
      }

      setIsLoading(false);
    };

    fetchData();
  }, [baseId]);

  const totalReceitas = budgets
    .filter(b => b.status === 'pago')
    .reduce((sum, b) => sum + Number(b.valor_contrato), 0);

  const totalPendente = budgets
    .filter(b => b.status === 'pendente')
    .reduce((sum, b) => sum + Number(b.valor_contrato), 0);

  const totalDespesas = expenses.reduce((sum, e) => sum + Number(e.valor), 0);
  const saldo = totalReceitas - totalDespesas;

  const handleMarkAsPaid = async (budgetId: string) => {
    const { error } = await supabase
      .from('event_budgets')
      .update({ status: 'pago' })
      .eq('id', budgetId);
    if (error) {
      toast({ title: 'Erro ao marcar como pago', description: error.message, variant: 'destructive' });
      return;
    }
    setBudgets((prev) => prev.map((b) => (b.id === budgetId ? { ...b, status: 'pago' } : b)));
    toast({ title: 'Marcado como pago', description: 'O valor entrou em Receitas.' });
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
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Financeiro — {base?.sigla} {base?.nome}
          </h1>
          <p className="text-muted-foreground">Resumo financeiro desta base</p>
        </div>
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

      {/* Budgets */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Orçamentos</h2>
        <div className="space-y-3">
          {budgets.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Receipt className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Nenhum orçamento nesta base</p>
              </CardContent>
            </Card>
          ) : (
            budgets.map((budget) => (
              <Card key={budget.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{budget.nome_evento || budget.descricao || 'Sem nome'}</p>
                      {budget.clients && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5" />
                          {budget.clients.nome}
                        </p>
                      )}
                      {budget.data_vencimento && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          Venc: {format(new Date(budget.data_vencimento + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      )}
                      {budget.forma_cobranca && (
                        <Badge variant="outline" className="text-xs mt-1">
                          {formaCobrancaLabels[budget.forma_cobranca] || budget.forma_cobranca}
                        </Badge>
                      )}
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end gap-2">
                      <p className="text-lg font-bold">
                        R$ {Number(budget.valor_contrato).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <Badge className={statusColors[budget.status] || ''}>
                        {budget.status}
                      </Badge>
                      {budget.status === 'pendente' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 text-stable border-stable/30 hover:bg-stable/10"
                          onClick={() => handleMarkAsPaid(budget.id)}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Marcar pago
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Expenses */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Despesas</h2>
        <div className="space-y-3">
          {expenses.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <TrendingDown className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Nenhuma despesa registrada</p>
              </CardContent>
            </Card>
          ) : (
            expenses.map((expense) => (
              <Card key={expense.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{expense.descricao}</p>
                      <p className="text-sm text-muted-foreground">
                        {expense.events?.nome_evento} · {categoriaLabels[expense.categoria] || expense.categoria}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {format(new Date(expense.data_despesa + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                    </div>
                    <p className="text-lg font-bold text-critical shrink-0">
                      - R$ {Number(expense.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
