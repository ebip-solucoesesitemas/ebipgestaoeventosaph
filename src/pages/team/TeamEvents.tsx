import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Calendar, MapPin, Truck, Users, ChevronRight, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Event {
  id: string;
  nome_evento: string;
  data_inicio: string;
  data_fim: string;
  local: string;
  status: string;
  viatura_id: string | null;
  vehicles?: {
    prefixo: string;
    modelo: string;
  };
}

interface EventAssignment {
  profiles: {
    nome: string;
    especialidade: string;
  };
}

export default function TeamEvents() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [assignments, setAssignments] = useState<Record<string, EventAssignment[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      if (!profile) return;

      setIsLoading(true);

      // Rely entirely on RLS - fetch all events the user can see
      const { data: eventsData } = await supabase
        .from('events')
        .select('*, vehicles(prefixo, modelo)')
        .neq('status', 'finalizado')
        .order('data_inicio', { ascending: true });

      if (eventsData) {
        setEvents(eventsData);

        const eventIds = eventsData.map(e => e.id);
        if (eventIds.length > 0) {
          // Get team for each event
          const { data: teamData } = await supabase
            .from('event_assignments')
            .select('event_id, profiles(nome, especialidade)')
            .in('event_id', eventIds);

          const grouped: Record<string, EventAssignment[]> = {};
          teamData?.forEach((t) => {
            if (!grouped[t.event_id]) grouped[t.event_id] = [];
            grouped[t.event_id].push(t as EventAssignment);
          });
          setAssignments(grouped);
        }
      }

      setIsLoading(false);
    };

    fetchEvents();
  }, [profile]);

  const getEventStatus = (event: Event) => {
    if (event.status === 'finalizado') return 'finalizado';
    const now = new Date();
    if (new Date(event.data_fim) <= now) return 'finalizado';
    if (new Date(event.data_inicio) > now) return 'proximo';
    return 'em_andamento';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Meus Eventos</h1>
        <p className="text-muted-foreground">Eventos onde você está escalado</p>
      </div>

      <div className="space-y-4">
        {events.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum evento encontrado</p>
            </CardContent>
          </Card>
        ) : (
          events.map((event) => {
            const status = getEventStatus(event);

            return (
              <Link key={event.id} to={`/events/${event.id}`}>
                <Card className={`transition-all hover:shadow-md ${status === 'em_andamento' ? 'ring-2 ring-stable' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {status === 'em_andamento' && (
                            <Badge className="bg-stable text-stable-foreground animate-pulse-soft">
                              Em Andamento
                            </Badge>
                          )}
                          {status === 'proximo' && (
                            <Badge variant="secondary">Próximo</Badge>
                          )}
                          {status === 'finalizado' && (
                            <Badge className="bg-muted text-muted-foreground">Finalizado</Badge>
                          )}
                        </div>
                        <CardTitle className="text-lg">{event.nome_evento}</CardTitle>
                        <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {format(new Date(event.data_inicio), "dd/MM 'às' HH:mm", { locale: ptBR })}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {event.local}
                          </span>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="shrink-0">
                        <ChevronRight className="w-5 h-5" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-2">
                      {event.vehicles && (
                        <Badge variant="outline" className="gap-1">
                          <Truck className="w-3 h-3" />
                          {event.vehicles.prefixo}
                        </Badge>
                      )}
                      <Badge variant="outline" className="gap-1">
                        <Users className="w-3 h-3" />
                        {assignments[event.id]?.length || 0} profissionais
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
