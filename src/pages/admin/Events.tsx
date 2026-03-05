import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Plus, Calendar, MapPin, Truck, Users, Edit, Trash2, Clock, CheckCircle2, AlertCircle, Fuel, Search, Eye, LogIn, LogOut, Navigation } from 'lucide-react';
import { localDatetimeToISO, isoToLocalDatetime } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Vehicle {
  id: string;
  modelo: string;
  placa: string;
  prefixo: string;
  status: string;
  base_id: string | null;
}

interface Profile {
  id: string;
  nome: string;
  especialidade: string;
  registro_profissional: string;
  user_id: string | null;
}

interface UserAccount {
  id: string;
  nome: string;
  user_id: string;
}

interface Event {
  id: string;
  nome_evento: string;
  data_inicio: string;
  data_fim: string;
  local: string;
  status: string;
  viatura_id: string | null;
  equipe_completa: boolean;
  equipe_minima: number;
  valor_litro_combustivel: number | null;
  consumo_medio_km_litro: number | null;
  vehicles?: Vehicle;
}

interface EventAssignment {
  id: string;
  profile_id: string;
  checkin_at: string | null;
  checkout_at: string | null;
  km_inicial: number | null;
  km_final: number | null;
  profiles?: Profile;
}

interface Client {
  id: string;
  nome: string;
  endereco: string | null;
}

interface Base {
  id: string;
  nome: string;
  sigla: string;
}

export default function AdminEvents() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [assignments, setAssignments] = useState<Record<string, EventAssignment[]>>({});
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>([]);
  const [bases, setBases] = useState<Base[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [profileSearch, setProfileSearch] = useState('');
  const [pendingBudgetId, setPendingBudgetId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  // Update `now` every 60s for temporal progress bar
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const [formData, setFormData] = useState({
    nome_evento: '',
    data_inicio: '',
    data_fim: '',
    local: '',
    base_id: '',
    viatura_id: '',
    user_id: '',
    equipe_completa: false,
    equipe_minima: 2,
    valor_litro_combustivel: '',
    consumo_medio_km_litro: '10',
    min_antes_saida_base: '',
    horario_saida_base: '',
    selectedProfiles: [] as string[],
    client_id: '',
  });

  const fetchData = async () => {
    setIsLoading(true);
    
    const [eventsRes, allVehiclesRes, availableVehiclesRes, profilesRes, clientsRes, basesRes] = await Promise.all([
      supabase.from('events').select('*, vehicles(*)').order('data_inicio', { ascending: false }),
      supabase.from('vehicles').select('*').order('prefixo'),
      supabase.from('vehicles').select('*').neq('status', 'manutencao'),
      supabase.from('profiles').select('*').order('nome'),
      supabase.from('clients').select('id, nome, endereco').order('nome'),
      supabase.from('bases').select('id, nome, sigla').order('sigla'),
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
    
    if (allVehiclesRes.data) setAllVehicles(allVehiclesRes.data);
    if (availableVehiclesRes.data) setVehicles(availableVehiclesRes.data);
    if (profilesRes.data) setProfiles(profilesRes.data);
    if (clientsRes.data) setClients(clientsRes.data);
    if (basesRes.data) setBases(basesRes.data);

    // Fetch user accounts (profiles with user_id and cargo = equipe)
    const { data: accountsData } = await supabase
      .from('profiles')
      .select('id, nome, user_id')
      .not('user_id', 'is', null)
      .eq('cargo', 'equipe')
      .order('nome');
    if (accountsData) setUserAccounts(accountsData as UserAccount[]);
    
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Open dialog from budget redirect
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      const nome = searchParams.get('nome') || '';
      const local = searchParams.get('local') || '';
      const dataInicio = searchParams.get('data_inicio') || '';
      const dataFim = searchParams.get('data_fim') || '';
      const budgetId = searchParams.get('budget_id') || null;

      setFormData(prev => ({
        ...prev,
        nome_evento: nome,
        local: local,
        data_inicio: dataInicio ? dataInicio.slice(0, 16) : '',
        data_fim: dataFim ? dataFim.slice(0, 16) : '',
      }));
      setPendingBudgetId(budgetId);
      setDialogOpen(true);
      setSearchParams({});
    }
  }, [searchParams]);

  const resetForm = () => {
    setFormData({
      nome_evento: '',
      data_inicio: '',
      data_fim: '',
      local: '',
      base_id: '',
      viatura_id: '',
      user_id: '',
      equipe_completa: false,
      equipe_minima: 2,
      valor_litro_combustivel: '',
      consumo_medio_km_litro: '10',
      min_antes_saida_base: '',
      horario_saida_base: '',
      selectedProfiles: [],
      client_id: '',
    });
    setEditingEvent(null);
  };

  const openEditDialog = (event: Event) => {
    setEditingEvent(event);
    const fetchEventDetails = async () => {
      const [eventRes, budgetRes] = await Promise.all([
        supabase.from('events').select('user_id, base_id, min_antes_saida_base, horario_saida_base').eq('id', event.id).single(),
        supabase.from('event_budgets').select('client_id').eq('event_id', event.id).maybeSingle(),
      ]);
      const data = eventRes.data;
      setFormData({
        nome_evento: event.nome_evento,
        data_inicio: isoToLocalDatetime(event.data_inicio),
        data_fim: isoToLocalDatetime(event.data_fim),
        local: event.local,
        base_id: (data as any)?.base_id || '',
        viatura_id: event.viatura_id || '',
        user_id: (data as any)?.user_id || '',
        equipe_completa: event.equipe_completa || false,
        equipe_minima: event.equipe_minima || 2,
        valor_litro_combustivel: event.valor_litro_combustivel?.toString() || '',
        consumo_medio_km_litro: event.consumo_medio_km_litro?.toString() || '10',
        min_antes_saida_base: (data as any)?.min_antes_saida_base?.toString() || '',
        horario_saida_base: (data as any)?.horario_saida_base ? isoToLocalDatetime((data as any).horario_saida_base) : '',
        selectedProfiles: assignments[event.id]?.map(a => a.profile_id) || [],
        client_id: (budgetRes.data as any)?.client_id || '',
      });
    };
    fetchEventDetails();
    setDialogOpen(true);
  };

  const checkVehicleConflict = async (viaturaId: string, dataInicio: string, dataFim: string, editingEventId?: string) => {
    let query = supabase
      .from('events')
      .select('id, nome_evento, data_inicio, data_fim')
      .eq('viatura_id', viaturaId)
      .neq('status', 'finalizado');

    if (editingEventId) {
      query = query.neq('id', editingEventId);
    }

    const { data } = await query;
    if (!data) return [];

    const novoInicio = new Date(dataInicio);
    const novoFim = new Date(dataFim);

    return data.filter(ev => {
      const evInicio = new Date(ev.data_inicio);
      const evFim = new Date(ev.data_fim);
      return novoInicio < evFim && novoFim > evInicio;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const dataInicioISO = localDatetimeToISO(formData.data_inicio);
    const dataFimISO = localDatetimeToISO(formData.data_fim);

    // Validar conflito de viatura
    if (formData.viatura_id) {
      const conflitos = await checkVehicleConflict(
        formData.viatura_id,
        dataInicioISO,
        dataFimISO,
        editingEvent?.id
      );
      if (conflitos.length > 0) {
        toast({
          title: 'Viatura indisponível neste horário',
          description: `A viatura já está empenhada no evento "${conflitos[0].nome_evento}" neste período.`,
          variant: 'destructive',
        });
        return;
      }
    }

    const eventData: Record<string, any> = {
      nome_evento: formData.nome_evento,
      data_inicio: dataInicioISO,
      data_fim: dataFimISO,
      local: formData.local,
      base_id: formData.base_id || null,
      viatura_id: formData.viatura_id || null,
      user_id: formData.user_id || null,
      equipe_completa: formData.equipe_completa,
      equipe_minima: formData.equipe_minima,
      valor_litro_combustivel: formData.valor_litro_combustivel ? parseFloat(formData.valor_litro_combustivel) : null,
      consumo_medio_km_litro: formData.consumo_medio_km_litro ? parseFloat(formData.consumo_medio_km_litro) : 10,
      min_antes_saida_base: formData.min_antes_saida_base ? parseInt(formData.min_antes_saida_base) : null,
      horario_saida_base: formData.horario_saida_base ? localDatetimeToISO(formData.horario_saida_base) : null,
    };

    let eventId: string;
    const oldViaturaId = editingEvent?.viatura_id;

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

      // Update old vehicle status if changed
      if (oldViaturaId && oldViaturaId !== formData.viatura_id) {
        await supabase.from('vehicles').update({ status: 'disponivel' }).eq('id', oldViaturaId);
      }
    } else {
      const { data, error } = await supabase
        .from('events')
        .insert(eventData as any)
        .select()
        .single();

      if (error) {
        toast({ title: 'Erro ao criar', description: error.message, variant: 'destructive' });
        return;
      }
      eventId = data.id;

      // Link budget to the new event if created from budget
      if (pendingBudgetId) {
        await supabase.from('event_budgets').update({ event_id: eventId }).eq('id', pendingBudgetId);
        setPendingBudgetId(null);
      }
    }

    // Update new vehicle status to 'em_uso'
    if (formData.viatura_id) {
      await supabase.from('vehicles').update({ status: 'em_uso' }).eq('id', formData.viatura_id);
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

    const event = events.find(e => e.id === id);
    
    const { error } = await supabase.from('events').delete().eq('id', id);

    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    } else {
      // Release the vehicle if any
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

  // Get vehicles for select (available + current event's vehicle if editing)
  const getAvailableVehicles = () => {
    if (editingEvent?.viatura_id) {
      const currentVehicle = allVehicles.find(v => v.id === editingEvent.viatura_id);
      if (currentVehicle && !vehicles.find(v => v.id === currentVehicle.id)) {
        return [...vehicles, currentVehicle];
      }
    }
    return vehicles;
  };

  const getTeamStatus = (event: Event) => {
    const eventAssignments = assignments[event.id] || [];
    const teamSize = eventAssignments.length;
    const isComplete = event.equipe_completa || teamSize >= event.equipe_minima;
    const checkinCount = eventAssignments.filter(a => a.checkin_at).length;
    const checkoutCount = eventAssignments.filter(a => a.checkout_at).length;
    const totalKm = eventAssignments.reduce((sum, a) => {
      if (a.km_inicial && a.km_final) {
        return sum + (a.km_final - a.km_inicial);
      }
      return sum;
    }, 0);
    
    return {
      size: teamSize,
      minRequired: event.equipe_minima,
      isComplete,
      markedComplete: event.equipe_completa,
      checkinCount,
      checkoutCount,
      totalKm,
      checkinProgress: teamSize > 0 ? (checkinCount / teamSize) * 100 : 0,
    };
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
          <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
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
                <Label>Cliente</Label>
                <Select
                  onValueChange={(clientId) => {
                    const client = clients.find(c => c.id === clientId);
                    if (client?.endereco) {
                      setFormData(prev => ({ ...prev, local: client.endereco! }));
                    }
                  }}
                >
                  <SelectTrigger className="input-touch">
                    <SelectValue placeholder="Selecione um cliente (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Label>Base</Label>
                <Select
                  value={formData.base_id}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, base_id: v }))}
                >
                  <SelectTrigger className="input-touch">
                    <SelectValue placeholder="Selecione a base" />
                  </SelectTrigger>
                  <SelectContent>
                    {bases.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.sigla} — {b.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Conta Responsável</Label>
                <Select
                  value={formData.user_id}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, user_id: v }))}
                >
                  <SelectTrigger className="input-touch">
                    <SelectValue placeholder="Selecione a conta responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    {userAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.user_id}>
                        {acc.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                    {getAvailableVehicles()
                      .filter((v) => {
                        // Filter by selected base - only show vehicles assigned to this base or unassigned
                        if (!formData.base_id) return true;
                        return v.id === editingEvent?.viatura_id || (v as any).base_id === formData.base_id || !(v as any).base_id;
                      })
                      .map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.prefixo} - {v.modelo} ({v.placa})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3 p-4 border rounded-xl bg-muted/50">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Fuel className="w-4 h-4" />
                  Configuração de Combustível
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Valor do Litro (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={formData.valor_litro_combustivel}
                      onChange={(e) => setFormData(prev => ({ ...prev, valor_litro_combustivel: e.target.value }))}
                      placeholder="Ex: 5.89"
                      className="input-touch"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Consumo Médio (km/L)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min={1}
                      value={formData.consumo_medio_km_litro}
                      onChange={(e) => setFormData(prev => ({ ...prev, consumo_medio_km_litro: e.target.value }))}
                      placeholder="Ex: 10"
                      className="input-touch"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Usado para calcular o custo estimado de combustível com base na quilometragem
                </p>
              </div>

              {/* Saída da Base */}
              <div className="space-y-3 p-4 border rounded-xl bg-muted/50">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Saída da Base
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Horário de Saída da Base</Label>
                    <Input
                      type="datetime-local"
                      value={formData.horario_saida_base}
                      onChange={(e) => setFormData(prev => ({ ...prev, horario_saida_base: e.target.value }))}
                      className="input-touch"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Min. antes p/ Check-in</Label>
                    <Input
                      type="number"
                      min={0}
                      value={formData.min_antes_saida_base}
                      onChange={(e) => setFormData(prev => ({ ...prev, min_antes_saida_base: e.target.value }))}
                      placeholder="Ex: 30"
                      className="input-touch"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Profissionais só poderão fazer check-in dentro do período configurado antes do horário de saída da base
                </p>
              </div>

              <div className="space-y-3 p-4 border rounded-xl bg-muted/50">
                <Label className="text-base font-semibold">Configuração da Equipe</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Equipe Mínima</Label>
                    <Input
                      type="number"
                      min={1}
                      value={formData.equipe_minima}
                      onChange={(e) => setFormData(prev => ({ ...prev, equipe_minima: parseInt(e.target.value) || 2 }))}
                      className="input-touch"
                    />
                  </div>
                  <div className="flex items-center space-x-2 pt-6">
                    <Checkbox
                      id="equipe_completa"
                      checked={formData.equipe_completa}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, equipe_completa: !!checked }))}
                    />
                    <Label htmlFor="equipe_completa" className="text-sm cursor-pointer">
                      Marcar equipe como completa
                    </Label>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Selecionados: {formData.selectedProfiles.length} / Mínimo: {formData.equipe_minima}
                  {formData.selectedProfiles.length >= formData.equipe_minima && (
                    <span className="text-stable ml-2">✓ Mínimo atingido</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Equipe Escalada</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar profissional..."
                    value={profileSearch}
                    onChange={(e) => setProfileSearch(e.target.value)}
                    className="pl-10 input-touch"
                  />
                </div>
                <div className="border rounded-xl p-3 space-y-2 max-h-48 overflow-y-auto">
                  {profiles
                    .filter(p => 
                      p.nome.toLowerCase().includes(profileSearch.toLowerCase()) ||
                      p.especialidade.toLowerCase().includes(profileSearch.toLowerCase()) ||
                      p.registro_profissional.toLowerCase().includes(profileSearch.toLowerCase())
                    )
                    .map((p) => (
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
                  {profiles.filter(p => 
                    p.nome.toLowerCase().includes(profileSearch.toLowerCase()) ||
                    p.especialidade.toLowerCase().includes(profileSearch.toLowerCase()) ||
                    p.registro_profissional.toLowerCase().includes(profileSearch.toLowerCase())
                  ).length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-4">
                      {profiles.length === 0 ? 'Nenhum profissional cadastrado' : 'Nenhum profissional encontrado'}
                    </p>
                  )}
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
          events.map((event) => {
            const teamStatus = getTeamStatus(event);
            return (
              <Card key={event.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-lg">{event.nome_evento}</CardTitle>
                        {event.status === 'finalizado' ? (
                          <Badge className="bg-muted text-muted-foreground">Finalizado</Badge>
                        ) : teamStatus.isComplete ? (
                          <Badge className="bg-stable/20 text-stable border-stable/30 gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Equipe Completa
                          </Badge>
                        ) : (
                          <Badge className="bg-warning/20 text-warning border-warning/30 gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Equipe Incompleta ({teamStatus.size}/{teamStatus.minRequired})
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {format(new Date(event.data_inicio), "dd/MM/yyyy", { locale: ptBR })} das {format(new Date(event.data_inicio), "HH:mm")} às {format(new Date(event.data_fim), "HH:mm")}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {event.local}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-1"
                        onClick={() => navigate(`/admin/events/${event.id}`)}
                      >
                        <Eye className="w-4 h-4" />
                        Detalhes
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(event)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(event.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  {/* Progress Indicators */}
                  {teamStatus.size > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <LogIn className="w-4 h-4" />
                          Check-ins: <span className="font-medium text-foreground">{teamStatus.checkinCount}/{teamStatus.size}</span>
                        </span>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <LogOut className="w-4 h-4" />
                          Checkouts: <span className="font-medium text-foreground">{teamStatus.checkoutCount}/{teamStatus.size}</span>
                        </span>
                        {teamStatus.totalKm > 0 && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Navigation className="w-4 h-4" />
                            <span className="font-medium text-foreground">{teamStatus.totalKm} km</span>
                          </span>
                        )}
                      </div>
                      <Progress value={(() => {
                        if (event.status === 'finalizado') return 100;
                        const inicio = new Date(event.data_inicio).getTime();
                        const fim = new Date(event.data_fim).getTime();
                        if (now < inicio) return 0;
                        if (now > fim) return 100;
                        return ((now - inicio) / (fim - inicio)) * 100;
                      })()} className="h-1.5" />
                    </div>
                  )}
                  
                  {/* Team Badges */}
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
                        {a.checkin_at && !a.checkout_at && (
                          <span className="ml-1 text-stable">●</span>
                        )}
                        {a.checkout_at && (
                          <CheckCircle2 className="w-3 h-3 ml-1 text-stable" />
                        )}
                      </Badge>
                    ))}
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
