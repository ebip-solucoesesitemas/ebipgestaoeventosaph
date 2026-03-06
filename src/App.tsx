import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AdminEvents from "./pages/admin/Events";
import AdminEventDetail from "./pages/admin/EventDetail";
import AdminProfessionals from "./pages/admin/Professionals";
import AdminVehicles from "./pages/admin/Vehicles";
import AdminClients from "./pages/admin/Clients";
import AdminFinance from "./pages/admin/Finance";
import AdminPayroll from "./pages/admin/Payroll";
import AdminProfessionalRates from "./pages/admin/ProfessionalRates";
import AdminProfessionalReport from "./pages/admin/ProfessionalReport";
import AdminOperationalRates from "./pages/admin/OperationalRates";
import AdminBases from "./pages/admin/Bases";
import AdminUsers from "./pages/admin/Users";
import AdminContractTemplates from "./pages/admin/ContractTemplates";
import AdminRegulationPhones from "./pages/admin/RegulationPhones";
import AdminAuditLogs from "./pages/admin/AuditLogs";
import AdminPermissions from "./pages/admin/Permissions";
import AdminPayrollReport from "./pages/admin/PayrollReport";
import BaseEvents from "./pages/admin/base/BaseEvents";
import BaseProfessionals from "./pages/admin/base/BaseProfessionals";
import BaseVehicles from "./pages/admin/base/BaseVehicles";
import BaseFinance from "./pages/admin/base/BaseFinance";
import TeamEvents from "./pages/team/TeamEvents";
import TeamEventDetail from "./pages/team/EventDetail";
import EventReportPage from "./pages/EventReportPage";
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
            
            {/* Admin Routes */}
            <Route path="/admin/events" element={<AdminLayout><AdminEvents /></AdminLayout>} />
            <Route path="/admin/events/:id" element={<AdminLayout><AdminEventDetail /></AdminLayout>} />
            <Route path="/admin/professionals" element={<AdminLayout><AdminProfessionals /></AdminLayout>} />
            <Route path="/admin/vehicles" element={<AdminLayout><AdminVehicles /></AdminLayout>} />
            <Route path="/admin/clients" element={<AdminLayout><AdminClients /></AdminLayout>} />
            <Route path="/admin/finance" element={<AdminLayout><AdminFinance /></AdminLayout>} />
            <Route path="/admin/payroll" element={<AdminLayout><AdminPayroll /></AdminLayout>} />
            <Route path="/admin/professional-rates" element={<AdminLayout><AdminProfessionalRates /></AdminLayout>} />
            <Route path="/admin/professional-report" element={<AdminLayout><AdminProfessionalReport /></AdminLayout>} />
            <Route path="/admin/bases" element={<AdminLayout><AdminBases /></AdminLayout>} />
            <Route path="/admin/operational-rates" element={<AdminLayout><AdminOperationalRates /></AdminLayout>} />
            <Route path="/admin/users" element={<AdminLayout><AdminUsers /></AdminLayout>} />
            <Route path="/admin/contract-templates" element={<AdminLayout><AdminContractTemplates /></AdminLayout>} />
            <Route path="/admin/regulation-phones" element={<AdminLayout><AdminRegulationPhones /></AdminLayout>} />
            <Route path="/admin/permissions" element={<AdminLayout><AdminPermissions /></AdminLayout>} />
            <Route path="/admin/payroll-report" element={<AdminLayout><AdminPayrollReport /></AdminLayout>} />
            <Route path="/admin/audit-logs" element={<AdminLayout><AdminAuditLogs /></AdminLayout>} />
            
            {/* Base-specific Routes */}
            <Route path="/admin/base/:baseId/events" element={<AdminLayout><BaseEvents /></AdminLayout>} />
            <Route path="/admin/base/:baseId/professionals" element={<AdminLayout><BaseProfessionals /></AdminLayout>} />
            <Route path="/admin/base/:baseId/vehicles" element={<AdminLayout><BaseVehicles /></AdminLayout>} />
            <Route path="/admin/base/:baseId/finance" element={<AdminLayout><BaseFinance /></AdminLayout>} />
            
            {/* Team Routes */}
            <Route path="/events" element={<TeamLayout><TeamEvents /></TeamLayout>} />
            <Route path="/events/:id" element={<TeamLayout><TeamEventDetail /></TeamLayout>} />
            
            {/* Report Route (no layout) */}
            <Route path="/evento/:id/relatorio" element={<EventReportPage />} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
