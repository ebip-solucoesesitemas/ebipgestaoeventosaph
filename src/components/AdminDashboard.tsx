import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Truck, Users, DollarSign, Clock, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, startOfMonth, endOfMonth, subMonths, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardData {
  activeEvents: number;
  eventsThisMonth: number;
  revenueThisMonth: number;
  availableVehicles: number;
  totalVehicles: number;
  professionalsToday: number;
  pendingBudgets: number;
  upcomingEvents: Array<{
    id: string;
    nome_evento: string;
    local: string;
    data_inicio: string;
    data_fim: string;
    status: string;
  }>;
  revenueChart: Array<{ month: string; receita: number }>;
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    const now = new Date();
    const monthStart = startOfMonth(now).toISOString();
    const monthEnd = endOfMonth(now).toISOString();
    const next7Days = addDays(now, 7).toISOString();
    const todayStr = now.toISOString();

    // Parallel queries
    const [
      activeEventsRes,
      eventsThisMonthRes,
      vehiclesRes,
      revenueThisMonthRes,
      pendingBudgetsRes,
      upcomingEventsRes,
      profsTodayRes,
    ] = await Promise.all([
      supabase.from('events').select('id', { count: 'exact', head: true }).eq('status', 'em_andamento'),
      supabase.from('events').select('id', { count: 'exact', head: true }).gte('data_inicio', monthStart).lte('data_inicio', monthEnd),
      supabase.from('vehicles').select('id, status'),
      supabase.from('event_budgets').select('valor_contrato').gte('created_at', monthStart).lte('created_at', monthEnd).eq('status', 'pago'),
      supabase.from('event_budgets').select('id', { count: 'exact', head: true }).eq('status', 'pendente'),
      supabase.from('events').select('id, nome_evento, local, data_inicio, data_fim, status').gte('data_inicio', todayStr).lte('data_inicio', next7Days).order('data_inicio').limit(5),
      supabase.from('event_assignments').select('id', { count: 'exact', head: true }).gte('created_at', format(now, 'yyyy-MM-dd')),
    ]);

    // Revenue chart - last 6 months
    const chartData: Array<{ month: string; receita: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const m = subMonths(now, i);
      const mStart = startOfMonth(m).toISOString();
      const mEnd = endOfMonth(m).toISOString();
      const { data: budgets } = await supabase
        .from('event_budgets')
        .select('valor_contrato')
        .gte('created_at', mStart)
        .lte('created_at', mEnd)
        .eq('status', 'pago');

      const total = budgets?.reduce((sum, b) => sum + (b.valor_contrato || 0), 0) || 0;
      chartData.push({
        month: format(m, 'MMM', { locale: ptBR }),
        receita: total,
      });
    }

    const vehicles = vehiclesRes.data || [];
    const availableVehicles = vehicles.filter(v => v.status === 'disponivel').length;
    const revenueTotal = revenueThisMonthRes.data?.reduce((sum, b) => sum + (b.valor_contrato || 0), 0) || 0;

    setData({
      activeEvents: activeEventsRes.count || 0,
      eventsThisMonth: eventsThisMonthRes.count || 0,
      revenueThisMonth: revenueTotal,
      availableVehicles,
      totalVehicles: vehicles.length,
      professionalsToday: profsTodayRes.count || 0,
      pendingBudgets: pendingBudgetsRes.count || 0,
      upcomingEvents: upcomingEventsRes.data || [],
      revenueChart: chartData,
    });
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!data) return null;

  const kpiCards = [
    {
      title: 'Eventos Ativos',
      value: data.activeEvents,
      icon: Calendar,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Eventos este Mês',
      value: data.eventsThisMonth,
      icon: Clock,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      title: 'Receita do Mês',
      value: data.revenueThisMonth.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      icon: DollarSign,
      color: 'text-stable',
      bgColor: 'bg-stable/10',
    },
    {
      title: 'Viaturas Disponíveis',
      value: `${data.availableVehicles}/${data.totalVehicles}`,
      icon: Truck,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.title}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${kpi.bgColor} flex items-center justify-center shrink-0`}>
                  <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{kpi.title}</p>
                  <p className="text-lg font-bold text-foreground">{kpi.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-stable" />
              Receita — Últimos 6 Meses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.revenueChart}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: number) => [value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 'Receita']}
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Bar dataKey="receita" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pending Budgets + Stats */}
        <div className="space-y-4">
          {data.pendingBudgets > 0 && (
            <Card className="border-warning/30 bg-warning/5">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-warning shrink-0" />
                <div>
                  <p className="text-sm font-medium">Orçamentos Pendentes</p>
                  <p className="text-2xl font-bold text-warning">{data.pendingBudgets}</p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Próximos Eventos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.upcomingEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum evento nos próximos 7 dias</p>
              ) : (
                data.upcomingEvents.map((event) => (
                  <Link
                    key={event.id}
                    to={`/admin/events/${event.id}`}
                    className="block p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <p className="text-sm font-medium truncate">{event.nome_evento}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(event.data_inicio), 'dd/MM HH:mm')}
                      </span>
                      <Badge variant="outline" className="text-[10px] h-4">
                        {event.status}
                      </Badge>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
