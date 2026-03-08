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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, DollarSign, Calendar, Check, Wallet, Clock, Download, AlertTriangle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { generatePDF } from '@/lib/pdf';

interface ReportData {
  profile_id: string;
  profile_name: string;
  especialidade: string;
  total_events: number;
  total_horas: number;
  valor_hora: number;
  total_calculado: number;
  total_pendente: number;
  total_pago: number;
  saldo_a_pagar: number;
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
  const [confirmReport, setConfirmReport] = useState<ReportData | null>(null);

  const fetchReport = async () => {
    setIsLoading(true);
    
    const monthStart = startOfMonth(new Date(parseInt(selectedYear), parseInt(selectedMonth)));
    const monthEnd = endOfMonth(monthStart);

    const [profilesRes, ratesRes, assignmentsRes, paymentsRes] = await Promise.all([
      supabase.from('profiles').select('id, nome, especialidade').eq('hidden', false).eq('is_account_only', false).order('nome'),
      supabase.from('professional_rates').select('profile_id, valor_hora'),
      supabase.from('event_assignments')
        .select('profile_id, checkin_at, checkout_at')
        .not('checkout_at', 'is', null)
        .not('checkin_at', 'is', null)
        .gte('checkout_at', monthStart.toISOString())
        .lte('checkout_at', monthEnd.toISOString()),
      supabase.from('professional_payments')
        .select('profile_id, valor, status')
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString()),
    ]);

    const profiles = profilesRes.data || [];
    const rates = ratesRes.data || [];
    const assignments = assignmentsRes.data || [];
    const payments = paymentsRes.data || [];

    const ratesMap = new Map(rates.map(r => [r.profile_id, r.valor_hora || 0]));
    
    const reportData: ReportData[] = profiles.map(profile => {
      const profileAssignments = assignments.filter(a => a.profile_id === profile.id);
      const eventCount = profileAssignments.length;
      
      // Calculate total hours from checkin/checkout
      const totalMinutes = profileAssignments.reduce((sum, a) => {
        if (a.checkin_at && a.checkout_at) {
          return sum + differenceInMinutes(new Date(a.checkout_at), new Date(a.checkin_at));
        }
        return sum;
      }, 0);
      const totalHoras = totalMinutes / 60;

      const valorHora = ratesMap.get(profile.id) || 0;
      const totalCalculado = totalHoras * valorHora;
      
      const profilePayments = payments.filter(p => p.profile_id === profile.id);
      const totalPendente = profilePayments.filter(p => p.status === 'pendente').reduce((sum, p) => sum + Number(p.valor), 0);
      const totalPago = profilePayments.filter(p => p.status === 'pago').reduce((sum, p) => sum + Number(p.valor), 0);
      
      return {
        profile_id: profile.id,
        profile_name: profile.nome,
        especialidade: profile.especialidade,
        total_events: eventCount,
        total_horas: totalHoras,
        valor_hora: valorHora,
        total_calculado: totalCalculado,
        total_pendente: totalPendente,
        total_pago: totalPago,
        saldo_a_pagar: Math.max(0, totalCalculado - totalPendente - totalPago),
      };
    });

    setReports(reportData);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchReport();
  }, [selectedMonth, selectedYear]);

  const handleGenerateClick = (report: ReportData) => {
    if (report.total_horas === 0) {
      toast({ title: 'Nenhuma hora registrada para gerar pagamento', variant: 'destructive' });
      return;
    }
    if (report.valor_hora <= 0) {
      toast({ title: 'Configure o valor por hora deste profissional', variant: 'destructive' });
      return;
    }
    if (report.saldo_a_pagar <= 0) {
      toast({ title: 'Não há saldo a pagar para este profissional neste período', variant: 'destructive' });
      return;
    }
    setConfirmReport(report);
  };

  const confirmGeneratePayment = async () => {
    if (!confirmReport) return;
    const report = confirmReport;
    setConfirmReport(null);
    setGenerating(report.profile_id);

    const { error } = await supabase.from('professional_payments').insert({
      profile_id: report.profile_id,
      valor: report.total_calculado,
      tipo_pagamento: 'pix',
      status: 'pendente',
      descricao: `Pagamento ref. ${months[parseInt(selectedMonth)]}/${selectedYear} - ${report.total_horas.toFixed(1)}h (${report.total_events} eventos)`,
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

  const handleExportPDF = () => {
    const columns = [
      { header: "Profissional", dataKey: "nome" },
      { header: "Especialidade", dataKey: "especialidade" },
      { header: "Eventos", dataKey: "eventos", halign: "center" as const },
      { header: "Horas", dataKey: "horas", halign: "center" as const },
      { header: "Valor/Hora", dataKey: "valor_hora", halign: "right" as const },
      { header: "Total Calculado", dataKey: "total_calc", halign: "right" as const },
      { header: "Pendente", dataKey: "pendente", halign: "right" as const },
      { header: "Pago", dataKey: "pago", halign: "right" as const },
    ];

    const rows = reports.map((r) => ({
      nome: r.profile_name,
      especialidade: r.especialidade,
      eventos: r.total_events.toString(),
      horas: `${r.total_horas.toFixed(1)}h`,
      valor_hora: `R$ ${r.valor_hora.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      total_calc: `R$ ${r.total_calculado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      pendente: `R$ ${r.total_pendente.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      pago: `R$ ${r.total_pago.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
    }));

    generatePDF({
      title: `Relatório por Profissional — ${months[parseInt(selectedMonth)]} / ${selectedYear}`,
      columns,
      rows,
    });
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Relatório por Profissional</h1>
          <p className="text-muted-foreground">Resumo de horas trabalhadas e pagamentos</p>
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
          <Button onClick={handleExportPDF} className="gap-2">
            <Download className="w-4 h-4" /> Exportar PDF
          </Button>
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
          reports.map((report) => (
            <Card key={report.profile_id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{report.profile_name}</CardTitle>
                    <Badge variant="outline" className="mt-1">{report.especialidade}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {report.total_pendente > 0 && (
                      <Badge variant="secondary" className="bg-warning/15 text-warning border-warning/30">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Pagamento pendente
                      </Badge>
                    )}
                    <Button
                      onClick={() => handleGenerateClick(report)}
                      disabled={generating === report.profile_id || report.total_horas === 0}
                      variant={report.total_pendente > 0 ? 'outline' : 'default'}
                      className="gap-2"
                    >
                      <Wallet className="w-4 h-4" />
                      {generating === report.profile_id ? 'Gerando...' : report.total_pendente > 0 ? 'Gerar Novo Pagamento' : 'Gerar Pagamento'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground text-sm mb-1">
                      <Calendar className="w-4 h-4" />
                      Eventos
                    </div>
                    <p className="text-2xl font-bold">{report.total_events}</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground text-sm mb-1">
                      <Clock className="w-4 h-4" />
                      Horas
                    </div>
                    <p className="text-2xl font-bold">{report.total_horas.toFixed(1)}h</p>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground text-sm mb-1">
                      <DollarSign className="w-4 h-4" />
                      Valor/Hora
                    </div>
                    <p className="text-xl font-bold">
                      R$ {report.valor_hora.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-primary/10 rounded-lg">
                    <div className="text-muted-foreground text-sm mb-1">Total Calculado</div>
                    <p className="text-xl font-bold text-primary">
                      R$ {report.total_calculado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
          ))
        )}
      </div>

      <AlertDialog open={!!confirmReport} onOpenChange={(open) => !open && setConfirmReport(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Geração de Pagamento</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Profissional: <strong>{confirmReport?.profile_name}</strong><br />
                  Período: <strong>{months[parseInt(selectedMonth)]}/{selectedYear}</strong><br />
                  Valor: <strong>R$ {confirmReport?.total_calculado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                </p>
                {confirmReport && confirmReport.total_pendente > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Já existe um pagamento pendente de <strong>R$ {confirmReport.total_pendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> para este profissional neste período. Deseja gerar outro?
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmGeneratePayment}>
              Confirmar Pagamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
