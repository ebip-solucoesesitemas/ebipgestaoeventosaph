import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Ambulance } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Slim top bar with sidebar trigger */}
          <header className="sticky top-0 z-40 h-12 border-b bg-background/95 backdrop-blur flex items-center px-4 gap-3">
            <SidebarTrigger />
            <div className="flex items-center gap-2 md:hidden">
              <Ambulance className="w-5 h-5 text-primary" />
              <span className="text-sm font-semibold text-foreground">EBIP EVENTOS</span>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
