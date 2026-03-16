import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, Calendar, MapPin, Truck, Users, Clock, 
  CheckCircle2, AlertCircle, Fuel, FileText, DollarSign,
  LogIn, LogOut, Navigation, Eye, X, Heart, Thermometer, User, Gauge, Save, Printer, Phone, Ambulance
} from 'lucide-react';
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
  user_id: string | null;
  equipe_minima: number;
  km_inicial: number | null;
  km_final: number | null;
  valor_litro_combustivel: number | null;
  consumo_medio_km_litro: number | null;
  vehicles?: {
    id: string;
    modelo: string;
    placa: string;
    prefixo: string;
  };
  responsible_profile?: {
    nome: string;
  } | null;
}

interface Assignment {
  id: string;
  profile_id: string;
  checkin_at: string | null;
  checkout_at: string | null;
  km_inicial: number | null;
  km_final: number | null;
  profiles: {
    id: string;
    nome: string;
    especialidade: string;
    telefone: string | null;
  };
}

interface VitalSign {
  id: string;
  horario: string | null;
  pa_sistolica: number | null;
  pa_diastolica: number | null;
  frequencia_cardiaca: number | null;
  frequencia_respiratoria: number | null;
  saturacao_o2: number | null;
  temperatura: number | null;
  glicemia: number | null;
}

interface Attendance {
  id: string;
  nome_paciente: string;
  idade: number | null;
  sexo: string | null;
  documento: string | null;
  queixa_principal: string;
  evolucao_clinica: string | null;
  status: string | null;
  created_at: string;
  profissional_id: string;
  hospital_destino: string | null;
  nome_receptor: string | null;
  crm_receptor: string | null;
  data_remocao: string | null;
  desfecho: string | null;
  profiles: {
    nome: string;
    especialidade: string;
  };
}

interface Expense {
  id: string;
  descricao: string;
  valor: number;
  categoria: string;
  data_despesa: string;
}

export default function AdminEventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [event, setEvent] = useState<Event | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Dialog state for viewing attendance details
  const [selectedAttendance, setSelectedAttendance] = useState<Attendance | null>(null);
  const [attendanceVitals, setAttendanceVitals] = useState<VitalSign[]>([]);
  const [loadingVitals, setLoadingVitals] = useState(false);

  // KM state
  const [kmInicial, setKmInicial] = useState('');
  const [kmFinal, setKmFinal] = useState('');
  const [isSavingKm, setIsSavingKm] = useState(false);

  const fetchData = async () => {
    if (!id) return;
    setIsLoading(true);

    try {
      const [eventRes, assignmentsRes, attendancesRes, expensesRes] = await Promise.all([
        supabase.from('events').select('*, vehicles(*)').eq('id', id).single() as any,
        supabase.from('event_assignments').select('*, profiles(id, nome, especialidade, telefone)').eq('event_id', id),
        supabase.from('clinical_attendances').select('*, profiles:profissional_id(nome, especialidade)').eq('event_id', id).order('created_at'),
        supabase.from('event_expenses').select('*').eq('event_id', id).order('data_despesa'),
      ]);

      if (eventRes.error) {
        console.error('Error loading event:', eventRes.error);
        toast({ title: 'Erro ao carregar evento', description: eventRes.error.message, variant: 'destructive' });
        navigate('/admin/events');
        return;
      }

      // Fetch responsible profile name if user_id exists
      let eventData = eventRes.data;
      if (eventData?.user_id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('nome')
          .eq('user_id', eventData.user_id)
          .single();
        eventData = { ...eventData, responsible_profile: profileData };
      }

      setEvent(eventData);
      setKmInicial(eventData.km_inicial?.toString() || '');
      setKmFinal(eventData.km_final?.toString() || '');
      setAssignments(assignmentsRes.data || []);
      setAttendances((attendancesRes.data as Attendance[]) || []);
      setExpenses(expensesRes.data || []);
    } catch (error) {
      console.error('Unexpected error loading event:', error);
      toast({ title: 'Erro inesperado', description: 'Não foi possível carregar o evento', variant: 'destructive' });
      navigate('/admin/events');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleViewAttendance = async (attendance: Attendance) => {
    setSelectedAttendance(attendance);
    setLoadingVitals(true);
    
    const { data } = await supabase
      .from('vital_signs')
      .select('*')
      .eq('attendance_id', attendance.id)
      .order('horario', { ascending: true });
    
    setAttendanceVitals(data || []);
    setLoadingVitals(false);
  };

  const handleSaveKm = async () => {
    if (!event) return;
    setIsSavingKm(true);

    const kmInicialNum = kmInicial ? parseFloat(kmInicial) : null;
    const kmFinalNum = kmFinal ? parseFloat(kmFinal) : null;

    if (kmInicialNum !== null && kmFinalNum !== null && kmFinalNum < kmInicialNum) {
      toast({ title: 'KM final deve ser maior que o inicial', variant: 'destructive' });
      setIsSavingKm(false);
      return;
    }

    const { error } = await supabase
      .from('events')
      .update({ km_inicial: kmInicialNum, km_final: kmFinalNum })
      .eq('id', event.id);

    if (error) {
      toast({ title: 'Erro ao salvar quilometragem', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Quilometragem salva!' });
      fetchData();
    }
    setIsSavingKm(false);
  };

  if (isLoading || !event) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Calculate statistics
  const checkinCount = assignments.filter(a => a.checkin_at).length;
  const checkoutCount = assignments.filter(a => a.checkout_at).length;
  
  // Use event-level KM
  const eventKmIni = event.km_inicial || 0;
  const eventKmFin = event.km_final || 0;
  const totalKm = eventKmFin > eventKmIni ? eventKmFin - eventKmIni : 0;
  
  const fuelCost = event.valor_litro_combustivel && event.consumo_medio_km_litro 
    ? (totalKm / event.consumo_medio_km_litro) * event.valor_litro_combustivel 
    : 0;

  const totalExpenses = expenses.reduce((sum, e) => sum + e.valor, 0);
  const checkinProgress = assignments.length > 0 ? (checkinCount / assignments.length) * 100 : 0;

  const getAssignmentStatus = (a: Assignment) => {
    if (a.checkout_at) return { label: 'Concluído', color: 'bg-stable/20 text-stable', icon: CheckCircle2 };
    if (a.checkin_at) return { label: 'Em campo', color: 'bg-primary/20 text-primary', icon: Clock };
    return { label: 'Aguardando', color: 'bg-muted text-muted-foreground', icon: AlertCircle };
  };

  const categoriaLabels: Record<string, string> = {
    combustivel: 'Combustível',
    equipamento: 'Equipamento',
    diaria: 'Diária',
    alimentacao: 'Alimentação',
    hospedagem: 'Hospedagem',
    transporte: 'Transporte',
    outros: 'Outros',
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/events')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{event.nome_evento}</h1>
            {event.status === 'finalizado' && (
              <Badge className="bg-muted text-muted-foreground">Finalizado</Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {format(new Date(event.data_inicio), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {event.local}
            </span>
            {event.vehicles && (
              <span className="flex items-center gap-1">
                <Truck className="w-4 h-4" />
                {event.vehicles.prefixo} - {event.vehicles.modelo}
              </span>
            )}
            {event.responsible_profile && (
              <span className="flex items-center gap-1">
                <User className="w-4 h-4" />
                Conta: {event.responsible_profile.nome}
              </span>
            )}
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-1 print-hide" onClick={() => window.open(`/evento/${event.id}/relatorio`, '_blank')}>
          <Printer className="w-4 h-4" />
          Relatório
        </Button>
      </div>

      {/* Finalize Event Button (Admin) */}
      {event.status !== 'finalizado' && (
        <Button
          className="w-full gap-2"
          variant="outline"
          onClick={async () => {
            const { error } = await supabase
              .from('events')
              .update({ status: 'finalizado' } as any)
              .eq('id', event.id);
            if (error) {
              toast({ title: 'Erro ao finalizar evento', description: error.message, variant: 'destructive' });
            } else {
              // Release vehicle back to available
              if (event.viatura_id) {
                await supabase
                  .from('vehicles')
                  .update({ status: 'disponivel' } as any)
                  .eq('id', event.viatura_id);
              }
              toast({ title: 'Evento finalizado com sucesso!' });
              fetchData();
            }
          }}
        >
          <CheckCircle2 className="w-5 h-5" />
          Finalizar Evento
        </Button>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{checkinCount}/{assignments.length}</div>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <LogIn className="w-3 h-3" /> Check-ins
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-stable">{checkoutCount}/{assignments.length}</div>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <LogOut className="w-3 h-3" /> Checkouts
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{totalKm}</div>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Navigation className="w-3 h-3" /> KM Total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-warning">
              R$ {fuelCost.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Fuel className="w-3 h-3" /> Combustível
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Vehicle Mileage Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Gauge className="w-4 h-4" />
            Quilometragem da Viatura
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                <Gauge className="w-3 h-3" />
                KM Inicial
              </Label>
              <Input
                type="number"
                value={kmInicial}
                onChange={(e) => setKmInicial(e.target.value)}
                placeholder="Ex: 45230"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1">
                <Gauge className="w-3 h-3" />
                KM Final
              </Label>
              <Input
                type="number"
                value={kmFinal}
                onChange={(e) => setKmFinal(e.target.value)}
                placeholder="Ex: 45350"
              />
            </div>
          </div>
          <Button
            onClick={handleSaveKm}
            disabled={isSavingKm}
            size="sm"
            className="w-full"
          >
            <Save className="w-4 h-4 mr-1" />
            {isSavingKm ? 'Salvando...' : 'Salvar Quilometragem'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Progresso da Equipe</span>
            <span className="font-medium">{checkinProgress.toFixed(0)}%</span>
          </div>
          <Progress value={checkinProgress} className="h-2" />
        </CardContent>
      </Card>

      {/* Team Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            Equipe Escalada ({assignments.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum profissional escalado</p>
          ) : (
            assignments.map((a) => {
              const status = getAssignmentStatus(a);
              const StatusIcon = status.icon;
              const kmRodado = a.km_inicial && a.km_final ? a.km_final - a.km_inicial : null;
              
              return (
                <div key={a.id} className="p-4 border rounded-xl bg-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{a.profiles.nome}</p>
                      <p className="text-sm text-muted-foreground">{a.profiles.especialidade}</p>
                      {a.profiles.telefone && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {a.profiles.telefone}
                        </p>
                      )}
                    </div>
                    <Badge className={`gap-1 ${status.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {status.label}
                    </Badge>
                  </div>
                  
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <LogIn className="w-4 h-4 text-muted-foreground" />
                      <span>
                        Check-in: {a.checkin_at 
                          ? format(new Date(a.checkin_at), "HH:mm", { locale: ptBR })
                          : '—'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <LogOut className="w-4 h-4 text-muted-foreground" />
                      <span>
                        Checkout: {a.checkout_at 
                          ? format(new Date(a.checkout_at), "HH:mm", { locale: ptBR })
                          : '—'}
                      </span>
                    </div>
                  </div>

                  {(a.km_inicial || a.km_final) && (
                    <div className="mt-2 p-2 bg-muted/50 rounded-lg text-sm flex items-center gap-2">
                      <Navigation className="w-4 h-4 text-muted-foreground" />
                      <span>
                        KM: {a.km_inicial?.toLocaleString() || '—'} → {a.km_final?.toLocaleString() || '—'}
                        {kmRodado !== null && (
                          <span className="font-medium text-primary ml-2">({kmRodado} km)</span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Attendances Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Atendimentos ({attendances.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {attendances.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum atendimento registrado</p>
          ) : (
            attendances.map((att) => (
              <div key={att.id} className="p-4 border rounded-xl bg-card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium">
                      {att.nome_paciente}
                      {att.idade && <span className="text-muted-foreground ml-1">({att.idade} anos)</span>}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">{att.queixa_principal}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={
                      att.status === 'finalizado' ? 'bg-stable/20 text-stable' : 
                      att.status === 'em_remocao' ? 'bg-destructive/20 text-destructive' : 
                      'bg-warning/20 text-warning'
                    }>
                      {att.status === 'finalizado' ? 'Finalizado' : 
                       att.status === 'em_remocao' ? (
                        <span className="flex items-center gap-1"><Ambulance className="w-3 h-3" />Em Remoção</span>
                       ) : 'Em andamento'}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleViewAttendance(att)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(new Date(att.created_at), "HH:mm", { locale: ptBR })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {att.profiles?.nome || 'N/A'}
                  </span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Expenses Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Despesas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma despesa registrada</p>
          ) : (
            <div className="space-y-2">
              {expenses.map((exp) => (
                <div key={exp.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{exp.descricao}</p>
                    <p className="text-xs text-muted-foreground">
                      {categoriaLabels[exp.categoria] || exp.categoria}
                    </p>
                  </div>
                  <span className="font-semibold">R$ {exp.valor.toFixed(2)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg font-semibold">
                <span>Total Despesas</span>
                <span>R$ {totalExpenses.toFixed(2)}</span>
              </div>
              {fuelCost > 0 && (
                <div className="flex items-center justify-between p-3 bg-warning/10 rounded-lg text-sm">
                  <span className="flex items-center gap-2">
                    <Fuel className="w-4 h-4" />
                    Combustível estimado ({totalKm} km)
                  </span>
                  <span className="font-semibold">R$ {fuelCost.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendance Details Dialog */}
      <Dialog open={!!selectedAttendance} onOpenChange={(open) => !open && setSelectedAttendance(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Detalhes do Atendimento
            </DialogTitle>
          </DialogHeader>
          
          {selectedAttendance && (
            <div className="space-y-4">
              {/* Patient Info */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <h3 className="font-semibold text-lg">{selectedAttendance.nome_paciente}</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {selectedAttendance.idade && (
                    <p><span className="text-muted-foreground">Idade:</span> {selectedAttendance.idade} anos</p>
                  )}
                  {selectedAttendance.sexo && (
                    <p><span className="text-muted-foreground">Sexo:</span> {selectedAttendance.sexo}</p>
                  )}
                  {selectedAttendance.documento && (
                    <p className="col-span-2"><span className="text-muted-foreground">Documento:</span> {selectedAttendance.documento}</p>
                  )}
                </div>
              </div>

              {/* Complaint */}
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Queixa Principal</h4>
                <p className="p-3 bg-muted/30 rounded-lg">{selectedAttendance.queixa_principal}</p>
              </div>

              {/* Vital Signs */}
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-1">
                  <Heart className="w-4 h-4" />
                  Sinais Vitais
                </h4>
                {loadingVitals ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                  </div>
                ) : attendanceVitals.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">Nenhum sinal vital registrado</p>
                ) : (
                  <div className="space-y-2">
                    {attendanceVitals.map((vital, idx) => (
                      <div key={vital.id} className="p-3 border rounded-lg bg-card">
                        <p className="text-xs text-muted-foreground mb-2">
                          {vital.horario ? format(new Date(vital.horario), "dd/MM 'às' HH:mm", { locale: ptBR }) : `Registro ${idx + 1}`}
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                          {vital.pa_sistolica && vital.pa_diastolica && (
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">PA:</span>
                              <span className="font-medium">{vital.pa_sistolica}/{vital.pa_diastolica}</span>
                            </div>
                          )}
                          {vital.frequencia_cardiaca && (
                            <div className="flex items-center gap-1">
                              <Heart className="w-3 h-3 text-destructive" />
                              <span className="font-medium">{vital.frequencia_cardiaca} bpm</span>
                            </div>
                          )}
                          {vital.frequencia_respiratoria && (
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">FR:</span>
                              <span className="font-medium">{vital.frequencia_respiratoria} irpm</span>
                            </div>
                          )}
                          {vital.saturacao_o2 && (
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">SpO2:</span>
                              <span className="font-medium">{vital.saturacao_o2}%</span>
                            </div>
                          )}
                          {vital.temperatura && (
                            <div className="flex items-center gap-1">
                              <Thermometer className="w-3 h-3 text-warning" />
                              <span className="font-medium">{vital.temperatura}°C</span>
                            </div>
                          )}
                          {vital.glicemia && (
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">Glicemia:</span>
                              <span className="font-medium">{vital.glicemia} mg/dL</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Clinical Evolution */}
              {selectedAttendance.evolucao_clinica && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Evolução Clínica</h4>
                  <p className="p-3 bg-muted/30 rounded-lg whitespace-pre-wrap">{selectedAttendance.evolucao_clinica}</p>
                </div>
              )}

              {/* Removal / Hospital Info */}
              {(selectedAttendance.status === 'em_remocao' || selectedAttendance.desfecho === 'removido') && (
                <div className="p-4 border-2 border-destructive/30 bg-destructive/5 rounded-lg space-y-2">
                  <h4 className="font-medium text-sm flex items-center gap-1 text-destructive">
                    <Ambulance className="w-4 h-4" />
                    Remoção Hospitalar
                  </h4>
                  {selectedAttendance.hospital_destino && (
                    <p className="text-sm"><span className="text-muted-foreground">Hospital:</span> {selectedAttendance.hospital_destino}</p>
                  )}
                  {selectedAttendance.nome_receptor && (
                    <p className="text-sm"><span className="text-muted-foreground">Receptor:</span> {selectedAttendance.nome_receptor}</p>
                  )}
                  {selectedAttendance.crm_receptor && (
                    <p className="text-sm"><span className="text-muted-foreground">CRM:</span> {selectedAttendance.crm_receptor}</p>
                  )}
                  {selectedAttendance.data_remocao && (
                    <p className="text-sm"><span className="text-muted-foreground">Data:</span> {format(new Date(selectedAttendance.data_remocao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                  )}
                </div>
              )}

              {/* Footer Info */}
              <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
                <span>Profissional: {selectedAttendance.profiles?.nome || 'N/A'}</span>
                <span>{format(new Date(selectedAttendance.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
