import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Users, Shield, Stethoscope, UserRound, Ambulance } from 'lucide-react';

interface Profile {
  id: string;
  nome: string;
  especialidade: string;
  registro_profissional: string;
  cargo: string;
  user_id: string;
}

const especialidadeIcons: Record<string, typeof Stethoscope> = {
  'Médico': Stethoscope,
  'Enfermeiro': UserRound,
  'Técnico': UserRound,
  'Socorrista': Ambulance,
};

export default function AdminProfessionals() {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profissionais</h1>
        <p className="text-muted-foreground">Gerencie a equipe médica</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {profiles.length === 0 ? (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum profissional cadastrado</p>
              <p className="text-sm text-muted-foreground mt-1">
                Profissionais são cadastrados ao criar uma conta no sistema
              </p>
            </CardContent>
          </Card>
        ) : (
          profiles.map((profile) => {
            const Icon = especialidadeIcons[profile.especialidade] || UserRound;
            return (
              <Card key={profile.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{profile.nome}</CardTitle>
                      <p className="text-sm text-muted-foreground">{profile.especialidade}</p>
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
