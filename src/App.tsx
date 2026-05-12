import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "next-themes";
import AdminRoute from "@/components/AdminRoute";
import ProtectedRoute from "@/components/ProtectedRoute";
import IdleTimeoutWrapper from "@/components/IdleTimeoutWrapper";
import TicketNotifications from "@/components/TicketNotifications";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AdminEvents from "./pages/admin/Events";
import AdminEventDetail from "./pages/admin/EventDetail";
import AdminProfessionals from "./pages/admin/Professionals";
import AdminVehicles from "./pages/admin/Vehicles";
import AdminClients from "./pages/admin/Clients";
import AdminFinance from "./pages/admin/Finance";
import AdminPayroll from "./pages/admin/Payroll";

import AdminProfessionalReport from "./pages/admin/ProfessionalReport";
import AdminOperationalRates from "./pages/admin/OperationalRates";
import AdminBases from "./pages/admin/Bases";
import AdminUsers from "./pages/admin/Users";
import AdminContractTemplates from "./pages/admin/ContractTemplates";
import AdminRegulationPhones from "./pages/admin/RegulationPhones";
import AdminAuditLogs from "./pages/admin/AuditLogs";
import SuperAdminRoute from "./components/SuperAdminRoute";
import AdminPermissions from "./pages/admin/Permissions";
import AdminPayrollReport from "./pages/admin/PayrollReport";
import AdminSystemNotices from "./pages/admin/SystemNotices";
import AdminChecklist from "./pages/admin/ChecklistManagement";
import AdminSystemBackup from "./pages/admin/SystemBackup";
import TeamChecklist from "./pages/team/TeamChecklist";
import BaseEvents from "./pages/admin/base/BaseEvents";
import BaseProfessionals from "./pages/admin/base/BaseProfessionals";
import BaseVehicles from "./pages/admin/base/BaseVehicles";
import BaseFinance from "./pages/admin/base/BaseFinance";
import BaseAtendimentos from "./pages/admin/base/BaseAtendimentos";
import TeamEvents from "./pages/team/TeamEvents";
import TeamEventDetail from "./pages/team/EventDetail";
import EventReportPage from "./pages/EventReportPage";
import SupportTickets from "./pages/SupportTickets";
import SystemBanner from "./components/SystemBanner";
import ChecklistReminderDialog from "./components/ChecklistReminderDialog";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <SystemBanner />
            <IdleTimeoutWrapper />
            <TicketNotifications />
            <ChecklistReminderDialog />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              
              {/* Admin Routes */}
              <Route path="/admin/events" element={<AdminRoute><AdminEvents /></AdminRoute>} />
              <Route path="/admin/events/:id" element={<AdminRoute><AdminEventDetail /></AdminRoute>} />
              <Route path="/admin/professionals" element={<AdminRoute><AdminProfessionals /></AdminRoute>} />
              <Route path="/admin/vehicles" element={<AdminRoute><AdminVehicles /></AdminRoute>} />
              <Route path="/admin/clients" element={<AdminRoute><AdminClients /></AdminRoute>} />
              <Route path="/admin/finance" element={<AdminRoute><AdminFinance /></AdminRoute>} />
              <Route path="/admin/payroll" element={<AdminRoute><AdminPayroll /></AdminRoute>} />
              
              <Route path="/admin/professional-report" element={<AdminRoute><AdminProfessionalReport /></AdminRoute>} />
              <Route path="/admin/bases" element={<AdminRoute><AdminBases /></AdminRoute>} />
              <Route path="/admin/operational-rates" element={<AdminRoute><AdminOperationalRates /></AdminRoute>} />
              <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
              <Route path="/admin/contract-templates" element={<AdminRoute><AdminContractTemplates /></AdminRoute>} />
              <Route path="/admin/regulation-phones" element={<AdminRoute><AdminRegulationPhones /></AdminRoute>} />
              <Route path="/admin/permissions" element={<AdminRoute><AdminPermissions /></AdminRoute>} />
              <Route path="/admin/payroll-report" element={<AdminRoute><AdminPayrollReport /></AdminRoute>} />
              <Route path="/admin/audit-logs" element={<AdminRoute><AdminAuditLogs /></AdminRoute>} />
              <Route path="/admin/system-notices" element={<AdminRoute><AdminSystemNotices /></AdminRoute>} />
              <Route path="/admin/checklist" element={<AdminRoute><AdminChecklist /></AdminRoute>} />
              <Route path="/admin/system-backup" element={<AdminRoute><AdminSystemBackup /></AdminRoute>} />
              
              {/* Base-specific Routes */}
              <Route path="/admin/base/:baseId/events" element={<AdminRoute><BaseEvents /></AdminRoute>} />
              <Route path="/admin/base/:baseId/professionals" element={<AdminRoute><BaseProfessionals /></AdminRoute>} />
              <Route path="/admin/base/:baseId/vehicles" element={<AdminRoute><BaseVehicles /></AdminRoute>} />
              <Route path="/admin/base/:baseId/finance" element={<AdminRoute><BaseFinance /></AdminRoute>} />
              <Route path="/admin/base/:baseId/atendimentos" element={<AdminRoute><BaseAtendimentos /></AdminRoute>} />
              
              {/* Team Routes */}
              <Route path="/events" element={<ProtectedRoute><TeamEvents /></ProtectedRoute>} />
              <Route path="/events/:id" element={<ProtectedRoute><TeamEventDetail /></ProtectedRoute>} />
              <Route path="/checklist" element={<ProtectedRoute><TeamChecklist /></ProtectedRoute>} />
              
              {/* Support Tickets */}
              <Route path="/tickets" element={<ProtectedRoute><SupportTickets /></ProtectedRoute>} />
              
              {/* Report Route (protected, no sidebar) */}
              <Route path="/evento/:id/relatorio" element={<EventReportPage />} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
