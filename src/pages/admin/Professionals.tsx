import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { Users, Shield, Stethoscope, UserRound, Ambulance, Plus, Edit, Trash2, Key, Phone, MapPin, DollarSign, Search } from 'lucide-react';

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [rates, setRates] = useState<RateMap>({});
  const [bases, setBases] = useState<Base[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-open dialog when ?new=1 query param is present
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setDialogOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, []);
  const [searchFilter, setSearchFilter] = useState('');

  const [formData, setFormData] = useState({
    nome: '',
    especialidade: '',
    registro_profissional: '',
    cargo: 'equipe',
    cpf: '',
    telefone: '',
    chave_pix: '',
    base_id: '',
    valor_hora: '',
    valor_evento: '',
  });

  const saveProfessionalRates = async (profileId: string) => {
    const { error } = await supabase.from('professional_rates').upsert({
      profile_id: profileId,
      valor_hora: parseFloat(formData.valor_hora) || 0,
      valor_evento: parseFloat(formData.valor_evento) || 0,
    }, { onConflict: 'profile_id' });

    if (error) {
      throw error;
    }
  };

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
    setFormData({ nome: '', especialidade: '', registro_profissional: '', cargo: 'equipe', cpf: '', telefone: '', chave_pix: '', base_id: '', valor_hora: '', valor_evento: '' });
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
      valor_hora: rate?.valor_hora ? String(rate.valor_hora) : '',
      valor_evento: rate?.valor_evento ? String(rate.valor_evento) : '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        nome: formData.nome,
        especialidade: formData.especialidade as any,
        registro_profissional: formData.registro_profissional,
        cargo: formData.cargo as any,
        cpf: formData.cpf || null,
        telefone: formData.telefone || null,
        chave_pix: formData.chave_pix || null,
        base_id: formData.base_id || null,
      };

      if (editingProfile) {
        const { error } = await supabase
          .from('profiles')
          .update(payload)
          .eq('id', editingProfile.id);

        if (error) throw error;

        await saveProfessionalRates(editingProfile.id);
        toast({ title: 'Profissional atualizado!' });
      } else {
        const { data: createdProfile, error } = await supabase
          .from('profiles')
          .insert({
            user_id: null,
            ...payload,
          })
          .select('id')
          .single();

        if (error) throw error;

        await saveProfessionalRates(createdProfile.id);
        toast({ title: 'Profissional cadastrado com sucesso!' });
      }

      setDialogOpen(false);
      resetForm();
      fetchProfiles();
    } catch (error: any) {
      toast({
        title: editingProfile ? 'Erro ao atualizar' : 'Erro ao cadastrar',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
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

  const filteredProfiles = profiles.filter(p =>
    !searchFilter || p.nome.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Profissionais</h1>
          <p className="text-muted-foreground">Cadastre dados operacionais e financeiros; acessos ficam em Usuários</p>
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
                <Label>Telefone / Celular</Label>
                <Input
                  value={formData.telefone}
                  onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                  placeholder="(00) 00000-0000"
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

              <Button type="submit" className="w-full btn-touch" disabled={isSubmitting}>
                {isSubmitting ? 'Processando...' : editingProfile ? 'Salvar Alterações' : 'Cadastrar Profissional'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search filter */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar profissional por nome..."
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredProfiles.length === 0 ? (
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
          filteredProfiles.map((profile) => {
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
