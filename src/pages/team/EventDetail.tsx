import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Calendar, MapPin, Truck, Users, FileText, Clock, Fuel } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import APHForm from '@/components/APHForm';
import TeamMemberCheckin from '@/components/TeamMemberCheckin';

interface Event {
  id: string;
  nome_evento: string;
  data_inicio: string;
  data_fim: string;
  local: string;
  valor_litro_combustivel: number | null;
  consumo_medio_km_litro: number | null;
  vehicles?: { prefixo: string; modelo: string };
}

interface Attendance {
  id: string;
  nome_paciente: string;
  queixa_principal: string;
  status: string;
  created_at: string;
  profiles?: { nome: string };
}

interface TeamMember {
  id: string;
  profile_id: string;
  checkin_at: string | null;
  checkout_at: string | null;
  km_inicial: number | null;
  km_final: number | null;
  profiles: { id: string; nome: string; especialidade: string };
}

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();

  const [event, setEvent] = useState<Event | null>(null);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState<string | null>(null);

  const fetchData = async () => {
    if (!id) return;

    setIsLoading(true);

    const [eventRes, attendancesRes, teamRes] = await Promise.all([
      supabase.from('events').select('*, vehicles(prefixo, modelo)').eq('id', id).single(),
      supabase.from('clinical_attendances').select('*, profiles(nome)').eq('event_id', id).order('created_at', { ascending: false }),
      supabase.from('event_assignments').select('id, profile_id, checkin_at, checkout_at, km_inicial, km_final, profiles(id, nome, especialidade)').eq('event_id', id),
    ]);

    if (eventRes.error) {
      toast({ title: 'Evento não encontrado', variant: 'destructive' });
      navigate('/events');
      return;
    }

    setEvent(eventRes.data);
    setAttendances(attendancesRes.data || []);
    setTeam(teamRes.data as TeamMember[] || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleFormClose = () => {
    setShowForm(false);
    setEditingAttendance(null);
    fetchData();
  };

  // Calculate fuel cost summary
  const calculateFuelSummary = () => {
    const completedAssignments = team.filter(t => t.km_inicial && t.km_final);
    const totalKm = completedAssignments.reduce((acc, t) => {
      return acc + ((t.km_final || 0) - (t.km_inicial || 0));
    }, 0);

    const valorLitro = event?.valor_litro_combustivel || 0;
    const consumoMedio = event?.consumo_medio_km_litro || 10;
    const litrosUsados = totalKm / consumoMedio;
    const custoTotal = litrosUsados * valorLitro;

    return { totalKm, litrosUsados, custoTotal, valorLitro };
  };

  // Count statuses
  const checkinCount = team.filter(m => m.checkin_at).length;
  const checkoutCount = team.filter(m => m.checkout_at).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!event) return null;

  if (showForm || editingAttendance) {
    return (
      <APHForm
        eventId={event.id}
        attendanceId={editingAttendance}
        onClose={handleFormClose}
      />
    );
  }

  const fuelSummary = calculateFuelSummary();

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/events')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{event.nome_evento}</h1>
          <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {format(new Date(event.data_inicio), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {event.local}
            </span>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 gap-4">
        {event.vehicles && (
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Truck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Viatura</p>
                <p className="font-medium">{event.vehicles.prefixo}</p>
              </div>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Equipe</p>
              <p className="font-medium">{checkinCount}/{team.length} check-ins</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fuel/Mileage Summary Card */}
      {fuelSummary.totalKm > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Fuel className="w-4 h-4" />
              Resumo de Combustível
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">{fuelSummary.totalKm.toLocaleString('pt-BR')}</p>
                <p className="text-xs text-muted-foreground">KM Total</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{fuelSummary.litrosUsados.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">Litros (est.)</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">
                  R$ {fuelSummary.custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground">Custo (est.)</p>
              </div>
            </div>
            {fuelSummary.valorLitro === 0 && (
              <p className="text-xs text-warning text-center mt-2">
                Configure o valor do litro no evento para calcular o custo
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Team Members - Individual Check-in/Checkout */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            Equipe ({team.length}) — {checkoutCount}/{team.length} concluídos
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {team.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum profissional escalado
            </p>
          ) : (
            team.map((member) => (
              <TeamMemberCheckin
                key={member.id}
                member={member}
                eventName={event.nome_evento}
                onUpdate={fetchData}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* New Attendance Button */}
      <Button className="w-full btn-touch gap-2" onClick={() => setShowForm(true)}>
        <Plus className="w-5 h-5" />
        Novo Atendimento
      </Button>

      {/* Attendances List */}
      <div className="space-y-3">
        <h2 className="section-header">
          <FileText className="w-5 h-5" />
          Atendimentos ({attendances.length})
        </h2>

        {attendances.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">Nenhum atendimento registrado</p>
            </CardContent>
          </Card>
        ) : (
          attendances.map((att) => (
            <Card
              key={att.id}
              className="cursor-pointer hover:shadow-sm transition-shadow"
              onClick={() => setEditingAttendance(att.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{att.nome_paciente}</p>
                    <p className="text-sm text-muted-foreground mt-1">{att.queixa_principal}</p>
                  </div>
                  <Badge className={att.status === 'finalizado' ? 'bg-stable/20 text-stable' : 'bg-warning/20 text-warning'}>
                    {att.status === 'finalizado' ? 'Finalizado' : 'Em andamento'}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(new Date(att.created_at), "HH:mm", { locale: ptBR })}
                  </span>
                  {att.profiles && (
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {att.profiles.nome}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
