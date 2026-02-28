import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { NavLink } from '@/components/NavLink';
import {
  Ambulance,
  Calendar,
  Users,
  Truck,
  Shield,
  ClipboardList,
  Building2,
  DollarSign,
  Wallet,
  MapPin,
  ChevronDown,
  Settings,
  LogOut,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface Base {
  id: string;
  nome: string;
  sigla: string;
}


const commercialLinks = [
  { href: '/admin/clients', label: 'Clientes', icon: Building2 },
  { href: '/admin/contract-templates', label: 'Modelos de Contrato', icon: ClipboardList },
  { href: '/admin/finance', label: 'Financeiro', icon: DollarSign },
];

const configLinks = [
  { href: '/admin/users', label: 'Usuários', icon: Users },
  { href: '/admin/bases', label: 'Bases', icon: MapPin },
  { href: '/admin/professional-rates', label: 'Valores Profissionais', icon: DollarSign },
  { href: '/admin/operational-rates', label: 'Valores Operacionais', icon: Settings },
  { href: '/admin/regulation-phones', label: 'Tel. Regulação', icon: Shield },
  { href: '/admin/professional-report', label: 'Relatórios', icon: ClipboardList },
  { href: '/admin/payroll', label: 'Pagamentos', icon: Wallet },
  { href: '/admin/audit-logs', label: 'Logs de Auditoria', icon: Shield },
];

const teamLinks = [
  { href: '/events', label: 'Meus Eventos', icon: Calendar },
];

const getBaseLinks = (baseId: string) => [
  { href: `/admin/base/${baseId}/events`, label: 'Eventos', icon: Calendar },
  { href: `/admin/base/${baseId}/professionals`, label: 'Profissionais', icon: Users },
  { href: `/admin/base/${baseId}/vehicles`, label: 'Viaturas', icon: Truck },
  { href: `/admin/base/${baseId}/finance`, label: 'Financeiro', icon: DollarSign },
];

export function AppSidebar() {
  const { profile, signOut, isAdmin } = useAuth();
  const location = useLocation();
  const [bases, setBases] = useState<Base[]>([]);

  useEffect(() => {
    if (isAdmin) {
      supabase.from('bases').select('id, nome, sigla').order('sigla').then(({ data }) => {
        setBases(data || []);
      });
    }
  }, [isAdmin]);

  const renderMenuItems = (links: Array<{ href: string; label: string; icon: React.ComponentType<{ className?: string }> }>) => (
    <SidebarMenu>
      {links.map((link) => (
        <SidebarMenuItem key={link.href}>
          <SidebarMenuButton asChild>
            <NavLink
              to={link.href}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-sidebar-accent/50 transition-colors"
              activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
            >
              <link.icon className="h-4 w-4 shrink-0" />
              <span>{link.label}</span>
            </NavLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-sidebar-accent rounded-lg flex items-center justify-center shrink-0">
            <Ambulance className="w-5 h-5 text-sidebar-accent-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-sidebar-foreground truncate">APH System</h1>
            <p className="text-xs text-sidebar-foreground/60">Gestão Pré-Hospitalar</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        {isAdmin ? (
          <>
            {/* Comercial */}
            <SidebarGroup>
              <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-[10px] tracking-wider font-semibold">
                Comercial
              </SidebarGroupLabel>
              <SidebarGroupContent>
                {renderMenuItems(commercialLinks)}
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Configurações */}
            <SidebarGroup>
              <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-[10px] tracking-wider font-semibold">
                Configurações
              </SidebarGroupLabel>
              <SidebarGroupContent>
                {renderMenuItems(configLinks)}
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Bases Descentralizadas */}
            {bases.length > 0 && (
              <SidebarGroup>
                <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-[10px] tracking-wider font-semibold">
                  Bases
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {bases.map((base) => (
                      <SidebarMenuItem key={base.id}>
                        <Collapsible
                          defaultOpen={location.pathname.includes(`/base/${base.id}`)}
                        >
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton className="w-full justify-between">
                              <span className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 shrink-0" />
                                <span className="truncate">{base.sigla} - {base.nome}</span>
                              </span>
                              <ChevronDown className="h-3 w-3 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="pl-6 mt-1 space-y-0.5">
                              {getBaseLinks(base.id).map((bl) => (
                                <NavLink
                                  key={bl.href}
                                  to={bl.href}
                                  className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 transition-colors"
                                  activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                                >
                                  <bl.icon className="h-3.5 w-3.5 shrink-0" />
                                  <span>{bl.label}</span>
                                </NavLink>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </>
        ) : (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-[10px] tracking-wider font-semibold">
              Menu
            </SidebarGroupLabel>
            <SidebarGroupContent>
              {renderMenuItems(teamLinks)}
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter className="p-3">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{profile?.nome}</p>
            <p className="text-xs text-sidebar-foreground/60 flex items-center gap-1 truncate">
              {isAdmin && <Shield className="w-3 h-3 shrink-0" />}
              {profile?.especialidade}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => signOut()}
            className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
