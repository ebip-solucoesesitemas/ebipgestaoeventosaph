import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Ambulance, UserRound, Shield, Stethoscope } from 'lucide-react';

type Especialidade = 'Médico' | 'Enfermeiro' | 'Técnico' | 'Socorrista';
type Cargo = 'admin' | 'equipe';

export default function CompleteProfile() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [nome, setNome] = useState('');
  const [especialidade, setEspecialidade] = useState<Especialidade>('Socorrista');
  const [registroProfissional, setRegistroProfissional] = useState('');
  const [cargo, setCargo] = useState<Cargo>('equipe');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);

    const { error } = await supabase.from('profiles').insert({
      user_id: user.id,
      nome,
      especialidade,
      registro_profissional: registroProfissional,
      cargo,
    });

    if (error) {
      toast({
        title: 'Erro ao criar perfil',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Perfil criado!', description: 'Bem-vindo ao APH System.' });
      await refreshProfile();
      navigate('/');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
            <Ambulance className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">Completar Cadastro</CardTitle>
          <CardDescription className="text-muted-foreground">
            Precisamos de mais algumas informações para continuar
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo *</Label>
              <Input
                id="nome"
                placeholder="Dr. João Silva"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="input-touch"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Especialidade *</Label>
                <Select value={especialidade} onValueChange={(v) => setEspecialidade(v as Especialidade)}>
                  <SelectTrigger className="input-touch">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Médico">
                      <span className="flex items-center gap-2">
                        <Stethoscope className="w-4 h-4" /> Médico
                      </span>
                    </SelectItem>
                    <SelectItem value="Enfermeiro">
                      <span className="flex items-center gap-2">
                        <UserRound className="w-4 h-4" /> Enfermeiro
                      </span>
                    </SelectItem>
                    <SelectItem value="Técnico">
                      <span className="flex items-center gap-2">
                        <UserRound className="w-4 h-4" /> Técnico
                      </span>
                    </SelectItem>
                    <SelectItem value="Socorrista">
                      <span className="flex items-center gap-2">
                        <Ambulance className="w-4 h-4" /> Socorrista
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Cargo *</Label>
                <Select value={cargo} onValueChange={(v) => setCargo(v as Cargo)}>
                  <SelectTrigger className="input-touch">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equipe">Equipe</SelectItem>
                    <SelectItem value="admin">
                      <span className="flex items-center gap-2">
                        <Shield className="w-4 h-4" /> Admin
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="registro">Registro Profissional (CRM/COREN) *</Label>
              <Input
                id="registro"
                placeholder="CRM 12345/SP"
                value={registroProfissional}
                onChange={(e) => setRegistroProfissional(e.target.value)}
                className="input-touch"
                required
              />
            </div>

            <Button type="submit" className="w-full btn-touch" disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Completar Cadastro'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
