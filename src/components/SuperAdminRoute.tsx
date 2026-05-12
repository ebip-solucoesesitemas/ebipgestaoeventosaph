import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";

export default function SuperAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, profile } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!profile?.hidden) return <Navigate to="/events" replace />;

  return <Layout>{children}</Layout>;
}
