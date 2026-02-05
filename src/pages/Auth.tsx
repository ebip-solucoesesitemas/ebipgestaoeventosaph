import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Ambulance, UserRound, Shield, Stethoscope } from 'lucide-react';

type Especialidade = 'Médico' | 'Enfermeiro' | 'Técnico' | 'Socorrista';
type Cargo = 'admin' | 'equipe';

export default function Auth() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [nome, setNome] = useState('');
  const [especialidade, setEspecialidade] = useState<Especialidade>('Socorrista');
  const [registroProfissional, setRegistroProfissional] = useState('');
  const [cargo, setCargo] = useState<Cargo>('equipe');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(loginEmail, loginPassword);

    if (error) {
      toast({
        title: 'Erro ao entrar',
        description: error.message === 'Invalid login credentials' 
          ? 'Email ou senha incorretos' 
          : error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Bem-vindo!', description: 'Login realizado com sucesso.' });
      navigate('/');
    }

    setIsLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!nome || !registroProfissional) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos para cadastro.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    const { error } = await signUp(signupEmail, signupPassword, {
      nome,
      especialidade,
      registro_profissional: registroProfissional,
      cargo,
    });

    if (error) {
      toast({
        title: 'Erro no cadastro',
        description: error.message.includes('already registered')
          ? 'Este email já está cadastrado'
          : error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Cadastro iniciado!',
        description: 'Verifique seu email para confirmar. Depois faça login e complete seu cadastro.',
      });
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
          <CardTitle className="text-2xl font-bold text-foreground">APH System</CardTitle>
          <CardDescription className="text-muted-foreground">
            Sistema de Gestão de Atendimento Pré-Hospitalar
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login" className="text-sm font-medium">Entrar</TabsTrigger>
              <TabsTrigger value="signup" className="text-sm font-medium">Cadastrar</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="input-touch"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Senha</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="input-touch"
                    required
                  />
                </div>
                <Button type="submit" className="w-full btn-touch" disabled={isLoading}>
                  {isLoading ? 'Entrando...' : 'Entrar'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-nome">Nome Completo</Label>
                  <Input
                    id="signup-nome"
                    placeholder="Dr. João Silva"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="input-touch"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Especialidade</Label>
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
                    <Label>Cargo</Label>
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
                  <Label htmlFor="registro">Registro Profissional (CRM/COREN)</Label>
                  <Input
                    id="registro"
                    placeholder="CRM 12345/SP"
                    value={registroProfissional}
                    onChange={(e) => setRegistroProfissional(e.target.value)}
                    className="input-touch"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="input-touch"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="input-touch"
                    minLength={6}
                    required
                  />
                </div>

                <Button type="submit" className="w-full btn-touch" disabled={isLoading}>
                  {isLoading ? 'Cadastrando...' : 'Cadastrar'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
