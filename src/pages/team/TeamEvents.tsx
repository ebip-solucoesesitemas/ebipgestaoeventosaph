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

      // Get current user's auth uid
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Get events where user is assigned via event_assignments
      const { data: myAssignments, error: assignError } = await supabase
        .from('event_assignments')
        .select('event_id')
        .eq('profile_id', profile.id);

      if (assignError) {
        toast({ title: 'Erro ao carregar eventos', variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      const assignedEventIds = myAssignments?.map(a => a.event_id) || [];

      // Get events where user_id = auth.uid() OR assigned via event_assignments
      // Use a single query with the RLS policy (which now includes user_id check)
      let query = supabase
        .from('events')
        .select('*, vehicles(prefixo, modelo)')
        .order('data_inicio', { ascending: true });

      // We rely on RLS to filter - just fetch all events the user can see
      const { data: eventsData } = await query;

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

  const isEventActive = (event: Event) => {
    const now = new Date();
    return new Date(event.data_inicio) <= now && new Date(event.data_fim) >= now;
  };

  const isEventUpcoming = (event: Event) => {
    return new Date(event.data_inicio) > new Date();
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
              <p className="text-muted-foreground">Você não está escalado em nenhum evento</p>
            </CardContent>
          </Card>
        ) : (
          events.map((event) => {
            const active = isEventActive(event);
            const upcoming = isEventUpcoming(event);

            return (
              <Link key={event.id} to={`/events/${event.id}`}>
                <Card className={`transition-all hover:shadow-md ${active ? 'ring-2 ring-stable' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {active && (
                            <Badge className="bg-stable text-stable-foreground animate-pulse-soft">
                              Em Andamento
                            </Badge>
                          )}
                          {upcoming && (
                            <Badge variant="secondary">Próximo</Badge>
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
