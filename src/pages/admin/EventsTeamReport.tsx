import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { FileText, Download, Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { generatePDF } from "@/lib/pdf";

interface EventTeamData {
  event_id: string;
  event_name: string;
  event_date: string;
  local: string;
  viatura?: string | null;
  team: Array<{
    nome: string;
    especialidade: string;
    registro_profissional: string;
    telefone: string | null;
  }>;
}

const months = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const predefinedEspecialidades = ["Médico", "Enfermeiro", "Técnico", "Socorrista", "VTR"];

export default function EventsTeamReport() {
  const { toast } = useToast();
  const [events, setEvents] = useState<EventTeamData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [searchEvent, setSearchEvent] = useState("");
  const [selectedEspecialidades, setSelectedEspecialidades] = useState<string[]>([]);

  useEffect(() => {
    fetchEvents();
  }, [selectedMonth, selectedYear]);

  const fetchEvents = async () => {
    setIsLoading(true);

    const monthStart = startOfMonth(new Date(parseInt(selectedYear), parseInt(selectedMonth)));
    const monthEnd = endOfMonth(monthStart);

    try {
      const { data: eventsData, error } = await supabase
        .from("events")
        .select(
          `
          id,
          nome_evento,
          data_inicio,
          local,
          vehicles(prefixo, modelo, placa),
          event_assignments(
            profiles(
              nome,
              especialidade,
              registro_profissional,
              profile_private(telefone)
            )
          )
        `,
        )
        .gte("data_inicio", monthStart.toISOString())
        .lte("data_inicio", monthEnd.toISOString())
        .order("data_inicio", { ascending: false });

      if (error) throw error;

      const formattedEvents: EventTeamData[] = (eventsData || []).map((e: any) => {
        const vehicle = e.vehicles;
        const viaturaLabel = vehicle ? `${vehicle.prefixo} (${vehicle.modelo} / ${vehicle.placa})` : null;
        return {
          event_id: e.id,
          event_name: e.nome_evento,
          event_date: e.data_inicio,
          local: e.local,
          viatura: viaturaLabel,
          team: (e.event_assignments || [])
            .filter((a: any) => a.profiles)
            .map((a: any) => ({
              nome: a.profiles.nome,
              especialidade: a.profiles.especialidade,
              registro_profissional: a.profiles.registro_profissional || "",
              telefone: a.profiles.profile_private?.[0]?.telefone || null,
            })),
        };
      });

      setEvents(formattedEvents);
    } catch (err: any) {
      toast({
        title: "Erro ao carregar eventos",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEvents = events.filter((e) => {
    const matchesSearch = !searchEvent || e.event_name.toLowerCase().includes(searchEvent.toLowerCase());
    const hasTeamWithSelected =
      selectedEspecialidades.length === 0 ||
      e.team.some((member) => selectedEspecialidades.includes(member.especialidade));
    return matchesSearch && hasTeamWithSelected;
  });

  // Extract unique especialidades from all events and merge with predefined ones
  const dynamicEspecialidades = Array.from(new Set(events.flatMap((e) => e.team.map((m) => m.especialidade))));
  const allEspecialidades = Array.from(new Set([...predefinedEspecialidades, ...dynamicEspecialidades])).sort();

  const handleExportPDF = async () => {
    if (filteredEvents.length === 0) {
      toast({
        title: "Nenhum evento",
        description: "Selecione um período com eventos",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const rows: any[] = [];

      filteredEvents.forEach((event) => {
        const filteredTeam =
          selectedEspecialidades.length === 0
            ? event.team
            : event.team.filter((m) => selectedEspecialidades.includes(m.especialidade));

        if (filteredTeam.length === 0) return;

        // For compact report: first member row includes event name and date, following rows leave them blank
        filteredTeam.forEach((member, idx) => {
          rows.push({
            evento: idx === 0 ? event.event_name : "",
            data: idx === 0 ? format(new Date(event.event_date), "dd/MM/yyyy", { locale: ptBR }) : "",
            registro_profissional: member.registro_profissional || "",
            viatura: event.viatura || "—",
            nomes: member.nome,
            especialidade: member.especialidade || "",
          });
        });

        // Blank row separator
        rows.push({
          evento: "",
          data: "",
          registro_profissional: "",
          viatura: "",
          nomes: "",
          especialidade: "",
        });
      });

      const columns = [
        { header: "Evento", dataKey: "evento" },
        { header: "Data", dataKey: "data", halign: "center" as const },
        { header: "Registro Profissional", dataKey: "registro_profissional" },
        { header: "Especialidade", dataKey: "especialidade" },
        { header: "Viatura", dataKey: "viatura" },
        { header: "Nomes da Equipe", dataKey: "nomes" },
      ];

      generatePDF({
        title: `Relatório de Eventos com Equipe — ${months[parseInt(selectedMonth)]} / ${selectedYear}`,
        columns,
        rows,
      });

      toast({
        title: "PDF gerado com sucesso!",
        description: "O relatório foi exportado",
      });
    } catch (err: any) {
      toast({
        title: "Erro ao gerar PDF",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Relatório de Eventos
          </h1>
          <p className="text-muted-foreground">Equipe escalada com CRM/COREN</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((month, idx) => (
                <SelectItem key={idx} value={idx.toString()}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleExportPDF} disabled={isGenerating || filteredEvents.length === 0} className="gap-2">
            <Download className="w-4 h-4" />
            {isGenerating ? "Gerando..." : "Exportar PDF"}
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar evento..."
          value={searchEvent}
          onChange={(e) => setSearchEvent(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Especialidades Filter */}
      {allEspecialidades.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Filtrar por Função</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {allEspecialidades.map((esp) => (
                <div key={esp} className="flex items-center space-x-2">
                  <Checkbox
                    id={`esp-${esp}`}
                    checked={selectedEspecialidades.includes(esp)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedEspecialidades([...selectedEspecialidades, esp]);
                      } else {
                        setSelectedEspecialidades(selectedEspecialidades.filter((e) => e !== esp));
                      }
                    }}
                  />
                  <Label htmlFor={`esp-${esp}`} className="font-normal cursor-pointer">
                    {esp}
                  </Label>
                </div>
              ))}
            </div>
            {selectedEspecialidades.length > 0 && (
              <Button variant="ghost" size="sm" className="mt-3" onClick={() => setSelectedEspecialidades([])}>
                Limpar Filtros
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="py-12 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </CardContent>
          </Card>
        ) : filteredEvents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum evento encontrado neste período</p>
            </CardContent>
          </Card>
        ) : (
          filteredEvents.map((event) => {
            const filteredTeam =
              selectedEspecialidades.length === 0
                ? event.team
                : event.team.filter((m) => selectedEspecialidades.includes(m.especialidade));

            if (filteredTeam.length === 0 && selectedEspecialidades.length > 0) {
              return null;
            }

            return (
              <Card key={event.event_id}>
                <CardHeader>
                  <div>
                    <CardTitle className="text-lg">{event.event_name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {format(new Date(event.event_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} • {event.local}
                    </p>
                    {event.viatura && (
                      <p className="text-sm text-muted-foreground mt-1">
                        <span className="font-medium">Viatura:</span> {event.viatura}
                      </p>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredTeam.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">Sem equipe escalada</p>
                  ) : (
                    <div className="space-y-2">
                      {filteredTeam.map((member, idx) => (
                        <p key={idx} className="text-sm">
                          {member.nome}
                        </p>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
