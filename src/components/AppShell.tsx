"use client"

import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { usePlans } from "@/hooks/use-plans";
import { useAuth } from "@/lib/auth-context";
import { usePathname } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { TransparentNavbar } from "@/components/TransparentNavbar";
import { MobileTabBar } from "@/components/MobileTabBar";
import { useTranslation } from "@/lib/i18n-context";

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
 const { t } = useTranslation();
 const router = useRouter();
 const [hasVersionUpdate, setHasVersionUpdate] = React.useState(false);

  // V2 Broadcast System States
  const activeCamp = planData.camps.find(c => c.id === planData.activeCampId);
  const broadcastText = activeCamp?.broadcastText || "";
  const broadcastTime = activeCamp?.broadcastTime || 0;
  const [isBroadcastDismissed, setIsBroadcastDismissed] = React.useState(true);

  React.useEffect(() => {
    if (!broadcastText) {
      setIsBroadcastDismissed(true);
      return;
    }
    try {
      const key = `dismissed_broadcast_${planData.activeCampId}_${broadcastTime}`;
      const dismissed = localStorage.getItem(key);
      setIsBroadcastDismissed(dismissed === "1");
    } catch {
      setIsBroadcastDismissed(false);
    }
  }, [broadcastText, broadcastTime, planData.activeCampId]);

  const handleDismissBroadcast = () => {
    setIsBroadcastDismissed(true);
    try {
      const key = `dismissed_broadcast_${planData.activeCampId}_${broadcastTime}`;
      localStorage.setItem(key, "1");
    } catch (e) {
      console.error(e);
    }
  };

  const showBroadcast = !!(broadcastText && !isBroadcastDismissed);

  // RBAC Redirect: If crew attempts to access a locked camp
  React.useEffect(() => {
  if (!isAuthLoading && role === 'crew' && planData.activeCampId) {
  const activeCamp = planData.camps.find(c => c.id === planData.activeCampId);
  if (activeCamp?.isLocked) {
  toast({
    title: t('PROJECT_LOCKED_TITLE'),
    description: t('PROJECT_LOCKED_DESC'),
  variant: "destructive"
  });
  router.push("/");
  }
  }
    }, [role, planData.activeCampId, planData.camps, isAuthLoading, toast, router, t]);

    React.useEffect(() => {
        if (process.env.NODE_ENV !== 'production') {
            return;
        }

        let isMounted = true;

        const markUpdateAvailable = () => {
            if (!isMounted) return;
            setHasVersionUpdate(true);
        };

        const currentBuildId = process.env.NEXT_PUBLIC_BUILD_ID || 'dev';

        const checkVersion = async () => {
            try {
                const res = await fetch('/api/version', { cache: 'no-store' });
                if (!res.ok) return;
                const contentLength = res.headers.get('content-length');
                if (contentLength === '0') return;
                const data = await res.json();
                const latestBuildId = String(data?.buildId || '');
                if (latestBuildId && latestBuildId !== currentBuildId) {
                    markUpdateAvailable();
                }
            } catch {
                // Silent fail: version check should never block app usage.
            }
        };

        checkVersion();
        const intervalId = window.setInterval(checkVersion, 5 * 60 * 1000);

        let removeControllerListener: (() => void) | undefined;

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistration().then((registration) => {
                if (!registration) return;

                if (registration.waiting) {
                    markUpdateAvailable();
                }

                registration.addEventListener('updatefound', () => {
                    const installing = registration.installing;
                    if (!installing) return;

                    installing.addEventListener('statechange', () => {
                        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                            markUpdateAvailable();
                        }
                    });
                });
            });

            const onControllerChange = () => markUpdateAvailable();
            navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
            removeControllerListener = () => navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
        }

        return () => {
            isMounted = false;
            window.clearInterval(intervalId);
            if (removeControllerListener) removeControllerListener();
        };
    }, []);

  if (isAuthLoading || planData.isLoading) {
  return (
  <div className="h-screen w-full flex flex-col gap-4 items-center justify-center bg-[#FBF9F6] dark:bg-slate-950 font-body">
  <div className="relative">
 <Loader2 className="w-12 h-12 animate-spin text-primary opacity-80" />
 <div className="absolute inset-0 w-12 h-12 rounded-full border-4 border-primary/20 animate-pulse"></div>
 </div>
 <div className="text-primary font-bold tracking-widest text-sm uppercase drop-shadow-sm flex items-center gap-2">
 <span className="inline-block w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0s' }}></span>
 <span className="inline-block w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.15s' }}></span>
 <span className="inline-block w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.3s' }}></span>
 </div>
 </div>
 );
 }

 const isAdminRoute = pathname.startsWith('/admin');

  return (
    <div className={`w-full bg-[#FBF9F6] text-[#2C2A28] dark:text-slate-50 font-body transition-colors min-h-screen flex flex-col ${isAdminRoute ? "dark:bg-[hsl(var(--bar-theme))]" : "dark:bg-slate-950"}`}>
      {/* Transparent Navbar */}
      <TransparentNavbar groups={planData.groups} />

      {/* V2 Live Broadcast Marquee Banner */}
      {showBroadcast && (
        <div className="fixed top-[72px] inset-x-0 z-[69] h-9 bg-gradient-to-r from-orange-600 via-amber-500 to-orange-500 text-white flex items-center shadow-md select-none">
          <div className="flex-1 overflow-hidden relative h-full flex items-center">
            <div className="animate-marquee font-bold text-xs tracking-widest uppercase">
              📢 【值星公告】 {broadcastText}
            </div>
          </div>
          <button 
            onClick={handleDismissBroadcast} 
            className="h-9 w-9 shrink-0 flex items-center justify-center hover:bg-white/10 active:bg-white/20 transition-colors"
            title="關閉公告"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      )}

      {hasVersionUpdate && (
        <div 
          className="fixed inset-x-0 z-[70] px-3 sm:px-6 md:px-8 pointer-events-none transition-all duration-300"
          style={{ top: showBroadcast ? "108px" : "72px" }}
        >
          <div className="mx-auto mt-2 max-w-[1200px] rounded-xl border border-amber-300/70 bg-amber-50 text-amber-900 px-3 py-2.5 sm:px-4 sm:py-3 shadow-sm flex items-center justify-between gap-3 pointer-events-auto">
            <p className="text-xs sm:text-sm font-semibold">
              {t('UPDATE_AVAILABLE_DESC')}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="shrink-0 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs sm:text-sm font-bold px-3 py-1.5 transition-colors"
            >
              {t('REFRESH_NOW')}
            </button>
          </div>
        </div>
      )}
      
      {/* Main Content Area — pb-16 on mobile for tab bar clearance */}
      <main 
        style={{ paddingTop: showBroadcast ? "36px" : "0px" }}
        className="flex-1 min-w-0 w-full overflow-x-clip relative animate-in fade-in slide-in-from-bottom-5 duration-300 pb-16 md:pb-0 transition-all"
      >
        {children}
      </main>
      
      {/* Mobile Bottom Tab Bar */}
      <MobileTabBar />

      <Toaster />
    </div>
  );
}
