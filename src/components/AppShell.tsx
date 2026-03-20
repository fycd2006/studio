"use client"

import React from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { PlanSidebar } from "@/components/PlanSidebar";
import { Toaster } from "@/components/ui/toaster";
import { usePlans } from "@/hooks/use-plans";
import { useAuth } from "@/lib/auth-context";
import { usePathname } from "next/navigation";
import { Loader2, Menu } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useRouter } from "next/navigation";

/** Routes that should NOT render the sidebar */
const AUTH_ROUTES = ["/login", "/signup"];

/**
 * AppShell — Global layout wrapper.
 * Sidebar is ALWAYS fixed on the left EXCEPT on auth pages.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { isLoading: isAuthLoading } = useAuth();
  const pathname = usePathname();
  const isAuthPage = AUTH_ROUTES.some((r) => pathname.startsWith(r));

  // Auth pages get a clean, sidebar-free shell
  if (isAuthPage) {
    return (
      <>
        {children}
        <Toaster />
      </>
    );
  }

  return <AppShellInternal>{children}</AppShellInternal>;
}

/** Internal shell with sidebar — only rendered on non-auth pages */
function AppShellInternal({ children }: { children: React.ReactNode }) {
  const { isLoading: isAuthLoading, role } = useAuth();
  const planData = usePlans();
  const pathname = usePathname();
  const { toast } = useToast();
  const router = useRouter();

  // RBAC Redirect: If crew attempts to access a locked camp
  React.useEffect(() => {
    if (!isAuthLoading && role === 'crew' && planData.activeCampId) {
      const activeCamp = planData.camps.find(c => c.id === planData.activeCampId);
      if (activeCamp?.isLocked) {
        toast({
          title: "🔒 專案已鎖定 / Project Locked",
          description: "該專案目前處於鎖定狀態，僅管理員可存取。",
          variant: "destructive"
        });
        router.push("/");
      }
    }
  }, [role, planData.activeCampId, planData.camps, isAuthLoading, toast, router]);

  if (isAuthLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-stone-50 dark:bg-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500 dark:text-amber-400" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-stone-50 dark:bg-slate-900 overflow-hidden font-body transition-colors">
        <PlanSidebar
          camps={planData.camps}
          activeCampId={planData.activeCampId}
          onCampSelect={planData.setActiveCampId}
          onCampAdd={planData.addCamp}
          onCampUpdate={planData.updateCamp}
          onCampDelete={planData.deleteCamp}
          onCampToggleLock={planData.toggleCampLock}
          plans={planData.plans}
          activePlanId={planData.activePlanId}
          onSelect={planData.setActivePlanId}
          onAdd={planData.addPlan}
          onDelete={planData.deletePlan}
          onReorder={planData.reorderPlans}
          viewMode={planData.viewMode}
          setViewMode={planData.setViewMode}
        />
        <main className="flex-1 h-full overflow-y-auto overflow-x-hidden relative flex flex-col">
          {/* Mobile Hamburger Menu */}
          <div className="md:hidden absolute top-4 left-4 z-50">
            <SidebarTrigger className="h-9 w-9 rounded-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-stone-200 dark:border-white/10 shadow-sm" />
          </div>
          {children}
        </main>
        <Toaster />
      </div>
    </SidebarProvider>
  );
}

