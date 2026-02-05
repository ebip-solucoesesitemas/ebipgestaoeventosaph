import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Users, Shield, Stethoscope, UserRound, Ambulance, Plus, Edit, Trash2 } from 'lucide-react';

interface Profile {
  id: string;
  nome: string;
  especialidade: string;
  registro_profissional: string;
  cargo: string;
  user_id: string | null;
}

const especialidadeIcons: Record<string, typeof Stethoscope> = {
  'Médico': Stethoscope,
  'Enfermeiro': UserRound,
  'Técnico': UserRound,
  'Socorrista': Ambulance,
};

const especialidades = ['Médico', 'Enfermeiro', 'Técnico', 'Socorrista'];

export default function AdminProfessionals() {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);

  const [formData, setFormData] = useState({
    nome: '',
    especialidade: '',
    registro_profissional: '',
    cargo: 'equipe',
  });

  const fetchProfiles = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('nome');

    if (error) {
      toast({ title: 'Erro ao carregar', description: error.message, variant: 'destructive' });
    } else {
      setProfiles(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const resetForm = () => {
    setFormData({ nome: '', especialidade: '', registro_profissional: '', cargo: 'equipe' });
    setEditingProfile(null);
  };

  const openEditDialog = (profile: Profile) => {
    setEditingProfile(profile);
    setFormData({
      nome: profile.nome,
      especialidade: profile.especialidade,
      registro_profissional: profile.registro_profissional,
      cargo: profile.cargo,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      nome: formData.nome,
      especialidade: formData.especialidade as 'Médico' | 'Enfermeiro' | 'Técnico' | 'Socorrista',
      registro_profissional: formData.registro_profissional,
      cargo: formData.cargo as 'admin' | 'equipe',
    };

    if (editingProfile) {
      const { error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', editingProfile.id);

      if (error) {
        toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Profissional atualizado!' });
    } else {
      const { error } = await supabase.from('profiles').insert(payload);

      if (error) {
        toast({ title: 'Erro ao criar', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Profissional cadastrado!' });
    }

    setDialogOpen(false);
    resetForm();
    fetchProfiles();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este profissional?')) return;

    const { error } = await supabase.from('profiles').delete().eq('id', id);

    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Profissional excluído!' });
      fetchProfiles();
    }
  };

  const toggleCargo = async (profile: Profile) => {
    const newCargo = profile.cargo === 'admin' ? 'equipe' : 'admin';
    
    const { error } = await supabase
      .from('profiles')
      .update({ cargo: newCargo })
      .eq('id', profile.id);

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
          <DialogContent>
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
                <Label>Registro Profissional *</Label>
                <Input
                  value={formData.registro_profissional}
                  onChange={(e) => setFormData(prev => ({ ...prev, registro_profissional: e.target.value }))}
                  placeholder="Ex: CRM 12345"
                  required
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
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full btn-touch">
                {editingProfile ? 'Salvar Alterações' : 'Cadastrar'}
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
