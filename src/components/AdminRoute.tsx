import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";

const OPERACIONAL_LIKE_CARGOS = ["operacional", "gestor"];

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, isLoading, profile } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const cargo = profile?.cargo;
  const hasAdminAccess = isAdmin || (cargo && OPERACIONAL_LIKE_CARGOS.includes(cargo));

  if (!hasAdminAccess) return <Navigate to="/events" replace />;

  return <Layout>{children}</Layout>;
}
