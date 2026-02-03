import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Calendar, MapPin, Truck, Users, FileText, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import APHForm from '@/components/APHForm';

interface Event {
  id: string;
  nome_evento: string;
  data_inicio: string;
  data_fim: string;
  local: string;
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
  profiles: { nome: string; especialidade: string };
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
      supabase.from('event_assignments').select('profiles(nome, especialidade)').eq('event_id', id),
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
              <p className="font-medium">{team.length} profissionais</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            Equipe Escalada
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2">
            {team.map((member, idx) => (
              <Badge key={idx} variant="secondary">
                {member.profiles.nome} • {member.profiles.especialidade}
              </Badge>
            ))}
          </div>
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
              <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Nenhum atendimento registrado</p>
            </CardContent>
          </Card>
        ) : (
          attendances.map((attendance) => (
            <Card
              key={attendance.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setEditingAttendance(attendance.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{attendance.nome_paciente}</p>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {attendance.queixa_principal}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(attendance.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                      {attendance.profiles && ` • ${attendance.profiles.nome}`}
                    </p>
                  </div>
                  <Badge variant={attendance.status === 'finalizado' ? 'default' : 'secondary'}>
                    {attendance.status === 'finalizado' ? 'Finalizado' : 'Em andamento'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
