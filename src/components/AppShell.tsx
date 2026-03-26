"use client"

import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { usePlans } from "@/hooks/use-plans";
import { useAuth } from "@/lib/auth-context";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { TransparentNavbar } from "@/components/TransparentNavbar";

/** Routes that should NOT render the navbar */
const AUTH_ROUTES = ["/login", "/signup"];

/**
 * AppShell — Global layout wrapper with transparent navbar.
 * Navbar is ALWAYS visible except on auth pages.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { isLoading: isAuthLoading } = useAuth();
  const pathname = usePathname();
  const isAuthPage = AUTH_ROUTES.some((r) => pathname.startsWith(r));

  // Auth pages get a clean, navbar-free shell
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

/** Internal shell with transparent navbar — only rendered on non-auth pages */
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

  const isAdminRoute = pathname.startsWith('/admin');

  return (
    <div className={`w-full bg-stone-50 text-slate-900 dark:text-slate-50 font-body transition-colors min-h-screen flex flex-col ${isAdminRoute ? "dark:bg-[hsl(var(--bar-theme))]" : "dark:bg-slate-950"}`}>
      {/* Transparent Navbar */}
      <TransparentNavbar groups={planData.groups} />
      
      {/* Main Content Area */}
      <main className="flex-1 w-full overflow-x-clip relative animate-in fade-in slide-in-from-bottom-5 duration-300">
        {children}
      </main>
      
      <Toaster />
    </div>
  );
}

