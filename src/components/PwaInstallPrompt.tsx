"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Download, PlusSquare, Share, X } from "lucide-react";
import { detectBrowserEnv, type BrowserEnv } from "@/lib/browser-env";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const DISMISS_STORAGE_KEY = "pwa_install_dismissed_until";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

export function PwaInstallPrompt({ suppressed = false }: { suppressed?: boolean }) {
  const [env, setEnv] = useState<BrowserEnv | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const detected = detectBrowserEnv();
    setEnv(detected);

    if (!detected.isMobileOrTablet || detected.isStandalonePwa || detected.isInAppBrowser) {
      return;
    }

    try {
      const dismissedUntil = Number(window.localStorage.getItem(DISMISS_STORAGE_KEY) || "0");
      if (Date.now() < dismissedUntil) {
        return;
      }
    } catch {
      // Ignore storage failures in restricted contexts
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setIsVisible(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    const timer = window.setTimeout(() => {
      setIsVisible(true);
    }, 2500);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const snoozeDismiss = () => {
    setIsVisible(false);
    try {
      window.localStorage.setItem(DISMISS_STORAGE_KEY, String(Date.now() + SNOOZE_MS));
    } catch {
      // Ignore storage failures
    }
  };

  const handleNativeInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsVisible(false);
        setDeferredPrompt(null);
      }
    } finally {
      setInstalling(false);
    }
  };

  const shouldShow = Boolean(
    isVisible &&
      !suppressed &&
      env?.isMobileOrTablet &&
      !env.isStandalonePwa &&
      !env.isInAppBrowser,
  );

  return (
    <AnimatePresence>
      {shouldShow && env && (
        <motion.aside
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.97 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          aria-label="安裝崇德營隊工作室 App"
          className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-[65] md:inset-x-auto md:bottom-24 md:right-6 md:w-[380px]"
        >
          <div className="rounded-2xl border border-stone-200/80 bg-white/95 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.14)] backdrop-blur-xl dark:border-white/15 dark:bg-[#14191C]/95 dark:shadow-[0_16px_40px_rgba(0,0,0,0.5)]">
            <div className="flex items-start gap-3">
              <div className="size-11 shrink-0 overflow-hidden rounded-xl border border-stone-200/70 bg-stone-50 dark:border-white/10 dark:bg-white/5">
                <img
                  src="/logo.png"
                  alt="NTUT CD Camp"
                  className="size-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    安裝成 App，體驗更流暢
                  </h3>
                  <button
                    type="button"
                    aria-label="關閉安裝提示"
                    onClick={snoozeDismiss}
                    className="-mr-1 -mt-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-stone-100 hover:text-foreground dark:hover:bg-white/10"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  全螢幕操作、載入更快，不用每次重新找網址
                </p>
              </div>
            </div>

            {showSteps && !deferredPrompt && (
              <div className="mt-3 space-y-2 rounded-xl border border-stone-200/70 bg-stone-50/80 p-3 text-xs text-foreground dark:border-white/10 dark:bg-white/[0.04]">
                {env.isIOS ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-orange-500/15 font-mono text-[11px] font-semibold text-orange-600 dark:text-orange-400">
                        1
                      </span>
                      <span className="flex flex-wrap items-center gap-1">
                        點選瀏覽器工具列的「分享」圖示
                        <Share className="inline size-3.5 text-orange-500" aria-hidden="true" />
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-orange-500/15 font-mono text-[11px] font-semibold text-orange-600 dark:text-orange-400">
                        2
                      </span>
                      <span className="flex flex-wrap items-center gap-1">
                        選擇「加入主畫面」
                        <PlusSquare className="inline size-3.5 text-orange-500" aria-hidden="true" />
                        → 點擊「新增」
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-orange-500/15 font-mono text-[11px] font-semibold text-orange-600 dark:text-orange-400">
                        1
                      </span>
                      <span>點選瀏覽器右上角「⋮」選單</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-orange-500/15 font-mono text-[11px] font-semibold text-orange-600 dark:text-orange-400">
                        2
                      </span>
                      <span>選擇「安裝應用程式」或「加到主畫面」</span>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="mt-3 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={snoozeDismiss}
              >
                7 天內不再提醒
              </Button>
              {deferredPrompt ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={installing}
                  onClick={() => void handleNativeInstall()}
                  className="h-8 gap-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-3.5 text-xs font-semibold text-white shadow-xs hover:from-orange-600 hover:to-orange-700"
                >
                  <Download className="size-3.5" aria-hidden="true" />
                  {installing ? "安裝中…" : "立即安裝 App"}
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => (showSteps ? snoozeDismiss() : setShowSteps(true))}
                  className="h-8 gap-1 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-3.5 text-xs font-semibold text-white shadow-xs hover:from-orange-600 hover:to-orange-700"
                >
                  {showSteps ? (
                    "我知道了"
                  ) : (
                    <>
                      查看安裝步驟
                      <ChevronDown className="size-3.5" aria-hidden="true" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
