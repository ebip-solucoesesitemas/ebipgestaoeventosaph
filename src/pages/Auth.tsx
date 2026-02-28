import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Ambulance } from 'lucide-react';

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;

export default function Auth() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const failCount = useRef(0);
  const lockoutTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const startLockout = useCallback(() => {
    const until = Date.now() + LOCKOUT_SECONDS * 1000;
    setLockoutUntil(until);
    setLockoutRemaining(LOCKOUT_SECONDS);
    lockoutTimer.current = setInterval(() => {
      const remaining = Math.ceil((until - Date.now()) / 1000);
      if (remaining <= 0) {
        clearInterval(lockoutTimer.current!);
        lockoutTimer.current = null;
        setLockoutUntil(null);
        setLockoutRemaining(0);
        failCount.current = 0;
      } else {
        setLockoutRemaining(remaining);
      }
    }, 1000);
  }, []);

  const isLockedOut = lockoutUntil !== null && Date.now() < lockoutUntil;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLockedOut) return;

    setIsLoading(true);
    const { error } = await signIn(email, password);

    if (error) {
      failCount.current += 1;
      if (failCount.current >= MAX_ATTEMPTS) {
        startLockout();
        toast({
          title: 'Muitas tentativas',
          description: `Aguarde ${LOCKOUT_SECONDS} segundos antes de tentar novamente.`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erro ao entrar',
          description: error.message === 'Invalid login credentials'
            ? 'Email ou senha incorretos'
            : error.message,
          variant: 'destructive',
        });
      }
    } else {
      failCount.current = 0;
      toast({ title: 'Bem-vindo!', description: 'Login realizado com sucesso.' });
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
          <CardTitle className="text-2xl font-bold text-foreground">APH System</CardTitle>
          <CardDescription className="text-muted-foreground">
            Sistema de Gestão de Atendimento Pré-Hospitalar
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-touch"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-touch"
                required
              />
            </div>

            {isLockedOut && (
              <p className="text-sm text-destructive text-center font-medium">
                Muitas tentativas. Aguarde {lockoutRemaining}s...
              </p>
            )}

            <Button type="submit" className="w-full btn-touch" disabled={isLoading || isLockedOut}>
              {isLockedOut
                ? `Aguarde ${lockoutRemaining}s`
                : isLoading
                  ? 'Entrando...'
                  : 'Entrar'}
            </Button>

            <p className="text-xs text-center text-muted-foreground mt-4">
              Solicite seu acesso ao administrador do sistema
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}