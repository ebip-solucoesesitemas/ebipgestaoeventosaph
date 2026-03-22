import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
"@/components/ui/select";
import { Printer, FileText, Download } from "lucide-react";
import { format, startOfMonth, endOfMonth, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { generatePDF } from "@/lib/pdf";

interface PayrollLine {
  profile_id: string;
  profile_name: string;
  especialidade: string;
  event_name: string;
  event_date: string;
  checkin_at: string;
  checkout_at: string;
  hours_worked: number;
  minutes_display: string;
  valor_hora: number;
  valor_evento: number;
  ajuda_custo: number;
  line_total: number;
}

const months = [
"Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
"Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];


export default function PayrollReport() {
  const [lines, setLines] = useState<PayrollLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedProfile, setSelectedProfile] = useState("all");
  const [profiles, setProfiles] = useState<{id: string;nome: string;}[]>([]);
  const [profileDataMap, setProfileDataMap] = useState<Map<string, any>>(new Map());
  const printRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    setIsLoading(true);

    const monthStart = startOfMonth(new Date(parseInt(selectedYear), parseInt(selectedMonth)));
    const monthEnd = endOfMonth(monthStart);

    const [assignmentsRes, profilesRes, ratesRes, eventsRes, ajudaCustoRes] = await Promise.all([
    supabase.
    from("event_assignments").
    select("profile_id, event_id, checkin_at, checkout_at").
    not("checkout_at", "is", null).
    not("checkin_at", "is", null).
    gte("checkout_at", monthStart.toISOString()).
    lte("checkout_at", monthEnd.toISOString()),
    supabase.from("profiles").select("id, nome, especialidade, cpf, chave_pix").eq("hidden", false).eq("is_account_only", false).order("nome"),
    supabase.from("professional_rates").select("profile_id, valor_hora, valor_evento"),
    supabase.from("events").select("id, nome_evento, data_inicio"),
    supabase.from("operational_rates").select("valor").eq("tipo", "ajuda_custo_6h").single()]
    );

    const ajudaCustoValor = ajudaCustoRes.data?.valor || 0;

    const assignments = assignmentsRes.data || [];
    const allProfiles = profilesRes.data || [];
    const rates = ratesRes.data || [];
    const events = eventsRes.data || [];

    setProfiles(allProfiles.map((p) => ({ id: p.id, nome: p.nome })));

    const profileMap = new Map(allProfiles.map((p) => [p.id, p]));
    setProfileDataMap(profileMap);
    const ratesMap = new Map(rates.map((r) => [r.profile_id, r]));
    const eventsMap = new Map(events.map((e) => [e.id, e]));

    // Filter out assignments referencing deleted profiles
    const validAssignments = assignments.filter((a) => profileMap.has(a.profile_id));

    const payrollLines: PayrollLine[] = validAssignments.map((a) => {
      const profile = profileMap.get(a.profile_id);
      const rate = ratesMap.get(a.profile_id);
      const event = eventsMap.get(a.event_id);

      const totalMin = differenceInMinutes(new Date(a.checkout_at!), new Date(a.checkin_at!));
      const hours = totalMin / 60;
      const displayH = Math.floor(totalMin / 60);
      const displayM = totalMin % 60;
      const minutesDisplay = displayH > 0 && displayM > 0 ?
      `${displayH}h ${displayM}min` :
      displayH > 0 ?
      `${displayH}h` :
      `${displayM}min`;

      const valorHora = rate?.valor_hora || 0;
      const valorEvento = rate?.valor_evento || 0;
      const ajudaCusto = hours > 6 ? ajudaCustoValor : 0;
      let lineTotal = 0;
      if (valorHora > 0) {
        lineTotal = Math.round(hours * valorHora * 100) / 100;
      } else if (valorEvento > 0) {
        lineTotal = valorEvento;
      }
      lineTotal += ajudaCusto;

      return {
        profile_id: a.profile_id,
        profile_name: profile?.nome || "—",
        especialidade: profile?.especialidade || "—",
        event_name: event?.nome_evento || "—",
        event_date: event?.data_inicio ?
        format(new Date(event.data_inicio), "dd/MM/yyyy", { locale: ptBR }) :
        "—",
        checkin_at: format(new Date(a.checkin_at!), "dd/MM HH:mm"),
        checkout_at: format(new Date(a.checkout_at!), "dd/MM HH:mm"),
        hours_worked: hours,
        minutes_display: minutesDisplay,
        valor_hora: valorHora,
        valor_evento: valorEvento,
        ajuda_custo: ajudaCusto,
        line_total: lineTotal
      };
    });

    // Sort by profile name then event date
    payrollLines.sort((a, b) => a.profile_name.localeCompare(b.profile_name) || a.event_date.localeCompare(b.event_date));

    setLines(payrollLines);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  const filteredLines = selectedProfile === "all" ?
  lines :
  lines.filter((l) => l.profile_id === selectedProfile);

  const grandTotal = filteredLines.reduce((s, l) => s + l.line_total, 0);

  // Group by profile for subtotals
  const profileGroups = filteredLines.reduce<Record<string, PayrollLine[]>>((acc, line) => {
    if (!acc[line.profile_id]) acc[line.profile_id] = [];
    acc[line.profile_id].push(line);
    return acc;
  }, {});

  const handleExportPDF = () => {
    const columns = [
    { header: "Evento", dataKey: "event_name" },
    { header: "Data", dataKey: "event_date" },
    { header: "Check-in", dataKey: "checkin_at" },
    { header: "Check-out", dataKey: "checkout_at" },
    { header: "Duração", dataKey: "minutes_display" },
    { header: "Valor/Hora", dataKey: "valor_hora_fmt", halign: "right" as const },
    { header: "Valor/Evento", dataKey: "valor_evento_fmt", halign: "right" as const },
    { header: "Ajuda Custo", dataKey: "ajuda_custo_fmt", halign: "right" as const },
    { header: "Total", dataKey: "line_total_fmt", halign: "right" as const }];


    const groups = Object.entries(profileGroups).map(([profileId, groupLines]) => {
      const subtotal = groupLines.reduce((s, l) => s + l.line_total, 0);
      const profileData = profileDataMap.get(profileId);
      const cpf = profileData?.cpf || '';
      const chavePix = profileData?.chave_pix || '';
      const cpfPixInfo = [cpf ? `CPF: ${cpf}` : '', chavePix ? `PIX: ${chavePix}` : ''].filter(Boolean).join(' | ');
      return {
        label: `${groupLines[0].profile_name} — ${groupLines[0].especialidade}${cpfPixInfo ? ` — ${cpfPixInfo}` : ''}`,
        rows: groupLines.map((l) => ({
          event_name: l.event_name,
          event_date: l.event_date,
          checkin_at: l.checkin_at,
          checkout_at: l.checkout_at,
          minutes_display: l.minutes_display,
          valor_hora_fmt: l.valor_hora > 0 ? `R$ ${l.valor_hora.toFixed(2)}` : "—",
          valor_evento_fmt: l.valor_evento > 0 ? `R$ ${l.valor_evento.toFixed(2)}` : "—",
          ajuda_custo_fmt: l.ajuda_custo > 0 ? `R$ ${l.ajuda_custo.toFixed(2)}` : "—",
          line_total_fmt: `R$ ${l.line_total.toFixed(2)}`
        })),
        subtotalLabel: `Subtotal — ${groupLines[0].profile_name}`,
        subtotalValue: `R$ ${subtotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
      };
    });

    generatePDF({
      title: `Folha de Pagamento — ${months[parseInt(selectedMonth)]} / ${selectedYear}`,
      columns,
      rows: [],
      groups,
      totals: [{ label: "TOTAL GERAL", value: `R$ ${grandTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` }]
    });
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Folha de Pagamento - ${months[parseInt(selectedMonth)]} ${selectedYear}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', system-ui, sans-serif; padding: 8mm; }
  @page { size: A4 landscape; margin: 8mm; }
  .payroll-header { text-align: center; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #333; }
  .payroll-profile-group { margin-bottom: 20px; page-break-inside: avoid; }
  .payroll-profile-header { font-size: 13px; padding: 4px 6px; background: #f3f4f6; border: 1px solid #d1d5db; border-bottom: none; }
  .payroll-table { width: 100%; border-collapse: collapse; font-size: 11px; }
  .payroll-table th { background: #e5e7eb; border: 1px solid #d1d5db; padding: 4px 6px; text-align: left; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; }
  .payroll-table td { border: 1px solid #d1d5db; padding: 3px 6px; }
  .payroll-table tbody tr:nth-child(even) { background: #fafafa; }
  .payroll-subtotal td { background: #f0f0f0 !important; border-top: 2px solid #999; }
  .payroll-grand-total { display: flex; justify-content: space-between; font-size: 14px; font-weight: 700; padding: 8px 12px; border: 2px solid #333; margin-top: 12px; background: #f9fafb; }
  .payroll-footer { margin-top: 20px; text-align: center; font-size: 10px; color: #888; }
</style></head><body>${printRef.current.innerHTML}</body></html>`);
    printWindow.document.close();
    printWindow.onload = () => {printWindow.print();};
  };

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  return (
    <div className="space-y-6">
      {/* Controls - hidden on print */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" /> Folha de Pagamento
          </h1>
          <p className="text-muted-foreground text-sm">Relatório detalhado para impressão</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={selectedProfile} onValueChange={setSelectedProfile}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Todos os profissionais" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Profissionais</SelectItem>
              {profiles.map((p) =>
              <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
              )}
            </SelectContent>
          </Select>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m, i) =>
              <SelectItem key={i} value={i.toString()}>{m}</SelectItem>
              )}
            </SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) =>
              <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              )}
            </SelectContent>
          </Select>
          <Button onClick={handlePrint} className="gap-2" variant="outline">
            <Printer className="h-4 w-4" /> Imprimir
          </Button>
          <Button onClick={handleExportPDF} className="gap-2">
            <Download className="h-4 w-4" /> Exportar PDF
          </Button>
        </div>
      </div>

      {isLoading ?
      <div className="flex items-center justify-center py-20 print:hidden">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div> :
      filteredLines.length === 0 ?
      <Card className="print:hidden">
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum registro encontrado para o período</p>
          </CardContent>
        </Card> :
      null}

      {/* Printable area */}
      <div ref={printRef} className="payroll-report text-muted bg-primary-foreground">
        {/* Header */}
        <div className="payroll-header">
          <h1 style={{ fontSize: "18px", fontWeight: "bold", margin: 0 }}>Anjos da Vida Saúde</h1>
          <p style={{ fontSize: "13px", margin: "2px 0 0 0", color: "#555" }}>
            Folha de Pagamento — {months[parseInt(selectedMonth)]} / {selectedYear}
          </p>
        </div>

        {/* Table per profile group */}
        {Object.entries(profileGroups).map(([profileId, groupLines]) => {
          const subtotal = groupLines.reduce((s, l) => s + l.line_total, 0);
          const totalMinutesAll = groupLines.reduce((s, l) => s + Math.round(l.hours_worked * 60), 0);
          const subtotalH = Math.floor(totalMinutesAll / 60);
          const subtotalM = totalMinutesAll % 60;
          const subtotalDisplay = subtotalH > 0 && subtotalM > 0 ? `${subtotalH}h ${subtotalM}min` : subtotalH > 0 ? `${subtotalH}h` : `${subtotalM}min`;
          const profile = groupLines[0];

          return (
            <div key={profileId} className="payroll-profile-group">
              <div className="payroll-profile-header">
                <strong>{profile.profile_name}</strong>
                <span style={{ marginLeft: 12, fontSize: "11px", color: "#666" }}>
                  {profile.especialidade}
                </span>
                {(() => {
                  const pData = profileDataMap.get(profileId);
                  const cpf = pData?.cpf;
                  const pix = pData?.chave_pix;
                  return (cpf || pix) ? (
                    <span style={{ marginLeft: 12, fontSize: "11px", color: "#666" }}>
                      {cpf ? `| CPF: ${cpf}` : ''} {pix ? `| PIX: ${pix}` : ''}
                    </span>
                  ) : null;
                })()}
              </div>
              <table className="payroll-table">
                <thead>
                  <tr>
                    <th style={{ width: "22%" }}>Evento</th>
                    <th style={{ width: "9%" }}>Data</th>
                    <th style={{ width: "10%" }}>Check-in</th>
                    <th style={{ width: "10%" }}>Check-out</th>
                    <th style={{ width: "9%" }}>Duração</th>
                    <th style={{ width: "10%", textAlign: "right" }}>Valor/Hora</th>
                    <th style={{ width: "10%", textAlign: "right" }}>Valor/Evento</th>
                    <th style={{ width: "10%", textAlign: "right" }}>Ajuda Custo</th>
                    <th style={{ width: "10%", textAlign: "right" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {groupLines.map((line, idx) =>
                  <tr key={idx}>
                      <td>{line.event_name}</td>
                      <td>{line.event_date}</td>
                      <td>{line.checkin_at}</td>
                      <td>{line.checkout_at}</td>
                      <td>{line.minutes_display}</td>
                      <td style={{ textAlign: "right" }}>
                        {line.valor_hora > 0 ? `R$ ${line.valor_hora.toFixed(2)}` : "—"}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {line.valor_evento > 0 ? `R$ ${line.valor_evento.toFixed(2)}` : "—"}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {line.ajuda_custo > 0 ? `R$ ${line.ajuda_custo.toFixed(2)}` : "—"}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>
                        R$ {line.line_total.toFixed(2)}
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="payroll-subtotal">
                    <td colSpan={4} style={{ textAlign: "right", fontWeight: 600 }}>
                       Subtotal — {profile.profile_name}
                     </td>
                     <td style={{ fontWeight: 600 }}>{totalHours.toFixed(1)}h</td>
                     <td colSpan={3}></td>
                     <td style={{ textAlign: "right", fontWeight: 700 }}>
                       R$ {subtotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                     </td>
                  </tr>
                </tfoot>
              </table>
            </div>);

        })}

        {/* Grand Total */}
        {filteredLines.length > 0 &&
        <div className="payroll-grand-total">
            <span>TOTAL GERAL</span>
            <span>R$ {grandTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
          </div>
        }

        <div className="payroll-footer">
          <p>Documento gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
        </div>
      </div>
    </div>);

}