import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Users, Settings } from "lucide-react";

interface Permission {
  id: string;
  role: string;
  permission_key: string;
  enabled: boolean;
}

// Permissions only visible to super admin (hidden profiles)
const superAdminOnlyKeys = new Set(["audit_logs.view", "settings.manage"]);

const permissionLabels: Record<string, { label: string; group: string }> = {
  "events.view": { label: "Visualizar Eventos", group: "Eventos" },
  "events.manage": { label: "Gerenciar Eventos", group: "Eventos" },
  "events.report": { label: "Relatório de Eventos", group: "Eventos" },
  "professionals.view": { label: "Visualizar Profissionais", group: "Profissionais" },
  "professionals.manage": { label: "Gerenciar Profissionais", group: "Profissionais" },
  "vehicles.view": { label: "Visualizar Viaturas", group: "Viaturas" },
  "vehicles.manage": { label: "Gerenciar Viaturas", group: "Viaturas" },
  "clients.view": { label: "Visualizar Clientes", group: "Clientes" },
  "clients.manage": { label: "Gerenciar Clientes", group: "Clientes" },
  "finance.view": { label: "Visualizar Financeiro", group: "Financeiro" },
  "finance.manage": { label: "Gerenciar Financeiro", group: "Financeiro" },
  "payroll.view": { label: "Visualizar Pagamentos", group: "Pagamentos" },
  "payroll.manage": { label: "Gerenciar Pagamentos", group: "Pagamentos" },
  "users.view": { label: "Visualizar Usuários", group: "Usuários" },
  "users.manage": { label: "Gerenciar Usuários", group: "Usuários" },
  "bases.view": { label: "Visualizar Bases", group: "Bases" },
  "bases.manage": { label: "Gerenciar Bases", group: "Bases" },
  "contracts.view": { label: "Visualizar Contratos", group: "Contratos" },
  "contracts.manage": { label: "Gerenciar Contratos", group: "Contratos" },
  "audit_logs.view": { label: "Visualizar Logs de Auditoria", group: "Sistema" },
  "settings.manage": { label: "Gerenciar Configurações", group: "Sistema" },
};

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  gestor: "Gestor",
  equipe: "Equipe",
  operacional: "Operacional",
};

export default function Permissions() {
  const { toast } = useToast();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("admin");

  const isSuperAdmin = profile?.hidden === true;

  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ["role-permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("*")
        .order("permission_key");
      if (error) throw error;
      return data as Permission[];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from("role_permissions")
        .update({ enabled, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-permissions"] });
      toast({ title: "Permissão atualizada" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar permissão", variant: "destructive" });
    },
  });

  const rolePermissions = permissions.filter((p) => p.role === activeTab);

  // Filter out super-admin-only permissions for non-super-admins
  const visiblePermissions = isSuperAdmin
    ? rolePermissions
    : rolePermissions.filter((p) => !superAdminOnlyKeys.has(p.permission_key));

  // Group by category
  const grouped = visiblePermissions.reduce<Record<string, Permission[]>>((acc, perm) => {
    const group = permissionLabels[perm.permission_key]?.group || "Outros";
    if (!acc[group]) acc[group] = [];
    acc[group].push(perm);
    return acc;
  }, {});

  const enabledCount = visiblePermissions.filter((p) => p.enabled).length;
  const totalCount = visiblePermissions.length;

  // Admin can edit permissions, Gestor is locked
  const isEditable = (role: string) => {
    if (role === "gestor" || role === "equipe" || role === "operacional") return true;
    if (role === "admin" && isSuperAdmin) return true;
    return false;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6" /> Permissões
        </h1>
        <p className="text-muted-foreground text-sm">
          Gerencie o acesso de cada cargo às funcionalidades do sistema
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 max-w-lg">
          <TabsTrigger value="admin" className="gap-1.5">
            <Shield className="h-3.5 w-3.5" /> Admin
          </TabsTrigger>
          <TabsTrigger value="gestor" className="gap-1.5">
            <Settings className="h-3.5 w-3.5" /> Gestor
          </TabsTrigger>
          <TabsTrigger value="equipe" className="gap-1.5">
            <Users className="h-3.5 w-3.5" /> Equipe
          </TabsTrigger>
          <TabsTrigger value="operacional" className="gap-1.5">
            <Users className="h-3.5 w-3.5" /> Operacional
          </TabsTrigger>
        </TabsList>

        {["admin", "gestor", "equipe", "operacional"].map((role) => (
          <TabsContent key={role} value={role} className="space-y-4 mt-4">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-sm px-3 py-1">
                {roleLabels[role]}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {enabledCount} de {totalCount} permissões ativas
              </span>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : (
              Object.entries(grouped).map(([group, perms]) => (
                <Card key={group}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{group}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {perms.map((perm) => (
                      <div
                        key={perm.id}
                        className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {permissionLabels[perm.permission_key]?.label || perm.permission_key}
                          </p>
                          <p className="text-xs text-muted-foreground">{perm.permission_key}</p>
                        </div>
                        <Switch
                          checked={perm.enabled}
                          onCheckedChange={(checked) =>
                            toggleMutation.mutate({ id: perm.id, enabled: checked })
                          }
                          disabled={!isEditable(role)}
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))
            )}

            {role === "admin" && !isSuperAdmin && (
              <p className="text-sm text-muted-foreground italic">
                ⚠️ Permissões do Administrador só podem ser alteradas pelo super admin.
              </p>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
