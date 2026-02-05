import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import CompleteProfile from "./pages/CompleteProfile";
import AdminEvents from "./pages/admin/Events";
import AdminProfessionals from "./pages/admin/Professionals";
import AdminVehicles from "./pages/admin/Vehicles";
import AdminClients from "./pages/admin/Clients";
import AdminFinance from "./pages/admin/Finance";
import AdminPayroll from "./pages/admin/Payroll";
import AdminProfessionalRates from "./pages/admin/ProfessionalRates";
import AdminProfessionalReport from "./pages/admin/ProfessionalReport";
import TeamEvents from "./pages/team/TeamEvents";
import EventDetail from "./pages/team/EventDetail";
import NotFound from "./pages/NotFound";
import Layout from "@/components/Layout";

const queryClient = new QueryClient();

// Protected route wrapper for admin pages
const AdminLayout = ({ children }: { children: React.ReactNode }) => (
  <Layout>{children}</Layout>
);

// Protected route wrapper for team pages
const TeamLayout = ({ children }: { children: React.ReactNode }) => (
  <Layout>{children}</Layout>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/complete-profile" element={<CompleteProfile />} />
            
            {/* Admin Routes */}
            <Route path="/admin/events" element={<AdminLayout><AdminEvents /></AdminLayout>} />
            <Route path="/admin/professionals" element={<AdminLayout><AdminProfessionals /></AdminLayout>} />
            <Route path="/admin/vehicles" element={<AdminLayout><AdminVehicles /></AdminLayout>} />
            <Route path="/admin/clients" element={<AdminLayout><AdminClients /></AdminLayout>} />
            <Route path="/admin/finance" element={<AdminLayout><AdminFinance /></AdminLayout>} />
            <Route path="/admin/payroll" element={<AdminLayout><AdminPayroll /></AdminLayout>} />
            <Route path="/admin/professional-rates" element={<AdminLayout><AdminProfessionalRates /></AdminLayout>} />
            <Route path="/admin/professional-report" element={<AdminLayout><AdminProfessionalReport /></AdminLayout>} />
            
            {/* Team Routes */}
            <Route path="/events" element={<TeamLayout><TeamEvents /></TeamLayout>} />
            <Route path="/events/:id" element={<TeamLayout><EventDetail /></TeamLayout>} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
