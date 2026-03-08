import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import TermsOfUse from '@/components/TermsOfUse';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Users, Truck, ClipboardList, Shield, ArrowRight, Building2, DollarSign, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Index() {
  const { user, profile, isLoading, isAdmin, signOut, needsTermsAcceptance } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return null;

  if (needsTermsAcceptance) {
    return <TermsOfUse />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center p-6">
          <div className="w-16 h-16 bg-warning/20 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-warning" />
          </div>
          <h2 className="text-xl font-bold">Perfil não encontrado</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            Sua conta ainda não possui um perfil vinculado. Entre em contato com o administrador para configurar seu acesso.
          </p>
          <Button variant="outline" onClick={() => signOut()}>
            Sair
          </Button>
        </div>
      </div>
    );
  }

  const adminCards = [
    {
      title: 'Eventos',
      description: 'Gerenciar eventos e escalas',
      icon: Calendar,
      href: '/admin/events',
      color: 'bg-primary',
    },
    {
      title: 'Profissionais',
      description: 'Gerenciar equipe médica',
      icon: Users,
      href: '/admin/professionals',
      color: 'bg-stable',
    },
    {
      title: 'Viaturas',
      description: 'Gerenciar frota',
      icon: Truck,
      href: '/admin/vehicles',
      color: 'bg-warning',
    },
    {
      title: 'Clientes',
      description: 'Empresas contratantes',
      icon: Building2,
      href: '/admin/clients',
      color: 'bg-accent',
    },
    {
      title: 'Financeiro',
      description: 'Receitas e despesas',
      icon: DollarSign,
      href: '/admin/finance',
      color: 'bg-stable',
    },
    {
      title: 'Pagamentos',
      description: 'Folha de pagamento',
      icon: Wallet,
      href: '/admin/payroll',
      color: 'bg-primary',
    },
  ];

  const teamCards = [
    {
      title: 'Meus Eventos',
      description: 'Ver eventos onde estou escalado',
      icon: Calendar,
      href: '/events',
      color: 'bg-primary',
    },
  ];

  const cards = isAdmin ? adminCards : teamCards;

  return (
    <Layout>
      <div className="space-y-6 animate-slide-up">
        {/* Welcome */}
        <div className="bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-6 text-primary-foreground">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-primary-foreground/80 text-sm">Bem-vindo(a),</p>
              <h1 className="text-2xl font-bold">{profile.nome}</h1>
              <p className="text-primary-foreground/80 flex items-center gap-1 mt-1">
                {isAdmin && <Shield className="w-4 h-4" />}
                {profile.especialidade} • {profile.registro_profissional}
              </p>
            </div>
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
              <ClipboardList className="w-7 h-7" />
            </div>
          </div>
        </div>

        {/* Quick Access */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Acesso Rápido</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {cards.map((card) => (
              <Link key={card.href} to={card.href}>
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group">
                  <CardHeader className="pb-2">
                    <div className={`w-12 h-12 ${card.color} rounded-xl flex items-center justify-center mb-2`}>
                      <card.icon className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle className="text-lg flex items-center justify-between">
                      {card.title}
                      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{card.description}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Admin Info */}
        {isAdmin && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 flex items-center gap-3">
              <Shield className="w-5 h-5 text-primary" />
              <p className="text-sm">
                Você tem acesso de <strong>Administrador</strong>. Gerencie eventos, profissionais e viaturas.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
