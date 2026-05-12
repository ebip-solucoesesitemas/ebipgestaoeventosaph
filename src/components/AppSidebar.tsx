import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import { NavLink } from "@/components/NavLink";
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
  Sun,
  Moon,
  MessageSquare,
  Bell,
  HeartPulse,
  Database,
} from "lucide-react";
import { useTheme } from "next-themes";
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
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface Base {
  id: string;
  nome: string;
  sigla: string;
}

interface MenuLink {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permissionKey?: string; // permission_key required to see this link
}

const commercialLinks: MenuLink[] = [
  { href: "/admin/clients", label: "Clientes", icon: Building2, permissionKey: "clients.view" },
  { href: "/admin/contract-templates", label: "Modelos de Contrato", icon: ClipboardList, permissionKey: "contracts.view" },
  { href: "/admin/finance", label: "Financeiro", icon: DollarSign, permissionKey: "finance.view" },
];

const configLinks: MenuLink[] = [
  { href: "/admin/users", label: "Usuários", icon: Users, permissionKey: "users.view" },
  { href: "/admin/permissions", label: "Permissões", icon: Shield, permissionKey: "users.manage" },
  { href: "/admin/bases", label: "Bases", icon: MapPin, permissionKey: "bases.view" },
  
  { href: "/admin/operational-rates", label: "Valores Operacionais", icon: Settings, permissionKey: "finance.manage" },
  { href: "/admin/regulation-phones", label: "Tel. Regulação", icon: Shield, permissionKey: "bases.view" },
  { href: "/admin/professional-report", label: "Relatórios", icon: ClipboardList, permissionKey: "professionals.view" },
  { href: "/admin/payroll", label: "Pagamentos", icon: Wallet, permissionKey: "payroll.view" },
  { href: "/admin/payroll-report", label: "Folha de Pagamento", icon: ClipboardList, permissionKey: "payroll.view" },
  ...(/* super-admin only */ [] as MenuLink[]),
  { href: "/admin/checklist", label: "Checklist (Itens)", icon: ClipboardList },
  { href: "/tickets", label: "Chamados", icon: MessageSquare },
];

const teamLinks: MenuLink[] = [
  { href: "/events", label: "Meus Eventos", icon: Calendar },
  { href: "/checklist", label: "Checklist", icon: ClipboardList },
  { href: "/tickets", label: "Chamados", icon: MessageSquare },
];

const getBaseLinks = (baseId: string): MenuLink[] => [
  { href: `/admin/base/${baseId}/events`, label: "Eventos", icon: Calendar, permissionKey: "events.view" },
  { href: `/admin/base/${baseId}/professionals`, label: "Profissionais", icon: Users, permissionKey: "professionals.view" },
  { href: `/admin/base/${baseId}/vehicles`, label: "Viaturas", icon: Truck, permissionKey: "vehicles.view" },
  { href: `/admin/base/${baseId}/finance`, label: "Financeiro", icon: DollarSign, permissionKey: "finance.view" },
  { href: `/admin/base/${baseId}/atendimentos`, label: "Atendimentos", icon: HeartPulse, permissionKey: "events.view" },
];

export function AppSidebar() {
  const { profile, signOut, isAdmin } = useAuth();
  const { hasPermission } = usePermissions();
  const location = useLocation();
  const [bases, setBases] = useState<Base[]>([]);
  const { theme, setTheme } = useTheme();

  const cargo = profile?.cargo;
  const isAdminCargo = cargo === "admin" || cargo === "admin_bnu" || cargo === "admin_fln" || cargo === "gestor" || profile?.hidden;
  const isOperacional = cargo === "operacional";
  const isGestor = cargo === "gestor";
  const showAdminMenu = isAdmin || isOperacional || isGestor;

  useEffect(() => {
    if (showAdminMenu) {
      let query = supabase
        .from("bases")
        .select("id, nome, sigla")
        .order("sigla");

      if (isOperacional && profile?.base_id) {
        query = query.eq("id", profile.base_id);
      }

      query.then(({ data }) => {
        setBases(data || []);
      });
    }
  }, [showAdminMenu, isOperacional, profile?.base_id]);

  const filterLinks = (links: MenuLink[]) => {
    if (isAdminCargo) return links;
    return links.filter((link) => {
      if (!link.permissionKey) return true;
      return hasPermission(link.permissionKey);
    });
  };

  const renderMenuItems = (links: MenuLink[]) => (
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

  const filteredCommercial = filterLinks(commercialLinks);
  const filteredConfig = filterLinks(configLinks);

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-sidebar-accent rounded-lg flex items-center justify-center shrink-0">
            <Ambulance className="w-5 h-5 text-sidebar-accent-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-sidebar-foreground truncate">EBIP EVENTOS</h1>
            <p className="text-xs text-sidebar-foreground/60">Gestão Pré-Hospitalar em eventos</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        {showAdminMenu ? (
          <>
            {/* Comercial */}
            {filteredCommercial.length > 0 && (
              <SidebarGroup>
                <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-[10px] tracking-wider font-semibold">
                  Comercial
                </SidebarGroupLabel>
                <SidebarGroupContent>{renderMenuItems(filteredCommercial)}</SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* Configurações */}
            {filteredConfig.length > 0 && (
              <SidebarGroup>
                <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-[10px] tracking-wider font-semibold">
                  Configurações
                </SidebarGroupLabel>
                <SidebarGroupContent>{renderMenuItems(filteredConfig)}</SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* Bases Descentralizadas */}
            {bases.length > 0 && hasPermission("bases.view") && (
              <SidebarGroup>
                <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-[10px] tracking-wider font-semibold">
                  Bases
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {bases.map((base) => {
                      const baseLinks = filterLinks(getBaseLinks(base.id));
                      if (baseLinks.length === 0) return null;
                      return (
                        <SidebarMenuItem key={base.id}>
                          <Collapsible defaultOpen={location.pathname.includes(`/base/${base.id}`)}>
                            <CollapsibleTrigger asChild>
                              <SidebarMenuButton className="w-full justify-between">
                                <span className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 shrink-0" />
                                  <span className="truncate">
                                    {base.sigla} - {base.nome}
                                  </span>
                                </span>
                                <ChevronDown className="h-3 w-3 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                              </SidebarMenuButton>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="pl-6 mt-1 space-y-0.5">
                                {baseLinks.map((bl) => (
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
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* Super-Admin Only */}
            {profile?.hidden && (
              <SidebarGroup>
                <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-[10px] tracking-wider font-semibold">
                  Super Admin
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  {renderMenuItems([
                    { href: "/admin/system-notices", label: "Avisos do Sistema", icon: Bell },
                    { href: "/admin/system-backup", label: "Sistema e Backup", icon: Database },
                  ])}
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </>
        ) : (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-[10px] tracking-wider font-semibold">
              Menu
            </SidebarGroupLabel>
            <SidebarGroupContent>{renderMenuItems(teamLinks)}</SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter className="p-3 space-y-2">
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
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 shrink-0"
            title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
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
