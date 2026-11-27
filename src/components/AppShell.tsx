"use client"

import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { usePlans } from "@/hooks/use-plans";
import { useAuth } from "@/lib/auth-context";
import { usePathname } from "next/navigation";
import { Loader2, RefreshCw, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { TransparentNavbar } from "@/components/TransparentNavbar";
import { TimerAlarmHost } from "@/components/TimerAlarmHost";
import { InAppBrowserBanner } from "@/components/InAppBrowserBanner";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
import { useTranslation } from "@/lib/i18n-context";
import { cn } from "@/lib/utils";

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

  return (
    <>
      {/* 全站響鈴。放在這裡（而不是 AppShellInternal 裡面）有兩個理由：
          auth 頁已經在上面被 return 掉了，所以登入畫面不會響；
          而它在 AppShellInternal 的載入 early return 之上，所以還在轉圈的
          裝置照樣會響。 */}
      <TimerAlarmHost />
      <AppShellInternal>{children}</AppShellInternal>
      {/* Toaster 也必須在 early return 之上。
          原本它在 AppShellInternal 的**最後面**，所以只要那邊還在
          `isAuthLoading || planData.isLoading` 的轉圈分支，整個 toast 容器就
          不存在 —— 這段時間跳出來的提示會靜靜地消失在 use-toast 的 store 裡。
          實測在 /plans 上就是這樣：響鈴真的觸發了（去重紀錄有 timeup），
          但使用者一個字都沒看到。響鈴要「停在任何一頁都看得到」，
          容器就不能跟著載入狀態忽隱忽現。 */}
      <Toaster />
    </>
  );
}

/** Internal shell with transparent navbar — only rendered on non-auth pages */
function AppShellInternal({ children }: { children: React.ReactNode }) {
  const { isLoading: isAuthLoading, role } = useAuth();
  const planData = usePlans();
  const pathname = usePathname();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [hasVersionUpdate, setHasVersionUpdate] = React.useState(false);
  const [latestVersion, setLatestVersion] = React.useState<string | null>(null);
  const [isUpdateDismissed, setIsUpdateDismissed] = React.useState(false);
  const [isReloading, setIsReloading] = React.useState(false);

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

  // 停在一個已被鎖定的專案上時，說明發生了什麼事。
  //
  // ⚠️ 這裡**只負責提示**，不負責把人帶走。之前的作法是 router.push("/")，
  //    但那沒有動到 activeCampId —— 專案還是鎖定的那一個，於是每進一頁就
  //    再被踢回首頁一次，連「系統設定 > 工作區」都進不去，人就卡死在裡面
  //    （issue #9）。真正的修正是換掉活躍專案，那由 plans-context 負責；
  //    換成功之後這個 effect 的條件自然不再成立，提示也只會跳一次。
  React.useEffect(() => {
    if (isAuthLoading || role !== 'crew' || !planData.activeCampId) return;
    const activeCamp = planData.camps.find(c => c.id === planData.activeCampId);
    if (!activeCamp?.isLocked) return;
    toast({
      title: t('PROJECT_LOCKED_TITLE'),
      description: t('PROJECT_LOCKED_SWITCHED_DESC'),
      variant: "destructive"
    });
  }, [role, planData.activeCampId, planData.camps, isAuthLoading, toast, t]);

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
          if (isMounted && typeof data?.version === 'string' && data.version) {
            setLatestVersion(data.version);
          }
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
      <div className="h-screen w-full flex flex-col gap-4 items-center justify-center bg-[#FAF8F5] dark:bg-[#0B1012] font-sans">
        <div className="relative">
          <Loader2 className="w-12 h-12 animate-spin text-primary opacity-80" />
          <div className="absolute inset-0 w-12 h-12 rounded-full border-4 border-primary/20 animate-pulse" />
        </div>
        <div className="text-primary font-mono font-medium tracking-technical text-xs uppercase flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0s' }} />
          <span className="inline-block w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.15s' }} />
          <span className="inline-block w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.3s' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#FAF8F5] dark:bg-[#0B1012] text-foreground font-sans transition-colors min-h-screen flex flex-col">
      {/* Fluid Glass Minimalist Top Header & Floating Bottom Capsule Nav */}
      <TransparentNavbar groups={planData.groups} />

      {/* V2 Live Broadcast Marquee Banner */}
      {showBroadcast && (
        <div className="fixed top-14 inset-x-0 z-[69] h-8 bg-gradient-to-r from-orange-600 via-amber-500 to-orange-500 text-white flex items-center shadow-md select-none">
          <div className="flex-1 overflow-hidden relative h-full flex items-center">
            <div className="animate-marquee font-bold text-xs tracking-widest uppercase">
              📢 【值星公告】 {broadcastText}
            </div>
          </div>
          <button 
            onClick={handleDismissBroadcast} 
            className="h-8 w-8 shrink-0 flex items-center justify-center hover:bg-white/10 active:bg-white/20 transition-colors"
            title="關閉公告"
          >
            <X className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      )}

      <AnimatePresence>
        {hasVersionUpdate && !isUpdateDismissed && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            role="status"
            aria-live="polite"
            className="pointer-events-none fixed inset-x-3 z-[70] sm:inset-x-6"
            style={{ top: showBroadcast ? "96px" : "68px" }}
          >
            <div className="pointer-events-auto mx-auto flex max-w-lg items-center gap-3 rounded-2xl border border-orange-500/25 bg-white/92 px-3.5 py-2.5 shadow-[0_12px_36px_rgba(0,0,0,0.12)] backdrop-blur-xl dark:bg-[#14191C]/92 dark:shadow-[0_12px_36px_rgba(0,0,0,0.45)] sm:px-4 sm:py-3">
              <div className="relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/12 text-orange-600 dark:text-orange-400">
                <Sparkles className="size-4" aria-hidden="true" />
                <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-orange-500 ring-2 ring-white dark:ring-[#14191C]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-xs font-semibold text-foreground sm:text-sm">
                    有新版本可用
                  </p>
                  {latestVersion && (
                    <span className="shrink-0 rounded-md bg-orange-500/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-orange-600 dark:text-orange-400">
                      v{latestVersion}
                    </span>
                  )}
                </div>
                <p className="truncate text-[11px] text-muted-foreground sm:text-xs">
                  {t('UPDATE_AVAILABLE_DESC')}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  disabled={isReloading}
                  onClick={() => {
                    setIsReloading(true);
                    if ('serviceWorker' in navigator) {
                      navigator.serviceWorker.getRegistration().then((reg) => {
                        if (reg?.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                      }).catch(() => {}).finally(() => {
                        window.location.reload();
                      });
                    } else {
                      window.location.reload();
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:from-orange-600 hover:to-orange-700 active:scale-[0.98] disabled:opacity-70"
                >
                  <RefreshCw className={cn("size-3.5", isReloading && "animate-spin")} aria-hidden="true" />
                  {isReloading ? "更新中…" : t('REFRESH_NOW')}
                </button>
                <button
                  type="button"
                  aria-label="稍後再說"
                  onClick={() => setIsUpdateDismissed(true)}
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-stone-100 hover:text-foreground dark:hover:bg-white/10"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <InAppBrowserBanner variant="floating" />
      <PwaInstallPrompt suppressed={hasVersionUpdate && !isUpdateDismissed} />

      {/* Main Content Area — pb-28 on all viewports for Fluid Glass bottom dock clearance */}
      <main 
        style={{ paddingTop: showBroadcast ? "32px" : "0px" }}
        className="flex-1 min-w-0 w-full overflow-x-clip relative animate-in fade-in slide-in-from-bottom-5 duration-300 pb-28 transition-all"
      >
        {children}
      </main>

    </div>
  );
}
