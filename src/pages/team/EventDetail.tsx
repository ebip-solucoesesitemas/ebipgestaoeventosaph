import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Calendar, MapPin, Truck, Users, FileText, Clock, LogIn, LogOut, CheckCircle2 } from 'lucide-react';
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
  id: string;
  profile_id: string;
  checkin_at: string | null;
  checkout_at: string | null;
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
  const [processingCheckin, setProcessingCheckin] = useState(false);

  const myAssignment = team.find(t => t.profiles.id === profile?.id);

  const fetchData = async () => {
    if (!id) return;

    setIsLoading(true);

    const [eventRes, attendancesRes, teamRes] = await Promise.all([
      supabase.from('events').select('*, vehicles(prefixo, modelo)').eq('id', id).single(),
      supabase.from('clinical_attendances').select('*, profiles(nome)').eq('event_id', id).order('created_at', { ascending: false }),
      supabase.from('event_assignments').select('id, profile_id, checkin_at, checkout_at, profiles(id, nome, especialidade)').eq('event_id', id),
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

  const handleCheckin = async () => {
    if (!myAssignment) return;
    
    setProcessingCheckin(true);
    const { error } = await supabase
      .from('event_assignments')
      .update({ checkin_at: new Date().toISOString() })
      .eq('id', myAssignment.id);

    if (error) {
      toast({ title: 'Erro ao fazer check-in', variant: 'destructive' });
    } else {
      toast({ title: 'Check-in realizado!' });
      fetchData();
    }
    setProcessingCheckin(false);
  };

  const handleCheckout = async () => {
    if (!myAssignment || !profile) return;
    
    setProcessingCheckin(true);

    // 1. Update checkout time
    const { error: checkoutError } = await supabase
      .from('event_assignments')
      .update({ checkout_at: new Date().toISOString() })
      .eq('id', myAssignment.id);

    if (checkoutError) {
      toast({ title: 'Erro ao fazer checkout', variant: 'destructive' });
      setProcessingCheckin(false);
      return;
    }

    // 2. Fetch professional rate to generate payment
    const { data: rateData } = await supabase
      .from('professional_rates')
      .select('valor_evento')
      .eq('profile_id', profile.id)
      .single();

    const valorEvento = rateData?.valor_evento || 0;

    if (valorEvento > 0) {
      // 3. Create pending payment
      const { error: paymentError } = await supabase
        .from('professional_payments')
        .insert({
          profile_id: profile.id,
          event_id: id,
          valor: valorEvento,
          tipo_pagamento: 'pix',
          status: 'pendente',
          descricao: `Participação no evento: ${event?.nome_evento}`,
        });

      if (paymentError) {
        console.error('Error creating payment:', paymentError);
      } else {
        toast({ 
          title: 'Checkout realizado!',
          description: `Pagamento de R$ ${valorEvento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} gerado.`
        });
      }
    } else {
      toast({ title: 'Checkout realizado!' });
    }

    fetchData();
    setProcessingCheckin(false);
  };

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

      {/* Check-in/Checkout Card */}
      {myAssignment && (
        <Card className={myAssignment.checkout_at ? 'border-stable' : myAssignment.checkin_at ? 'border-warning' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Sua Participação</p>
                {myAssignment.checkout_at ? (
                  <p className="text-sm text-stable flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Checkout: {format(new Date(myAssignment.checkout_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                  </p>
                ) : myAssignment.checkin_at ? (
                  <p className="text-sm text-warning">
                    Check-in: {format(new Date(myAssignment.checkin_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Faça check-in para iniciar</p>
                )}
              </div>
              {!myAssignment.checkout_at && (
                <Button
                  onClick={myAssignment.checkin_at ? handleCheckout : handleCheckin}
                  disabled={processingCheckin}
                  className={myAssignment.checkin_at ? 'bg-warning hover:bg-warning/90' : ''}
                >
                  {processingCheckin ? (
                    'Processando...'
                  ) : myAssignment.checkin_at ? (
                    <>
                      <LogOut className="w-4 h-4 mr-2" />
                      Fazer Checkout
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 mr-2" />
                      Fazer Check-in
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
          <div className="space-y-2">
            {team.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium text-sm">{member.profiles.nome}</p>
                  <p className="text-xs text-muted-foreground">{member.profiles.especialidade}</p>
                </div>
                <div className="flex items-center gap-2">
                  {member.checkout_at ? (
                    <Badge className="bg-stable/20 text-stable text-xs">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Checkout
                    </Badge>
                  ) : member.checkin_at ? (
                    <Badge className="bg-warning/20 text-warning text-xs">
                      <LogIn className="w-3 h-3 mr-1" />
                      Check-in
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">Aguardando</Badge>
                  )}
                </div>
              </div>
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
