import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/uui/button";
import { Printer } from "lucide-react";

interface EventData {
  id: string;
  nome_evento: string;
  data_inicio: string;
  data_fim: string;
  local: string;
  status: string;
  km_inicial: number | null;
  km_final: number | null;
  horario_saida_base: string | null;
  vehicles?: { prefixo: string; modelo: string; placa: string } | null;
  bases?: { nome: string; sigla: string } | null;
}

interface TeamMember {
  id: string;
  checkin_at: string | null;
  checkout_at: string | null;
  profiles: {
    nome: string;
    especialidade: string;
    registro_profissional: string;
    telefone: string | null;
  };
}

interface ClientInfo {
  nome: string;
  telefone: string | null;
  endereco: string | null;
}

interface SignatureRecord {
  id: string;
  tipo: string;
  nome_responsavel: string;
  created_at: string;
}

export default function EventReport() {
  const { id } = useParams<{ id: string }>();
  useEffect(() => {
    console.log("ID recebido da rota:", id);
  }, [id]);
  const [event, setEvent] = useState<EventData | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [signatures, setSignatures] = useState<SignatureRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchAll = async () => {
      setIsLoading(true);

      const [eventRes, teamRes, sigRes, budgetRes] = await Promise.all([
        supabase.from("events").select("*, vehicles(prefixo, modelo, placa), bases(nome, sigla)").eq("id", id).single(),
        supabase
          .from("event_assignments")
          .select("id, checkin_at, checkout_at, profiles(nome, especialidade, registro_profissional, telefone)")
          .eq("event_id", id),
        supabase.from("event_signatures").select("id, tipo, nome_responsavel, created_at").eq("event_id", id),
        supabase.from("event_budgets").select("*, clients(nome, telefone, endereco)").eq("event_id", id).limit(1),
      ]);

      if (eventRes.data) setEvent(eventRes.data as unknown as EventData);
      if (teamRes.data) setTeam(teamRes.data.filter((m: any) => m.profiles) as unknown as TeamMember[]);
      if (sigRes.data) setSignatures(sigRes.data as SignatureRecord[]);

      if (budgetRes.data && budgetRes.data.length > 0) {
        const b = budgetRes.data[0] as any;
        if (b.clients) {
          setClient({
            nome: b.clients.nome,
            telefone: b.clients.telefone,
            endereco: b.clients.endereco,
          });
        }
      }

      setIsLoading(false);
    };

    fetchAll();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Evento não encontrado</p>
      </div>
    );
  }

  const totalKm =
    event.km_inicial != null && event.km_final != null && event.km_final > event.km_inicial
      ? event.km_final - event.km_inicial
      : null;

  const arrivalSig = signatures.find((s) => s.tipo === "chegada");
  const departureSig = signatures.find((s) => s.tipo === "saida");

  return (
    <div className="report-page bg-white min-h-screen">
      {/* Print button - hidden on print */}
      <div className="print-hide fixed top-4 right-4 z-50">
        <Button onClick={() => window.print()} className="gap-2">
          <Printer className="w-4 h-4" />
          Imprimir Relatório
        </Button>
      </div>

      <div className="max-w-[210mm] mx-auto p-8 text-black text-sm">
        {/* Header */}
        <div className="text-center border-b-2 border-black pb-4 mb-6">
          <h1 className="text-xl font-bold uppercase tracking-wide">Anjos da Vida Saúde</h1>
          <p className="text-xs mt-1">Relatório de Evento</p>
          <p className="text-xs text-gray-600 mt-1">
            Gerado em: {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        </div>

        {/* Event Data */}
        <section className="mb-6">
          <h2 className="report-section-title">Dados do Evento</h2>
          <table className="report-table">
            <tbody>
              <tr>
                <td className="report-label">Nome do Evento</td>
                <td>{event.nome_evento}</td>
              </tr>
              <tr>
                <td className="report-label">Localização</td>
                <td>{event.local}</td>
              </tr>
              <tr>
                <td className="report-label">Data/Hora Início</td>
                <td>{format(new Date(event.data_inicio), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</td>
              </tr>
              <tr>
                <td className="report-label">Data/Hora Fim</td>
                <td>{format(new Date(event.data_fim), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</td>
              </tr>
              {event.horario_saida_base && (
                <tr>
                  <td className="report-label">Saída da Base</td>
                  <td>{format(new Date(event.horario_saida_base), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</td>
                </tr>
              )}
              <tr>
                <td className="report-label">Status</td>
                <td>{event.status === "finalizado" ? "Finalizado" : "Em andamento"}</td>
              </tr>
              {event.bases && (
                <tr>
                  <td className="report-label">Base</td>
                  <td>
                    {event.bases.sigla} — {event.bases.nome}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Vehicle */}
        {event.vehicles && (
          <section className="mb-6">
            <h2 className="report-section-title">Viatura</h2>
            <table className="report-table">
              <tbody>
                <tr>
                  <td className="report-label">Prefixo</td>
                  <td>{event.vehicles.prefixo}</td>
                </tr>
                <tr>
                  <td className="report-label">Modelo</td>
                  <td>{event.vehicles.modelo}</td>
                </tr>
                <tr>
                  <td className="report-label">Placa</td>
                  <td>{event.vehicles.placa}</td>
                </tr>
                <tr>
                  <td className="report-label">KM Inicial</td>
                  <td>{event.km_inicial ?? "___________"}</td>
                </tr>
                <tr>
                  <td className="report-label">KM Final</td>
                  <td>{event.km_final ?? "___________"}</td>
                </tr>
                {totalKm !== null && (
                  <tr>
                    <td className="report-label">KM Total</td>
                    <td>{totalKm} km</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        )}

        {/* Client */}
        {client && (
          <section className="mb-6">
            <h2 className="report-section-title">Cliente</h2>
            <table className="report-table">
              <tbody>
                <tr>
                  <td className="report-label">Nome</td>
                  <td>{client.nome}</td>
                </tr>
                {client.telefone && (
                  <tr>
                    <td className="report-label">Telefone</td>
                    <td>{client.telefone}</td>
                  </tr>
                )}
                {client.endereco && (
                  <tr>
                    <td className="report-label">Endereço</td>
                    <td>{client.endereco}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        )}

        {/* Team */}
        <section className="mb-6">
          <h2 className="report-section-title">Equipe Escalada</h2>
          {team.length === 0 ? (
            <p className="text-gray-500 text-xs">Nenhum profissional escalado</p>
          ) : (
            <table className="report-table">
              <thead>
                <tr>
                  <th className="report-th">Nome</th>
                  <th className="report-th">Especialidade</th>
                  <th className="report-th">Registro</th>
                  <th className="report-th">Telefone</th>
                  <th className="report-th">Check-in</th>
                  <th className="report-th">Checkout</th>
                </tr>
              </thead>
              <tbody>
                {team.map((m) => (
                  <tr key={m.id}>
                    <td className="report-td">{m.profiles.nome}</td>
                    <td className="report-td">{m.profiles.especialidade}</td>
                    <td className="report-td">{m.profiles.registro_profissional}</td>
                    <td className="report-td">{m.profiles.telefone || "—"}</td>
                    <td className="report-td">{m.checkin_at ? format(new Date(m.checkin_at), "HH:mm") : "___:___"}</td>
                    <td className="report-td">
                      {m.checkout_at ? format(new Date(m.checkout_at), "HH:mm") : "___:___"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Signatures - Arrival */}
        <section className="mb-8">
          <h2 className="report-section-title">Assinatura de Chegada</h2>
          <div className="border border-black p-4">
            <div className="flex justify-between items-end">
              <div className="flex-1">
                <p className="text-xs text-gray-600 mb-1">Nome do Responsável:</p>
                <p className="border-b border-black pb-1 min-h-[24px]">{arrivalSig?.nome_responsavel || ""}</p>
              </div>
              <div className="w-8" />
              <div className="flex-1">
                <p className="text-xs text-gray-600 mb-1">Data/Hora:</p>
                <p className="border-b border-black pb-1 min-h-[24px]">
                  {arrivalSig
                    ? format(new Date(arrivalSig.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                    : "____/____/________ às ___:___"}
                </p>
              </div>
            </div>
            <div className="mt-6 pt-8 border-t border-dashed border-gray-400">
              <p className="text-xs text-center text-gray-500">Assinatura do Responsável — Chegada</p>
            </div>
          </div>
        </section>

        {/* Signatures - Departure */}
        <section className="mb-8">
          <h2 className="report-section-title">Assinatura de Saída</h2>
          <div className="border border-black p-4">
            <div className="flex justify-between items-end">
              <div className="flex-1">
                <p className="text-xs text-gray-600 mb-1">Nome do Responsável:</p>
                <p className="border-b border-black pb-1 min-h-[24px]">{departureSig?.nome_responsavel || ""}</p>
              </div>
              <div className="w-8" />
              <div className="flex-1">
                <p className="text-xs text-gray-600 mb-1">Data/Hora:</p>
                <p className="border-b border-black pb-1 min-h-[24px]">
                  {departureSig
                    ? format(new Date(departureSig.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                    : "____/____/________ às ___:___"}
                </p>
              </div>
            </div>
            <div className="mt-6 pt-8 border-t border-dashed border-gray-400">
              <p className="text-xs text-center text-gray-500">Assinatura do Responsável — Saída</p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 border-t border-gray-300 pt-4 mt-8">
          <p>Anjos da Vida Saúde — Relatório gerado automaticamente pelo sistema</p>
        </div>
      </div>
    </div>
  );
}
