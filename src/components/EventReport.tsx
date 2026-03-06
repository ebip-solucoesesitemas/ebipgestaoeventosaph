import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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
  assinatura_url: string | null;
  created_at: string;
}

export default function EventReport() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<EventData | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [signatures, setSignatures] = useState<SignatureRecord[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  // Wait for auth session to be restored from localStorage
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthReady(true);
    });

    // Also try getSession to handle already-restored sessions
    supabase.auth.getSession().then(() => {
      setAuthReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!id || !authReady) return;

    const fetchAll = async () => {
      setIsLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Você precisa estar autenticado para visualizar o relatório. Faça login e tente novamente.");
        setIsLoading(false);
        return;
      }

      const [eventRes, teamRes, sigRes, budgetRes] = await Promise.all([
        supabase.from("events").select("*, vehicles(prefixo, modelo, placa), bases(nome, sigla)").eq("id", id).maybeSingle(),
        supabase
          .from("event_assignments")
          .select("id, checkin_at, checkout_at, profiles(nome, especialidade, registro_profissional, telefone)")
          .eq("event_id", id),
        supabase.from("event_signatures").select("id, tipo, nome_responsavel, assinatura_url, created_at").eq("event_id", id),
        supabase.from("event_budgets").select("*, clients(nome, telefone, endereco)").eq("event_id", id).limit(1),
      ]);

      if (eventRes.error) {
        console.error("Erro ao buscar evento:", eventRes.error);
        setError("Erro ao carregar dados do evento.");
        setIsLoading(false);
        return;
      }

      if (!eventRes.data) {
        setError("Evento não encontrado. Verifique se você tem permissão para acessar este evento.");
        setIsLoading(false);
        return;
      }

      setEvent(eventRes.data as unknown as EventData);
      if (teamRes.data) setTeam(teamRes.data.filter((m: any) => m.profiles) as unknown as TeamMember[]);
      if (sigRes.data) {
        setSignatures(sigRes.data as SignatureRecord[]);
        // Generate signed URLs for private bucket
        const urls: Record<string, string> = {};
        for (const sig of sigRes.data as SignatureRecord[]) {
          if (sig.assinatura_url) {
            // Extract path from full URL
            const match = sig.assinatura_url.match(/\/storage\/v1\/object\/public\/signatures\/(.+)$/);
            if (match) {
              const { data } = await supabase.storage.from("signatures").createSignedUrl(match[1], 3600);
              if (data?.signedUrl) {
                urls[sig.id] = data.signedUrl;
              }
            }
          }
        }
        setSignedUrls(urls);
      }
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
  }, [id, authReady]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-800 mx-auto" />
          <p className="mt-4 text-gray-600 text-sm">Carregando relatório...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center max-w-md px-4">
          <p className="text-red-600 font-medium text-lg mb-2">⚠ Erro</p>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => window.close()}
            className="mt-4 px-4 py-2 bg-gray-800 text-white rounded text-sm hover:bg-gray-700"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  if (!event) return null;

  const totalKm =
    event.km_inicial != null && event.km_final != null && event.km_final > event.km_inicial
      ? event.km_final - event.km_inicial
      : null;

  const arrivalSig = signatures.find((s) => s.tipo === "chegada");
  const departureSig = signatures.find((s) => s.tipo === "saida");

  const statusLabel: Record<string, string> = {
    em_andamento: "Em andamento",
    finalizado: "Finalizado",
    cancelado: "Cancelado",
  };

  return (
    <div className="report-page bg-white min-h-screen" id="event-report">
      {/* Print button */}
      <div className="print-hide fixed top-4 right-4 z-50 flex gap-2">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800 shadow-lg"
        >
          <Printer className="w-4 h-4" />
          Imprimir
        </button>
        <button
          onClick={() => window.close()}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-300 shadow-lg"
        >
          Fechar
        </button>
      </div>

      <div className="max-w-[210mm] mx-auto px-10 py-8 text-black text-[11px] leading-relaxed">
        {/* Header */}
        <header className="border-b-2 border-gray-900 pb-3 mb-5">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-lg font-bold uppercase tracking-wider text-gray-900">Anjos da Vida Saúde</h1>
              <p className="text-[10px] text-gray-500 mt-0.5">Cobertura de Eventos e Serviços de Saúde</p>
            </div>
            <div className="text-right text-[10px] text-gray-500">
              <p>Relatório de Evento</p>
              <p>Gerado em: {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
            </div>
          </div>
        </header>

        {/* Event Info - Grid */}
        <section className="mb-5">
          <h2 className="text-xs font-bold uppercase bg-gray-900 text-white px-3 py-1.5 mb-0">
            Dados do Evento
          </h2>
          <div className="border border-gray-400 border-t-0">
            <div className="grid grid-cols-2">
              <div className="border-b border-r border-gray-300 px-3 py-1.5">
                <span className="text-[10px] text-gray-500 block">Evento</span>
                <span className="font-semibold">{event.nome_evento}</span>
              </div>
              <div className="border-b border-gray-300 px-3 py-1.5">
                <span className="text-[10px] text-gray-500 block">Status</span>
                <span className="font-semibold">{statusLabel[event.status] || event.status}</span>
              </div>
            </div>
            <div className="grid grid-cols-1">
              <div className="border-b border-gray-300 px-3 py-1.5">
                <span className="text-[10px] text-gray-500 block">Localização</span>
                <span>{event.local}</span>
              </div>
            </div>
            <div className="grid grid-cols-3">
              <div className="border-b border-r border-gray-300 px-3 py-1.5">
                <span className="text-[10px] text-gray-500 block">Início</span>
                <span>{format(new Date(event.data_inicio), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
              </div>
              <div className="border-b border-r border-gray-300 px-3 py-1.5">
                <span className="text-[10px] text-gray-500 block">Término</span>
                <span>{format(new Date(event.data_fim), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
              </div>
              <div className="border-b border-gray-300 px-3 py-1.5">
                <span className="text-[10px] text-gray-500 block">Saída da Base</span>
                <span>
                  {event.horario_saida_base
                    ? format(new Date(event.horario_saida_base), "dd/MM/yyyy HH:mm", { locale: ptBR })
                    : "—"}
                </span>
              </div>
            </div>
            {event.bases && (
              <div className="px-3 py-1.5">
                <span className="text-[10px] text-gray-500 block">Base</span>
                <span>{event.bases.sigla} — {event.bases.nome}</span>
              </div>
            )}
          </div>
        </section>

        {/* Vehicle */}
        {event.vehicles && (
          <section className="mb-5">
            <h2 className="text-xs font-bold uppercase bg-gray-900 text-white px-3 py-1.5 mb-0">
              Viatura
            </h2>
            <div className="border border-gray-400 border-t-0">
              <div className="grid grid-cols-3">
                <div className="border-b border-r border-gray-300 px-3 py-1.5">
                  <span className="text-[10px] text-gray-500 block">Prefixo</span>
                  <span className="font-semibold">{event.vehicles.prefixo}</span>
                </div>
                <div className="border-b border-r border-gray-300 px-3 py-1.5">
                  <span className="text-[10px] text-gray-500 block">Modelo</span>
                  <span>{event.vehicles.modelo}</span>
                </div>
                <div className="border-b border-gray-300 px-3 py-1.5">
                  <span className="text-[10px] text-gray-500 block">Placa</span>
                  <span>{event.vehicles.placa}</span>
                </div>
              </div>
              <div className="grid grid-cols-3">
                <div className="border-r border-gray-300 px-3 py-1.5">
                  <span className="text-[10px] text-gray-500 block">KM Inicial</span>
                  <span>{event.km_inicial ?? "___________"}</span>
                </div>
                <div className="border-r border-gray-300 px-3 py-1.5">
                  <span className="text-[10px] text-gray-500 block">KM Final</span>
                  <span>{event.km_final ?? "___________"}</span>
                </div>
                <div className="px-3 py-1.5">
                  <span className="text-[10px] text-gray-500 block">KM Total</span>
                  <span className="font-semibold">{totalKm !== null ? `${totalKm} km` : "___________"}</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Client */}
        {client && (
          <section className="mb-5">
            <h2 className="text-xs font-bold uppercase bg-gray-900 text-white px-3 py-1.5 mb-0">
              Cliente / Contratante
            </h2>
            <div className="border border-gray-400 border-t-0">
              <div className="grid grid-cols-2">
                <div className="border-b border-r border-gray-300 px-3 py-1.5">
                  <span className="text-[10px] text-gray-500 block">Nome</span>
                  <span className="font-semibold">{client.nome}</span>
                </div>
                <div className="border-b border-gray-300 px-3 py-1.5">
                  <span className="text-[10px] text-gray-500 block">Telefone</span>
                  <span>{client.telefone || "—"}</span>
                </div>
              </div>
              {client.endereco && (
                <div className="px-3 py-1.5">
                  <span className="text-[10px] text-gray-500 block">Endereço</span>
                  <span>{client.endereco}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Team */}
        <section className="mb-5">
          <h2 className="text-xs font-bold uppercase bg-gray-900 text-white px-3 py-1.5 mb-0">
            Equipe Escalada
          </h2>
          <div className="border border-gray-400 border-t-0">
            {team.length === 0 ? (
              <p className="text-gray-500 text-[10px] px-3 py-3 italic">Nenhum profissional escalado para este evento</p>
            ) : (
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left px-2 py-1.5 font-semibold border-b border-gray-300">Nome</th>
                    <th className="text-left px-2 py-1.5 font-semibold border-b border-gray-300">Função</th>
                    <th className="text-left px-2 py-1.5 font-semibold border-b border-gray-300">Registro</th>
                    <th className="text-left px-2 py-1.5 font-semibold border-b border-gray-300">Telefone</th>
                    <th className="text-center px-2 py-1.5 font-semibold border-b border-gray-300">Check-in</th>
                    <th className="text-center px-2 py-1.5 font-semibold border-b border-gray-300">Checkout</th>
                  </tr>
                </thead>
                <tbody>
                  {team.map((m, idx) => (
                    <tr key={m.id} className={idx % 2 === 1 ? "bg-gray-50" : ""}>
                      <td className="px-2 py-1.5 border-b border-gray-200 font-medium">{m.profiles.nome}</td>
                      <td className="px-2 py-1.5 border-b border-gray-200">{m.profiles.especialidade}</td>
                      <td className="px-2 py-1.5 border-b border-gray-200">{m.profiles.registro_profissional}</td>
                      <td className="px-2 py-1.5 border-b border-gray-200">{m.profiles.telefone || "—"}</td>
                      <td className="px-2 py-1.5 border-b border-gray-200 text-center">
                        {m.checkin_at ? format(new Date(m.checkin_at), "HH:mm") : "___:___"}
                      </td>
                      <td className="px-2 py-1.5 border-b border-gray-200 text-center">
                        {m.checkout_at ? format(new Date(m.checkout_at), "HH:mm") : "___:___"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Signatures */}
        <section className="mb-5">
          <h2 className="text-xs font-bold uppercase bg-gray-900 text-white px-3 py-1.5 mb-0">
            Assinaturas
          </h2>
          <div className="border border-gray-400 border-t-0">
            {/* Arrival */}
            <div className="px-4 py-3 border-b border-gray-300">
              <p className="text-[10px] font-semibold text-gray-700 uppercase mb-2">Chegada da Equipe</p>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[9px] text-gray-500 mb-0.5">Nome do Responsável:</p>
                  <div className="border-b border-gray-900 min-h-[20px] pb-0.5">
                    {arrivalSig?.nome_responsavel || ""}
                  </div>
                </div>
                <div>
                  <p className="text-[9px] text-gray-500 mb-0.5">Data/Hora:</p>
                  <div className="border-b border-gray-900 min-h-[20px] pb-0.5">
                    {arrivalSig
                      ? format(new Date(arrivalSig.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                      : "____/____/________ às ___:___"}
                  </div>
                </div>
              </div>
              <div className="mt-4 mb-2 flex flex-col items-center">
                {arrivalSig?.assinatura_url ? (
                  <img
                    src={arrivalSig.assinatura_url}
                    alt="Assinatura de chegada"
                    className="max-h-[80px] max-w-[280px] object-contain mb-1"
                  />
                ) : (
                  <div className="border-b border-gray-900 w-2/3 mt-8" />
                )}
                <p className="text-[9px] text-center text-gray-500 mt-1">Assinatura do Responsável — Chegada</p>
              </div>
            </div>

            {/* Departure */}
            <div className="px-4 py-3">
              <p className="text-[10px] font-semibold text-gray-700 uppercase mb-2">Saída da Equipe</p>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[9px] text-gray-500 mb-0.5">Nome do Responsável:</p>
                  <div className="border-b border-gray-900 min-h-[20px] pb-0.5">
                    {departureSig?.nome_responsavel || ""}
                  </div>
                </div>
                <div>
                  <p className="text-[9px] text-gray-500 mb-0.5">Data/Hora:</p>
                  <div className="border-b border-gray-900 min-h-[20px] pb-0.5">
                    {departureSig
                      ? format(new Date(departureSig.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                      : "____/____/________ às ___:___"}
                  </div>
                </div>
              </div>
              <div className="mt-4 mb-2 flex flex-col items-center">
                {departureSig?.assinatura_url ? (
                  <img
                    src={departureSig.assinatura_url}
                    alt="Assinatura de saída"
                    className="max-h-[80px] max-w-[280px] object-contain mb-1"
                  />
                ) : (
                  <div className="border-b border-gray-900 w-2/3 mt-8" />
                )}
                <p className="text-[9px] text-center text-gray-500 mt-1">Assinatura do Responsável — Saída</p>
              </div>
            </div>
          </div>
        </section>

        {/* Observations */}
        <section className="mb-5">
          <h2 className="text-xs font-bold uppercase bg-gray-900 text-white px-3 py-1.5 mb-0">
            Observações
          </h2>
          <div className="border border-gray-400 border-t-0 min-h-[80px] px-3 py-2">
            <div className="space-y-4">
              <div className="border-b border-gray-300 min-h-[18px]" />
              <div className="border-b border-gray-300 min-h-[18px]" />
              <div className="border-b border-gray-300 min-h-[18px]" />
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-[9px] text-gray-400 border-t border-gray-300 pt-3 mt-6">
          <p>Anjos da Vida Saúde — Documento gerado automaticamente pelo sistema</p>
          <p className="mt-0.5">Este documento é válido como comprovante de prestação de serviço</p>
        </footer>
      </div>
    </div>
  );
}
