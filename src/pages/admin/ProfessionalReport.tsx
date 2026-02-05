import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, DollarSign, Calendar, Check, Wallet } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReportData {
  profile_id: string;
  profile_name: string;
  especialidade: string;
  total_events: number;
  valor_unitario: number;
  total_pendente: number;
  total_pago: number;
}

const months = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function ProfessionalReport() {
  const { toast } = useToast();
  const [reports, setReports] = useState<ReportData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const fetchReport = async () => {
    setIsLoading(true);
    
    const monthStart = startOfMonth(new Date(parseInt(selectedYear), parseInt(selectedMonth)));
    const monthEnd = endOfMonth(monthStart);

    // Fetch profiles with their rates
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, nome, especialidade')
      .order('nome');

    const { data: rates } = await supabase
      .from('professional_rates')
      .select('profile_id, valor_evento');

    // Fetch completed event assignments (with checkout) for the month
    const { data: assignments } = await supabase
      .from('event_assignments')
      .select('profile_id, checkout_at')
      .not('checkout_at', 'is', null)
      .gte('checkout_at', monthStart.toISOString())
      .lte('checkout_at', monthEnd.toISOString());

    // Fetch payments for the month
    const { data: payments } = await supabase
      .from('professional_payments')
      .select('profile_id, valor, status')
      .gte('created_at', monthStart.toISOString())
      .lte('created_at', monthEnd.toISOString());

    const ratesMap = new Map(rates?.map(r => [r.profile_id, r.valor_evento || 0]));
    
    const reportData: ReportData[] = profiles?.map(profile => {
      const eventCount = assignments?.filter(a => a.profile_id === profile.id).length || 0;
      const valorUnitario = ratesMap.get(profile.id) || 0;
      const profilePayments = payments?.filter(p => p.profile_id === profile.id) || [];
      
      return {
        profile_id: profile.id,
        profile_name: profile.nome,
        especialidade: profile.especialidade,
        total_events: eventCount,
        valor_unitario: valorUnitario,
        total_pendente: profilePayments.filter(p => p.status === 'pendente').reduce((sum, p) => sum + Number(p.valor), 0),
        total_pago: profilePayments.filter(p => p.status === 'pago').reduce((sum, p) => sum + Number(p.valor), 0),
      };
    }) || [];

    setReports(reportData);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchReport();
  }, [selectedMonth, selectedYear]);

  const generatePayment = async (report: ReportData) => {
    if (report.total_events === 0) {
      toast({ title: 'Nenhum evento para gerar pagamento', variant: 'destructive' });
      return;
    }

    const valorTotal = report.total_events * report.valor_unitario;
    if (valorTotal <= 0) {
      toast({ title: 'Configure o valor por evento deste profissional', variant: 'destructive' });
      return;
    }

    setGenerating(report.profile_id);

    const { error } = await supabase.from('professional_payments').insert({
      profile_id: report.profile_id,
      valor: valorTotal,
      tipo_pagamento: 'pix',
      status: 'pendente',
      descricao: `Pagamento ref. ${months[parseInt(selectedMonth)]}/${selectedYear} - ${report.total_events} eventos`,
    });

    if (error) {
      toast({ title: 'Erro ao gerar pagamento', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Pagamento gerado com sucesso!' });
      fetchReport();
    }
    setGenerating(null);
  };

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

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
          <h1 className="text-2xl font-bold text-foreground">Relatório por Profissional</h1>
          <p className="text-muted-foreground">Resumo de eventos e pagamentos</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((month, idx) => (
                <SelectItem key={idx} value={idx.toString()}>{month}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(year => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4">
        {reports.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum profissional encontrado</p>
            </CardContent>
          </Card>
        ) : (
          reports.map((report) => {
            const totalCalculado = report.total_events * report.valor_unitario;
            return (
              <Card key={report.profile_id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{report.profile_name}</CardTitle>
                      <Badge variant="outline" className="mt-1">{report.especialidade}</Badge>
                    </div>
                    <Button
                      onClick={() => generatePayment(report)}
                      disabled={generating === report.profile_id || report.total_events === 0}
                      className="gap-2"
                    >
                      <Wallet className="w-4 h-4" />
                      {generating === report.profile_id ? 'Gerando...' : 'Gerar Pagamento'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="flex items-center justify-center gap-1 text-muted-foreground text-sm mb-1">
                        <Calendar className="w-4 h-4" />
                        Eventos
                      </div>
                      <p className="text-2xl font-bold">{report.total_events}</p>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="flex items-center justify-center gap-1 text-muted-foreground text-sm mb-1">
                        <DollarSign className="w-4 h-4" />
                        Valor Unit.
                      </div>
                      <p className="text-xl font-bold">
                        R$ {report.valor_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-primary/10 rounded-lg">
                      <div className="text-muted-foreground text-sm mb-1">Total Calculado</div>
                      <p className="text-xl font-bold text-primary">
                        R$ {totalCalculado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-warning/10 rounded-lg">
                      <div className="text-muted-foreground text-sm mb-1">Pendente</div>
                      <p className="text-xl font-bold text-warning">
                        R$ {report.total_pendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-stable/10 rounded-lg">
                      <div className="flex items-center justify-center gap-1 text-muted-foreground text-sm mb-1">
                        <Check className="w-4 h-4" />
                        Pago
                      </div>
                      <p className="text-xl font-bold text-stable">
                        R$ {report.total_pago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
