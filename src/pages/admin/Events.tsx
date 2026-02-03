import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Calendar, MapPin, Truck, Users, Edit, Trash2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Vehicle {
  id: string;
  modelo: string;
  placa: string;
  prefixo: string;
  status: string;
}

interface Profile {
  id: string;
  nome: string;
  especialidade: string;
  registro_profissional: string;
}

interface Event {
  id: string;
  nome_evento: string;
  data_inicio: string;
  data_fim: string;
  local: string;
  viatura_id: string | null;
  vehicles?: Vehicle;
}

interface EventAssignment {
  id: string;
  profile_id: string;
  profiles?: Profile;
}

export default function AdminEvents() {
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [assignments, setAssignments] = useState<Record<string, EventAssignment[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  const [formData, setFormData] = useState({
    nome_evento: '',
    data_inicio: '',
    data_fim: '',
    local: '',
    viatura_id: '',
    selectedProfiles: [] as string[],
  });

  const fetchData = async () => {
    setIsLoading(true);
    
    const [eventsRes, vehiclesRes, profilesRes] = await Promise.all([
      supabase.from('events').select('*, vehicles(*)').order('data_inicio', { ascending: false }),
      supabase.from('vehicles').select('*').eq('status', 'disponivel'),
      supabase.from('profiles').select('*').order('nome'),
    ]);

    if (eventsRes.data) {
      setEvents(eventsRes.data);
      
      // Fetch assignments for all events
      const eventIds = eventsRes.data.map(e => e.id);
      if (eventIds.length > 0) {
        const { data: assignmentsData } = await supabase
          .from('event_assignments')
          .select('*, profiles(*)')
          .in('event_id', eventIds);
        
        const grouped: Record<string, EventAssignment[]> = {};
        assignmentsData?.forEach(a => {
          if (!grouped[a.event_id]) grouped[a.event_id] = [];
          grouped[a.event_id].push(a);
        });
        setAssignments(grouped);
      }
    }
    
    if (vehiclesRes.data) setVehicles(vehiclesRes.data);
    if (profilesRes.data) setProfiles(profilesRes.data);
    
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setFormData({
      nome_evento: '',
      data_inicio: '',
      data_fim: '',
      local: '',
      viatura_id: '',
      selectedProfiles: [],
    });
    setEditingEvent(null);
  };

  const openEditDialog = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      nome_evento: event.nome_evento,
      data_inicio: event.data_inicio.slice(0, 16),
      data_fim: event.data_fim.slice(0, 16),
      local: event.local,
      viatura_id: event.viatura_id || '',
      selectedProfiles: assignments[event.id]?.map(a => a.profile_id) || [],
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const eventData = {
      nome_evento: formData.nome_evento,
      data_inicio: formData.data_inicio,
      data_fim: formData.data_fim,
      local: formData.local,
      viatura_id: formData.viatura_id || null,
    };

    let eventId: string;

    if (editingEvent) {
      const { error } = await supabase
        .from('events')
        .update(eventData)
        .eq('id', editingEvent.id);

      if (error) {
        toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
        return;
      }
      eventId = editingEvent.id;

      // Remove old assignments
      await supabase.from('event_assignments').delete().eq('event_id', eventId);
    } else {
      const { data, error } = await supabase
        .from('events')
        .insert(eventData)
        .select()
        .single();

      if (error) {
        toast({ title: 'Erro ao criar', description: error.message, variant: 'destructive' });
        return;
      }
      eventId = data.id;
    }

    // Add new assignments
    if (formData.selectedProfiles.length > 0) {
      const assignmentsToInsert = formData.selectedProfiles.map(profileId => ({
        event_id: eventId,
        profile_id: profileId,
      }));

      const { error: assignError } = await supabase
        .from('event_assignments')
        .insert(assignmentsToInsert);

      if (assignError) {
        toast({ title: 'Erro ao escalar equipe', description: assignError.message, variant: 'destructive' });
      }
    }

    toast({ title: editingEvent ? 'Evento atualizado!' : 'Evento criado!' });
    setDialogOpen(false);
    resetForm();
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este evento?')) return;

    const { error } = await supabase.from('events').delete().eq('id', id);

    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Evento excluído!' });
      fetchData();
    }
  };

  const toggleProfile = (profileId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedProfiles: prev.selectedProfiles.includes(profileId)
        ? prev.selectedProfiles.filter(id => id !== profileId)
        : [...prev.selectedProfiles, profileId],
    }));
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Eventos</h1>
          <p className="text-muted-foreground">Gerencie eventos e escalas da equipe</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="btn-touch gap-2">
              <Plus className="w-5 h-5" />
              Novo Evento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingEvent ? 'Editar Evento' : 'Novo Evento'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do Evento</Label>
                <Input
                  value={formData.nome_evento}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome_evento: e.target.value }))}
                  placeholder="Ex: Show Rock in Rio"
                  className="input-touch"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Início</Label>
                  <Input
                    type="datetime-local"
                    value={formData.data_inicio}
                    onChange={(e) => setFormData(prev => ({ ...prev, data_inicio: e.target.value }))}
                    className="input-touch"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fim</Label>
                  <Input
                    type="datetime-local"
                    value={formData.data_fim}
                    onChange={(e) => setFormData(prev => ({ ...prev, data_fim: e.target.value }))}
                    className="input-touch"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Local</Label>
                <Input
                  value={formData.local}
                  onChange={(e) => setFormData(prev => ({ ...prev, local: e.target.value }))}
                  placeholder="Endereço do evento"
                  className="input-touch"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Viatura</Label>
                <Select
                  value={formData.viatura_id}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, viatura_id: v }))}
                >
                  <SelectTrigger className="input-touch">
                    <SelectValue placeholder="Selecione uma viatura" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.prefixo} - {v.modelo} ({v.placa})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Equipe Escalada</Label>
                <div className="border rounded-xl p-3 space-y-2 max-h-48 overflow-y-auto">
                  {profiles.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => toggleProfile(p.id)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors flex items-center justify-between ${
                        formData.selectedProfiles.includes(p.id)
                          ? 'bg-primary/10 border-2 border-primary'
                          : 'bg-muted hover:bg-muted/80 border-2 border-transparent'
                      }`}
                    >
                      <div>
                        <p className="font-medium text-sm">{p.nome}</p>
                        <p className="text-xs text-muted-foreground">{p.especialidade} • {p.registro_profissional}</p>
                      </div>
                      {formData.selectedProfiles.includes(p.id) && (
                        <Badge variant="default" className="bg-primary">Selecionado</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <Button type="submit" className="w-full btn-touch">
                {editingEvent ? 'Salvar Alterações' : 'Criar Evento'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {events.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum evento cadastrado</p>
            </CardContent>
          </Card>
        ) : (
          events.map((event) => (
            <Card key={event.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{event.nome_evento}</CardTitle>
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
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(event)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(event.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                  {event.vehicles && (
                    <Badge variant="secondary" className="gap-1">
                      <Truck className="w-3 h-3" />
                      {event.vehicles.prefixo}
                    </Badge>
                  )}
                  {assignments[event.id]?.map((a) => (
                    <Badge key={a.id} variant="outline" className="gap-1">
                      <Users className="w-3 h-3" />
                      {a.profiles?.nome}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
