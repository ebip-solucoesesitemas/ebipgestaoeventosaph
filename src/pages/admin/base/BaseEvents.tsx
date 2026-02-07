import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Plus, Calendar, MapPin, Truck, Users, Edit, Trash2, ArrowLeft, Eye, Clock } from 'lucide-react';
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
}

interface Event {
  id: string;
  nome_evento: string;
  data_inicio: string;
  data_fim: string;
  local: string;
  viatura_id: string | null;
  equipe_completa: boolean;
  equipe_minima: number;
  vehicles?: Vehicle;
}

interface EventAssignment {
  id: string;
  profile_id: string;
  profiles?: Profile;
}

interface Base {
  id: string;
  nome: string;
  sigla: string;
}

export default function BaseEvents() {
  const { baseId } = useParams<{ baseId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [base, setBase] = useState<Base | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
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
    equipe_completa: false,
    equipe_minima: 2,
    selectedProfiles: [] as string[],
  });

  const fetchData = async () => {
    if (!baseId) return;
    setIsLoading(true);

    const [baseRes, eventsRes, allVehiclesRes, availableVehiclesRes, profilesRes] = await Promise.all([
      supabase.from('bases').select('id, nome, sigla').eq('id', baseId).single(),
      supabase.from('events').select('*, vehicles(*)').eq('base_id', baseId).order('data_inicio', { ascending: false }),
      supabase.from('vehicles').select('*').order('prefixo'),
      supabase.from('vehicles').select('*').eq('status', 'disponivel'),
      supabase.from('profiles').select('id, nome, especialidade').order('nome'),
    ]);

    if (baseRes.data) setBase(baseRes.data);
    if (eventsRes.data) {
      setEvents(eventsRes.data);
      const eventIds = eventsRes.data.map(e => e.id);
      if (eventIds.length > 0) {
        const { data: assignmentsData } = await supabase
          .from('event_assignments')
          .select('*, profiles(id, nome, especialidade)')
          .in('event_id', eventIds);

        const grouped: Record<string, EventAssignment[]> = {};
        assignmentsData?.forEach(a => {
          if (!grouped[a.event_id]) grouped[a.event_id] = [];
          grouped[a.event_id].push(a);
        });
        setAssignments(grouped);
      }
    }
    if (allVehiclesRes.data) setAllVehicles(allVehiclesRes.data);
    if (availableVehiclesRes.data) setVehicles(availableVehiclesRes.data);
    if (profilesRes.data) setProfiles(profilesRes.data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [baseId]);

  const resetForm = () => {
    setFormData({
      nome_evento: '', data_inicio: '', data_fim: '', local: '',
      viatura_id: '', equipe_completa: false, equipe_minima: 2, selectedProfiles: [],
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
      equipe_completa: event.equipe_completa || false,
      equipe_minima: event.equipe_minima || 2,
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
      equipe_completa: formData.equipe_completa,
      equipe_minima: formData.equipe_minima,
      base_id: baseId,
    };

    let eventId: string;
    const oldViaturaId = editingEvent?.viatura_id;

    if (editingEvent) {
      const { error } = await supabase.from('events').update(eventData).eq('id', editingEvent.id);
      if (error) {
        toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
        return;
      }
      eventId = editingEvent.id;
      await supabase.from('event_assignments').delete().eq('event_id', eventId);
      if (oldViaturaId && oldViaturaId !== formData.viatura_id) {
        await supabase.from('vehicles').update({ status: 'disponivel' }).eq('id', oldViaturaId);
      }
    } else {
      const { data, error } = await supabase.from('events').insert(eventData).select().single();
      if (error) {
        toast({ title: 'Erro ao criar', description: error.message, variant: 'destructive' });
        return;
      }
      eventId = data.id;
    }

    if (formData.viatura_id) {
      await supabase.from('vehicles').update({ status: 'em_uso' }).eq('id', formData.viatura_id);
    }

    if (formData.selectedProfiles.length > 0) {
      await supabase.from('event_assignments').insert(
        formData.selectedProfiles.map(profileId => ({ event_id: eventId, profile_id: profileId }))
      );
    }

    toast({ title: editingEvent ? 'Evento atualizado!' : 'Evento criado!' });
    setDialogOpen(false);
    resetForm();
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este evento?')) return;
    const event = events.find(e => e.id === id);
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    } else {
      if (event?.viatura_id) {
        await supabase.from('vehicles').update({ status: 'disponivel' }).eq('id', event.viatura_id);
      }
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

  const getAvailableVehicles = () => {
    if (editingEvent?.viatura_id) {
      const current = allVehicles.find(v => v.id === editingEvent.viatura_id);
      if (current && !vehicles.find(v => v.id === current.id)) return [...vehicles, current];
    }
    return vehicles;
  };

  const getEventStatus = (event: Event) => {
    const now = new Date();
    const start = new Date(event.data_inicio);
    const end = new Date(event.data_fim);
    if (now < start) return { label: 'Agendado', color: 'bg-muted text-muted-foreground' };
    if (now >= start && now <= end) return { label: 'Em andamento', color: 'bg-warning/20 text-warning' };
    return { label: 'Finalizado', color: 'bg-stable/20 text-stable' };
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
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/events')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Eventos — {base?.sigla} {base?.nome}
            </h1>
            <p className="text-muted-foreground">Eventos vinculados a esta base</p>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="btn-touch gap-2">
              <Plus className="w-5 h-5" />
              Novo Evento
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingEvent ? 'Editar Evento' : 'Novo Evento'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do Evento</Label>
                <Input value={formData.nome_evento} onChange={(e) => setFormData(prev => ({ ...prev, nome_evento: e.target.value }))} placeholder="Ex: Show Rock in Rio" className="input-touch" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Início</Label>
                  <Input type="datetime-local" value={formData.data_inicio} onChange={(e) => setFormData(prev => ({ ...prev, data_inicio: e.target.value }))} className="input-touch" required />
                </div>
                <div className="space-y-2">
                  <Label>Fim</Label>
                  <Input type="datetime-local" value={formData.data_fim} onChange={(e) => setFormData(prev => ({ ...prev, data_fim: e.target.value }))} className="input-touch" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Local</Label>
                <Input value={formData.local} onChange={(e) => setFormData(prev => ({ ...prev, local: e.target.value }))} placeholder="Endereço do evento" className="input-touch" required />
              </div>
              <div className="space-y-2">
                <Label>Viatura</Label>
                <Select value={formData.viatura_id} onValueChange={(v) => setFormData(prev => ({ ...prev, viatura_id: v }))}>
                  <SelectTrigger className="input-touch"><SelectValue placeholder="Selecione uma viatura" /></SelectTrigger>
                  <SelectContent>
                    {getAvailableVehicles().map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.prefixo} - {v.modelo} ({v.placa})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3 p-4 border rounded-xl bg-muted/50">
                <Label className="text-base font-semibold">Equipe</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Equipe Mínima</Label>
                    <Input type="number" min={1} value={formData.equipe_minima} onChange={(e) => setFormData(prev => ({ ...prev, equipe_minima: parseInt(e.target.value) || 2 }))} className="input-touch" />
                  </div>
                  <div className="flex items-center space-x-2 pt-6">
                    <Checkbox id="equipe_completa" checked={formData.equipe_completa} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, equipe_completa: !!checked }))} />
                    <Label htmlFor="equipe_completa" className="text-sm cursor-pointer">Equipe completa</Label>
                  </div>
                </div>
              </div>
              <div className="space-y-3 p-4 border rounded-xl bg-muted/50">
                <Label className="text-base font-semibold">Escalar Profissionais</Label>
                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                  {profiles.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-accent/50 p-1.5 rounded">
                      <Checkbox checked={formData.selectedProfiles.includes(p.id)} onCheckedChange={() => toggleProfile(p.id)} />
                      <span>{p.nome}</span>
                      <Badge variant="outline" className="text-xs ml-auto">{p.especialidade}</Badge>
                    </label>
                  ))}
                </div>
              </div>
              <Button type="submit" className="w-full btn-touch">{editingEvent ? 'Salvar' : 'Criar Evento'}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {events.length === 0 ? (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="py-12 text-center">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum evento nesta base</p>
            </CardContent>
          </Card>
        ) : (
          events.map((event) => {
            const status = getEventStatus(event);
            const teamSize = (assignments[event.id] || []).length;
            return (
              <Card key={event.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/admin/events/${event.id}`)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{event.nome_evento}</CardTitle>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(event)}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(event.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  <Badge className={status.color}>{status.label}</Badge>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{format(new Date(event.data_inicio), "dd/MM/yy HH:mm", { locale: ptBR })}</span>
                    <span>→</span>
                    <span>{format(new Date(event.data_fim), "dd/MM/yy HH:mm", { locale: ptBR })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="truncate">{event.local}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Users className="w-3.5 h-3.5" /> {teamSize}/{event.equipe_minima}
                    </span>
                    {event.vehicles && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Truck className="w-3.5 h-3.5" /> {event.vehicles.prefixo}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
