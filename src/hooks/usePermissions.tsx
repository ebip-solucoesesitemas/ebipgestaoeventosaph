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

    supabase
      .from("role_permissions")
      .select("permission_key, enabled")
      .eq("role", cargo)
      .then(({ data, error }) => {
        if (!error && data) {
          setPermissions(data);
        }
        setIsLoaded(true);
      });
  }, [cargo]);

  const hasPermission = (key: string): boolean => {
    // Super admin and admin cargo always have all permissions
    if (cargo === "admin" || cargo === "admin_bnu" || cargo === "admin_fln" || profile?.hidden) {
      return true;
    }
    const perm = permissions.find((p) => p.permission_key === key);
    return perm?.enabled ?? false;
  };

  return { permissions, hasPermission, isLoaded };
}
