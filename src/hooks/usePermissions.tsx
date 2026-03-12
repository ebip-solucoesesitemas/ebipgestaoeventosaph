import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Permission {
  permission_key: string;
  enabled: boolean;
}

export function usePermissions() {
  const { profile } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const cargo = profile?.cargo;

  useEffect(() => {
    if (!cargo) {
      setPermissions([]);
      setIsLoaded(true);
      return;
    }

    const cargoTyped = cargo as "admin" | "equipe" | "gestor" | "admin_bnu" | "admin_fln" | "operacional";
    supabase
      .from("role_permissions")
      .select("permission_key, enabled")
      .eq("role", cargoTyped)
      .then(({ data, error }) => {
        if (!error && data) {
          setPermissions(data);
        }
        setIsLoaded(true);
      });
  }, [cargo]);

  const hasPermission = (key: string): boolean => {
    const adminCargos = ["admin", "admin_bnu", "admin_fln", "gestor"];
    if ((cargo && adminCargos.includes(cargo)) || profile?.hidden) {
      return true;
    }
    const perm = permissions.find((p) => p.permission_key === key);
    return perm?.enabled ?? false;
  };

  return { permissions, hasPermission, isLoaded };
}
