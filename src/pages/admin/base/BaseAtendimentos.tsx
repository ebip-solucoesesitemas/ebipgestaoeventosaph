import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Eye,
  FileDown,
  FileText,
  HeartPulse,
  Filter,
  ChevronDown,
  X,
  TrendingUp,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import APHSummary from "@/components/APHSummary";
import { generatePDF } from "@/lib/pdf";
import { toast } from "sonner";

interface Attendance {
  id: string;
  nome_paciente: string;
  idade: number | null;
  sexo: string | null;
  queixa_principal: string;
  desfecho: string | null;
  hospital_destino: string | null;
  status: string;
  created_at: string;
  data_remocao: string | null;
  profissional_id: string;
  events: {
    id: string;
    nome_evento: string;
    data_inicio: string;
    base_id: string | null;
  } | null;
  profiles: { nome: string } | null;
}

interface BaseInfo {
  id: string;
  nome: string;
  sigla: string;
}

const months = [
  { v: "all", l: "Todos os meses" },
  { v: "1", l: "Janeiro" },
  { v: "2", l: "Fevereiro" },
  { v: "3", l: "Março" },
  { v: "4", l: "Abril" },
  { v: "5", l: "Maio" },
  { v: "6", l: "Junho" },
  { v: "7", l: "Julho" },
  { v: "8", l: "Agosto" },
  { v: "9", l: "Setembro" },
  { v: "10", l: "Outubro" },
  { v: "11", l: "Novembro" },
  { v: "12", l: "Dezembro" },
];

const PAGE_SIZE = 20;

function getStatusBadge(status: string) {
  switch (status) {
    case "em_andamento":
      return <Badge className="bg-yellow-500 text-white hover:bg-yellow-500">Em andamento</Badge>;
    case "em_remocao":
      return (
        <Badge className="bg-orange-500 text-white hover:bg-orange-500 animate-pulse">
          Em remoção
        </Badge>
      );
    case "finalizado":
      return <Badge className="bg-green-600 text-white hover:bg-green-600">Finalizado</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function statusLabel(s: string) {
  return s === "em_andamento"
    ? "Em andamento"
    : s === "em_remocao"
    ? "Em remoção"
    : s === "finalizado"
    ? "Finalizado"
    : s;
}

export default function BaseAtendimentos() {
  const { baseId } = useParams<{ baseId: string }>();
  const [base, setBase] = useState<BaseInfo | null>(null);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Filters
  const [searchPatient, setSearchPatient] = useState("");
  const [searchEvent, setSearchEvent] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterProfessional, setFilterProfessional] = useState("all");

  useEffect(() => {
    if (!baseId) return;
    supabase
      .from("bases")
      .select("id, nome, sigla")
      .eq("id", baseId)
      .maybeSingle()
      .then(({ data }) => setBase(data));
  }, [baseId]);

  useEffect(() => {
    if (!baseId) return;
    setLoading(true);
    supabase
      .from("clinical_attendances")
      .select(
        "id, nome_paciente, idade, sexo, queixa_principal, desfecho, hospital_destino, status, created_at, data_remocao, profissional_id, events!inner(id, nome_evento, data_inicio, base_id), profiles(nome)"
      )
      .eq("events.base_id", baseId)
      .order("created_at", { ascending: false })
      .limit(1000)
      .then(({ data, error }) => {
        if (error) {
          toast.error("Erro ao carregar atendimentos");
          console.error(error);
        } else {
          setAttendances((data as any) || []);
        }
        setLoading(false);
      });
  }, [baseId]);

  // Available years
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    attendances.forEach((a) => {
      const y = a.created_at.slice(0, 4);
      years.add(y);
    });
    const sorted = Array.from(years).sort().reverse();
    return sorted;
  }, [attendances]);

  // Available professionals
  const availableProfessionals = useMemo(() => {
    const map = new Map<string, string>();
    attendances.forEach((a) => {
      if (a.profissional_id && a.profiles?.nome) {
        map.set(a.profissional_id, a.profiles.nome);
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [attendances]);

  // Filtered list
  const filtered = useMemo(() => {
    return attendances.filter((a) => {
      if (
        searchPatient &&
        !a.nome_paciente.toLowerCase().includes(searchPatient.toLowerCase())
      )
        return false;
      if (
        searchEvent &&
        !(a.events?.nome_evento || "")
          .toLowerCase()
          .includes(searchEvent.toLowerCase())
      )
        return false;
      const dateStr = a.created_at.slice(0, 10); // YYYY-MM-DD
      if (filterDate && dateStr !== filterDate) return false;
      if (filterMonth !== "all") {
        const m = parseInt(dateStr.slice(5, 7), 10).toString();
        if (m !== filterMonth) return false;
      }
      if (filterYear !== "all" && dateStr.slice(0, 4) !== filterYear) return false;
      if (filterStatus !== "all" && a.status !== filterStatus) return false;
      if (filterProfessional !== "all" && a.profissional_id !== filterProfessional)
        return false;
      return true;
    });
  }, [
    attendances,
    searchPatient,
    searchEvent,
    filterDate,
    filterMonth,
    filterYear,
    filterStatus,
    filterProfessional,
  ]);

  // Stats
  const stats = useMemo(() => {
    const total = filtered.length;
    const emAndamento = filtered.filter((a) => a.status === "em_andamento").length;
    const emRemocao = filtered.filter((a) => a.status === "em_remocao").length;
    const finalizados = filtered.filter((a) => a.status === "finalizado").length;
    const remocoes = filtered.filter(
      (a) => a.hospital_destino || a.data_remocao || a.status === "em_remocao"
    ).length;
    return { total, emAndamento, emRemocao, finalizados, remocoes };
  }, [filtered]);

  // Analytics
  const analytics = useMemo(() => {
    const queixas = new Map<string, number>();
    const desfechos = new Map<string, number>();
    const hospitais = new Map<string, number>();
    const profs = new Map<string, number>();

    filtered.forEach((a) => {
      const q = (a.queixa_principal || "").trim();
      if (q) queixas.set(q, (queixas.get(q) || 0) + 1);

      const d = (a.desfecho || "Não informado").trim();
      desfechos.set(d, (desfechos.get(d) || 0) + 1);

      const h = (a.hospital_destino || "").trim();
      if (h) hospitais.set(h, (hospitais.get(h) || 0) + 1);

      const p = a.profiles?.nome || "Não informado";
      profs.set(p, (profs.get(p) || 0) + 1);
    });

    const top = (m: Map<string, number>, n = 5) =>
      Array.from(m.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, n);

    return {
      queixas: top(queixas),
      desfechos: top(desfechos, 10),
      hospitais: top(hospitais),
      profs: top(profs),
    };
  }, [filtered]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [
    searchPatient,
    searchEvent,
    filterDate,
    filterMonth,
    filterYear,
    filterStatus,
    filterProfessional,
  ]);

  const clearFilters = () => {
    setSearchPatient("");
    setSearchEvent("");
    setFilterDate("");
    setFilterMonth("all");
    setFilterYear("all");
    setFilterStatus("all");
    setFilterProfessional("all");
  };

  const exportPDF = () => {
    if (filtered.length === 0) {
      toast.error("Nenhum atendimento para exportar");
      return;
    }
    const subtitle = `${base ? `Base: ${base.sigla} - ${base.nome} • ` : ""}Total: ${
      stats.total
    } atendimentos`;
    generatePDF({
      title: "Relatório de Atendimentos APH",
      subtitle,
      orientation: "landscape",
      columns: [
        { header: "Data/Hora", dataKey: "data" },
        { header: "Paciente", dataKey: "paciente" },
        { header: "Idade/Sexo", dataKey: "idsex" },
        { header: "Queixa Principal", dataKey: "queixa" },
        { header: "Evento", dataKey: "evento" },
        { header: "Profissional", dataKey: "prof" },
        { header: "Desfecho", dataKey: "desfecho" },
        { header: "Status", dataKey: "status" },
      ],
      rows: filtered.map((a) => ({
        data: format(parseISO(a.created_at), "dd/MM/yy HH:mm", { locale: ptBR }),
        paciente: a.nome_paciente,
        idsex: `${a.idade ?? "-"}${a.sexo ? "/" + a.sexo.charAt(0).toUpperCase() : ""}`,
        queixa: a.queixa_principal,
        evento: a.events?.nome_evento || "-",
        prof: a.profiles?.nome || "-",
        desfecho: a.desfecho || "-",
        status: statusLabel(a.status),
      })),
      totals: [
        { label: "Total de atendimentos", value: String(stats.total) },
        { label: "Remoções hospitalares", value: String(stats.remocoes) },
        { label: "Finalizados", value: String(stats.finalizados) },
      ],
    });
    toast.success("PDF gerado com sucesso");
  };

  const exportCSV = () => {
    if (filtered.length === 0) {
      toast.error("Nenhum atendimento para exportar");
      return;
    }
    const headers = [
      "Data",
      "Paciente",
      "Idade",
      "Sexo",
      "Queixa",
      "Evento",
      "Profissional",
      "Desfecho",
      "Hospital",
      "Status",
    ];
    const rows = filtered.map((a) => [
      format(parseISO(a.created_at), "dd/MM/yyyy HH:mm"),
      a.nome_paciente,
      a.idade ?? "",
      a.sexo ?? "",
      a.queixa_principal,
      a.events?.nome_evento ?? "",
      a.profiles?.nome ?? "",
      a.desfecho ?? "",
      a.hospital_destino ?? "",
      statusLabel(a.status),
    ]);
    const csv = [headers, ...rows]
      .map((r) =>
        r
          .map((c) => `"${String(c).replace(/"/g, '""')}"`)
          .join(";")
      )
      .join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `atendimentos_${base?.sigla || "base"}_${format(new Date(), "yyyyMMdd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado");
  };

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <HeartPulse className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Atendimentos APH</h1>
              <p className="text-sm text-muted-foreground">
                {base ? `${base.sigla} - ${base.nome}` : "Carregando base..."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportCSV}>
              <FileDown className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
            <Button onClick={exportPDF}>
              <FileText className="w-4 h-4 mr-2" />
              Exportar Relatório PDF
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Em andamento</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.emAndamento}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Em remoção</p>
              <p className="text-2xl font-bold text-orange-600">{stats.emRemocao}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Finalizados</p>
              <p className="text-2xl font-bold text-green-600">{stats.finalizados}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Remoções hospitalares</p>
              <p className="text-2xl font-bold">{stats.remocoes}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Paciente</Label>
              <Input
                placeholder="Buscar paciente..."
                value={searchPatient}
                onChange={(e) => setSearchPatient(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Evento</Label>
              <Input
                placeholder="Buscar evento..."
                value={searchEvent}
                onChange={(e) => setSearchEvent(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Data específica</Label>
              <Input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Mês</Label>
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m.v} value={m.v}>
                      {m.l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Ano</Label>
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os anos</SelectItem>
                  {availableYears.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="em_andamento">Em andamento</SelectItem>
                  <SelectItem value="em_remocao">Em remoção</SelectItem>
                  <SelectItem value="finalizado">Finalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Profissional</Label>
              <Select
                value={filterProfessional}
                onValueChange={setFilterProfessional}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {availableProfessionals.map(([id, nome]) => (
                    <SelectItem key={id} value={id}>
                      {nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={clearFilters} className="w-full">
                <X className="w-4 h-4 mr-2" />
                Limpar filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Analytics dashboard */}
        <Collapsible>
          <Card>
            <CollapsibleTrigger asChild>
              <button className="w-full">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Dashboard analítico
                  </CardTitle>
                  <ChevronDown className="w-4 h-4" />
                </CardHeader>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-sm mb-2">Top 5 queixas mais frequentes</h4>
                  {analytics.queixas.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sem dados</p>
                  ) : (
                    <ol className="space-y-1 text-sm">
                      {analytics.queixas.map(([k, v], i) => (
                        <li key={k} className="flex justify-between border-b pb-1">
                          <span>
                            {i + 1}. {k}
                          </span>
                          <Badge variant="secondary">{v}</Badge>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-2">Distribuição por desfecho</h4>
                  {analytics.desfechos.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sem dados</p>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {analytics.desfechos.map(([k, v]) => (
                        <li key={k} className="flex justify-between border-b pb-1">
                          <span>{k}</span>
                          <Badge variant="secondary">{v}</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-2">Hospitais mais utilizados</h4>
                  {analytics.hospitais.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sem remoções</p>
                  ) : (
                    <ol className="space-y-1 text-sm">
                      {analytics.hospitais.map(([k, v], i) => (
                        <li key={k} className="flex justify-between border-b pb-1">
                          <span>
                            {i + 1}. {k}
                          </span>
                          <Badge variant="secondary">{v}</Badge>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-2">Profissionais com mais atendimentos</h4>
                  {analytics.profs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sem dados</p>
                  ) : (
                    <ol className="space-y-1 text-sm">
                      {analytics.profs.map(([k, v], i) => (
                        <li key={k} className="flex justify-between border-b pb-1">
                          <span>
                            {i + 1}. {k}
                          </span>
                          <Badge variant="secondary">{v}</Badge>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Table */}
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Idade/Sexo</TableHead>
                  <TableHead>Queixa Principal</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Profissional</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : paged.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhum atendimento encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  paged.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs">
                        {format(parseISO(a.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="font-medium">{a.nome_paciente}</TableCell>
                      <TableCell className="text-xs">
                        {a.idade ?? "-"}
                        {a.sexo ? ` / ${a.sexo.charAt(0).toUpperCase()}` : ""}
                      </TableCell>
                      <TableCell className="text-xs max-w-xs truncate">
                        {a.queixa_principal}
                      </TableCell>
                      <TableCell className="text-xs">{a.events?.nome_evento || "-"}</TableCell>
                      <TableCell className="text-xs">{a.profiles?.nome || "-"}</TableCell>
                      <TableCell>{getStatusBadge(a.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedId(a.id)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Página {page} de {totalPages} • {filtered.length} resultado(s)
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Details dialog */}
      <Dialog open={!!selectedId} onOpenChange={(o) => !o && setSelectedId(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedId && (
            <APHSummary attendanceId={selectedId} onClose={() => setSelectedId(null)} />
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
