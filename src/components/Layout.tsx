import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Ambulance,
  Calendar,
  Users,
  Truck,
  LogOut,
  Menu,
  X,
  Shield,
  ClipboardList,
} from 'lucide-react';
import { useState } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { profile, signOut, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const adminLinks = [
    { href: '/admin/events', label: 'Eventos', icon: Calendar },
    { href: '/admin/professionals', label: 'Profissionais', icon: Users },
    { href: '/admin/vehicles', label: 'Viaturas', icon: Truck },
  ];

  const teamLinks = [
    { href: '/events', label: 'Meus Eventos', icon: Calendar },
  ];

  const links = isAdmin ? adminLinks : teamLinks;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-primary shadow-lg">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Ambulance className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-primary-foreground">APH System</h1>
              <p className="text-xs text-primary-foreground/70">Gestão Pré-Hospitalar</p>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {links.map((link) => (
              <Link key={link.href} to={link.href}>
                <Button
                  variant="ghost"
                  className={cn(
                    'text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10',
                    location.pathname.startsWith(link.href) && 'bg-white/20 text-primary-foreground'
                  )}
                >
                  <link.icon className="w-4 h-4 mr-2" />
                  {link.label}
                </Button>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {/* User Info */}
            <div className="hidden sm:flex items-center gap-2 text-primary-foreground">
              <div className="text-right">
                <p className="text-sm font-medium">{profile?.nome}</p>
                <p className="text-xs text-primary-foreground/70 flex items-center gap-1">
                  {isAdmin && <Shield className="w-3 h-3" />}
                  {profile?.especialidade}
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              className="text-primary-foreground hover:bg-white/10"
            >
              <LogOut className="w-5 h-5" />
            </Button>

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-primary-foreground hover:bg-white/10"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-white/10 bg-primary pb-4">
            <div className="container space-y-1 pt-2">
              {links.map((link) => (
                <Link key={link.href} to={link.href} onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    variant="ghost"
                    className={cn(
                      'w-full justify-start text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10',
                      location.pathname.startsWith(link.href) && 'bg-white/20 text-primary-foreground'
                    )}
                  >
                    <link.icon className="w-5 h-5 mr-3" />
                    {link.label}
                  </Button>
                </Link>
              ))}
              <div className="pt-2 px-4 border-t border-white/10 mt-2">
                <p className="text-sm text-primary-foreground">{profile?.nome}</p>
                <p className="text-xs text-primary-foreground/70">{profile?.especialidade}</p>
              </div>
            </div>
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main className="container py-6">{children}</main>
    </div>
  );
}
