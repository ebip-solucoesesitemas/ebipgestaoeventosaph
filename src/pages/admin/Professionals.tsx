import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCPF } from '@/lib/masks';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Users, Shield, Stethoscope, UserRound, Ambulance, Plus, Edit, Trash2, Key, Phone, MapPin, DollarSign } from 'lucide-react';

interface Profile {
  id: string;
  nome: string;
  especialidade: string;
  registro_profissional: string;
  cargo: string;
  user_id: string | null;
  telefone: string | null;
  cpf: string | null;
  chave_pix: string | null;
  base_id: string | null;
}

interface RateMap {
  [profileId: string]: { id?: string; valor_hora: number; valor_evento: number };
}

interface Base {
  id: string;
  nome: string;
  sigla: string;
}

const especialidadeIcons: Record<string, typeof Stethoscope> = {
  'Médico': Stethoscope,
  'Enfermeiro': UserRound,
  'Técnico': UserRound,
  'Socorrista': Ambulance,
};

const especialidades = ['Médico', 'Enfermeiro', 'Técnico', 'Socorrista', 'VTR', 'Operacional'];

export default function AdminProfessionals() {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [rates, setRates] = useState<RateMap>({});
  const [bases, setBases] = useState<Base[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    nome: '',
    especialidade: '',
    registro_profissional: '',
    cargo: 'equipe',
    cpf: '',
    telefone: '',
    chave_pix: '',
    base_id: '',
    email: '',
    password: '',
    valor_hora: '',
    valor_evento: '',
  });

  const fetchProfiles = async () => {
    setIsLoading(true);
    const [profilesRes, ratesRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('hidden', false).eq('is_account_only', false).order('nome'),
      supabase.from('professional_rates').select('*'),
    ]);

    if (profilesRes.error) {
      toast({ title: 'Erro ao carregar', description: profilesRes.error.message, variant: 'destructive' });
    } else {
      setProfiles(profilesRes.data || []);
    }

    const ratesMap: RateMap = {};
    ratesRes.data?.forEach((r) => {
      ratesMap[r.profile_id] = { id: r.id, valor_hora: r.valor_hora, valor_evento: r.valor_evento };
    });
    setRates(ratesMap);
    setIsLoading(false);
  };

  const fetchBases = async () => {
    const { data } = await supabase.from('bases').select('id, nome, sigla').order('nome');
    setBases(data || []);
  };

  useEffect(() => {
    fetchProfiles();
    fetchBases();
  }, []);

  const resetForm = () => {
    setFormData({ nome: '', especialidade: '', registro_profissional: '', cargo: 'equipe', cpf: '', telefone: '', chave_pix: '', base_id: '', email: '', password: '', valor_hora: '', valor_evento: '' });
    setEditingProfile(null);
  };

  const openEditDialog = (profile: Profile) => {
    const rate = rates[profile.id];
    setEditingProfile(profile);
    setFormData({
      nome: profile.nome,
      especialidade: profile.especialidade,
      registro_profissional: profile.registro_profissional,
      cargo: profile.cargo,
      cpf: profile.cpf || '',
      telefone: profile.telefone || '',
      chave_pix: profile.chave_pix || '',
      base_id: profile.base_id || '',
      email: '',
      password: '',
      valor_hora: rate?.valor_hora ? String(rate.valor_hora) : '',
      valor_evento: rate?.valor_evento ? String(rate.valor_evento) : '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (editingProfile) {
      // Update existing profile
      const payload = {
        nome: formData.nome,
        especialidade: formData.especialidade as 'Médico' | 'Enfermeiro' | 'Técnico' | 'Socorrista',
        registro_profissional: formData.registro_profissional,
        cargo: formData.cargo as 'admin' | 'equipe',
        cpf: formData.cpf || null,
        telefone: formData.telefone || null,
        chave_pix: formData.chave_pix || null,
        base_id: formData.base_id || null,
      };

      const { error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', editingProfile.id);

      if (error) {
        toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
        setIsSubmitting(false);
        return;
      }

      // Upsert rates
      const ratePayload = {
        profile_id: editingProfile.id,
        valor_hora: parseFloat(formData.valor_hora) || 0,
        valor_evento: parseFloat(formData.valor_evento) || 0,
      };
      await supabase.from('professional_rates').upsert(ratePayload, { onConflict: 'profile_id' });

      toast({ title: 'Profissional atualizado!' });
    } else {
      // If email and password provided, create user + profile via edge function
      if (formData.email && formData.password) {
        if (formData.password.length < 6) {
          toast({ title: 'Senha deve ter no mínimo 6 caracteres', variant: 'destructive' });
          setIsSubmitting(false);
          return;
        }

        const { data, error } = await supabase.functions.invoke('create-user', {
          body: {
            email: formData.email,
            password: formData.password,
            profileData: {
              nome: formData.nome,
              especialidade: formData.especialidade,
              registro_profissional: formData.registro_profissional,
              cargo: formData.cargo,
            },
          },
        });

        if (error) {
          toast({ title: 'Erro ao criar usuário', description: error.message, variant: 'destructive' });
          setIsSubmitting(false);
          return;
        }

        if (data?.error) {
          toast({ title: 'Erro ao criar usuário', description: data.error, variant: 'destructive' });
          setIsSubmitting(false);
          return;
        }

        // Save rates for the new profile created via edge function
        if (data?.profileId && (formData.valor_hora || formData.valor_evento)) {
          await supabase.from('professional_rates').upsert({
            profile_id: data.profileId,
            valor_hora: parseFloat(formData.valor_hora) || 0,
            valor_evento: parseFloat(formData.valor_evento) || 0,
          }, { onConflict: 'profile_id' });
        }
        toast({ title: 'Profissional cadastrado com sucesso!', description: `Login: ${formData.email}` });
      } else {
        // Insert profile directly without auth user
        const { error } = await supabase.from('profiles').insert({
          user_id: null,
          nome: formData.nome,
          especialidade: formData.especialidade as any,
          registro_profissional: formData.registro_profissional || '',
          cargo: formData.cargo as any,
          cpf: formData.cpf || null,
          telefone: formData.telefone || null,
          chave_pix: formData.chave_pix || null,
          base_id: formData.base_id || null,
        });

        if (error) {
          toast({ title: 'Erro ao cadastrar', description: error.message, variant: 'destructive' });
          setIsSubmitting(false);
          return;
        }

        // Save rates: need to find the newly created profile
        if (formData.valor_hora || formData.valor_evento) {
          const { data: newProfiles } = await supabase.from('profiles').select('id').eq('nome', formData.nome).eq('user_id', null as any).order('created_at', { ascending: false }).limit(1);
          if (newProfiles?.[0]) {
            await supabase.from('professional_rates').upsert({
              profile_id: newProfiles[0].id,
              valor_hora: parseFloat(formData.valor_hora) || 0,
              valor_evento: parseFloat(formData.valor_evento) || 0,
            }, { onConflict: 'profile_id' });
          }
        }

        toast({ title: 'Profissional cadastrado com sucesso!' });
      }
    }

    setDialogOpen(false);
    resetForm();
    fetchProfiles();
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este profissional? Isso também removerá o acesso ao sistema.')) return;

    const { data, error } = await supabase.functions.invoke('delete-user', {
      body: { profileId: id },
    });

    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
      return;
    }

    if (data?.error) {
      toast({ title: 'Erro ao excluir', description: data.error, variant: 'destructive' });
      return;
    }

    toast({ title: 'Profissional excluído!' });
    fetchProfiles();
  };

  const toggleCargo = async (profile: Profile) => {
    const newCargo = profile.cargo === 'admin' ? 'equipe' : 'admin';
    
    const { error } = await (supabase.rpc as any)('toggle_user_role', {
      p_profile_id: profile.id,
    });

    if (error) {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: `Cargo alterado para ${newCargo}` });
      fetchProfiles();
    }
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
          <h1 className="text-2xl font-bold text-foreground">Profissionais</h1>
          <p className="text-muted-foreground">Gerencie a equipe médica</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="btn-touch gap-2">
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Novo Profissional</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProfile ? 'Editar Profissional' : 'Novo Profissional'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome Completo *</Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Ex: Dr. João Silva"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Especialidade *</Label>
                <Select
                  value={formData.especialidade}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, especialidade: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a especialidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {especialidades.map((esp) => (
                      <SelectItem key={esp} value={esp}>{esp}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Registro Profissional</Label>
                <Input
                  value={formData.registro_profissional}
                  onChange={(e) => setFormData(prev => ({ ...prev, registro_profissional: e.target.value }))}
                  placeholder="Ex: CRM 12345"
                />
              </div>

              <div className="space-y-2">
                <Label>CPF</Label>
                <Input
                  value={formData.cpf}
                  onChange={(e) => setFormData(prev => ({ ...prev, cpf: e.target.value }))}
                  onBlur={(e) => setFormData(prev => ({ ...prev, cpf: formatCPF(e.target.value) }))}
                  placeholder="000.000.000-00"
                />
              </div>

              <div className="space-y-2">
                <Label>Chave PIX</Label>
                <Input
                  value={formData.chave_pix}
                  onChange={(e) => setFormData(prev => ({ ...prev, chave_pix: e.target.value }))}
                  placeholder="CPF, email, telefone ou chave aleatória"
                />
              </div>

              <div className="space-y-2">
                <Label>Cargo</Label>
                <Select
                  value={formData.cargo}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, cargo: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equipe">Equipe</SelectItem>
                    <SelectItem value="gestor">Gestor</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="admin_bnu">Admin BNU</SelectItem>
                    <SelectItem value="admin_fln">Admin FLN</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Base</Label>
                <Select
                  value={formData.base_id}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, base_id: v === '_none' ? '' : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a base (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Nenhuma</SelectItem>
                    {bases.map((base) => (
                      <SelectItem key={base.id} value={base.id}>{base.nome} ({base.sigla})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t pt-4 mt-4">
                <div className="flex items-center gap-2 mb-3 text-sm font-medium text-muted-foreground">
                  <DollarSign className="w-4 h-4" />
                  Valores de Pagamento
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Valor por Hora (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.valor_hora}
                      onChange={(e) => setFormData(prev => ({ ...prev, valor_hora: e.target.value }))}
                      placeholder="0,00"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Valor por Evento (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.valor_evento}
                      onChange={(e) => setFormData(prev => ({ ...prev, valor_evento: e.target.value }))}
                      placeholder="0,00"
                    />
                  </div>
                </div>
              </div>

              {!editingProfile && (
                <>
                  <div className="border-t pt-4 mt-4">
                    <div className="flex items-center gap-2 mb-3 text-sm font-medium text-muted-foreground">
                      <Key className="w-4 h-4" />
                      Credenciais de Acesso (opcional)
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      Preencha apenas se o profissional precisar de login no sistema
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Email de Login</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="profissional@email.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Senha</Label>
                    <Input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Mínimo 6 caracteres"
                      minLength={6}
                    />
                    <p className="text-xs text-muted-foreground">
                      Informe esta senha ao profissional para ele fazer login
                    </p>
                  </div>
                </>
              )}

              <Button type="submit" className="w-full btn-touch" disabled={isSubmitting}>
                {isSubmitting ? 'Processando...' : editingProfile ? 'Salvar Alterações' : 'Cadastrar Profissional'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {profiles.length === 0 ? (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum profissional cadastrado</p>
              <p className="text-sm text-muted-foreground mt-1">
                Clique em "Novo Profissional" para adicionar
              </p>
            </CardContent>
          </Card>
        ) : (
          profiles.map((profile) => {
            const Icon = especialidadeIcons[profile.especialidade] || UserRound;
            return (
              <Card key={profile.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">{profile.nome}</CardTitle>
                        <p className="text-sm text-muted-foreground">{profile.especialidade}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(profile)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(profile.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {profile.registro_profissional}
                  </p>
                  {profile.cpf && (
                    <p className="text-sm text-muted-foreground">CPF: {profile.cpf}</p>
                  )}
                  {(rates[profile.id]?.valor_hora > 0 || rates[profile.id]?.valor_evento > 0) && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <DollarSign className="w-3 h-3 text-muted-foreground" />
                      {rates[profile.id]?.valor_hora > 0 && (
                        <Badge variant="outline" className="text-xs">R$ {rates[profile.id].valor_hora.toFixed(2)}/h</Badge>
                      )}
                      {rates[profile.id]?.valor_evento > 0 && (
                        <Badge variant="outline" className="text-xs">R$ {rates[profile.id].valor_evento.toFixed(2)}/evento</Badge>
                      )}
                    </div>
                  )}
                  {profile.chave_pix && (
                    <p className="text-sm text-muted-foreground">PIX: {profile.chave_pix}</p>
                  )}
                  {profile.telefone && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {profile.telefone}
                    </p>
                  )}
                  {profile.base_id && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {bases.find(b => b.id === profile.base_id)?.nome || 'Base'}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    {profile.user_id ? (
                      <Badge variant="outline" className="text-xs">
                        <Key className="w-3 h-3 mr-1" />
                        Com acesso
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        Sem login
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant={profile.cargo === 'admin' ? 'default' : 'secondary'}>
                      {profile.cargo === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                      {profile.cargo === 'admin' ? 'Administrador' : 'Equipe'}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleCargo(profile)}
                    >
                      {profile.cargo === 'admin' ? 'Remover Admin' : 'Tornar Admin'}
                    </Button>
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
