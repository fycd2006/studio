"use client";

import { useEffect, useState } from "react";
import { Check, Compass, Copy, ExternalLink, X } from "lucide-react";
import {
  buildAndroidChromeIntentUrl,
  buildLineExternalUrl,
  detectBrowserEnv,
  stripExternalRedirectParam,
  tryAutoRedirectLineExternal,
  type BrowserEnv,
} from "@/lib/browser-env";
import { Button } from "@/components/ui/button";

interface InAppBrowserBannerProps {
  variant?: "login" | "floating";
}

export function InAppBrowserBanner({ variant = "login" }: InAppBrowserBannerProps) {
  const [env, setEnv] = useState<BrowserEnv | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    tryAutoRedirectLineExternal();
    setEnv(detectBrowserEnv());
  }, []);

  if (!env?.isInAppBrowser || dismissed) return null;

  const recommendedBrowser = env.isIOS ? "Safari" : "Chrome";
  const currentHref = typeof window !== "undefined" ? window.location.href : "";

  const handleCopy = async () => {
    if (!currentHref) return;
    const cleanUrl = stripExternalRedirectParam(currentHref);
    try {
      await navigator.clipboard.writeText(cleanUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback for restricted WebViews
      const textarea = document.createElement("textarea");
      textarea.value = cleanUrl;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2500);
      } finally {
        document.body.removeChild(textarea);
      }
    }
  };

  const card = (
    <div
      role="region"
      aria-label="建議改用外部瀏覽器"
      className="rounded-xl border border-amber-500/35 bg-amber-50/95 p-3.5 text-amber-950 shadow-sm backdrop-blur-xl dark:border-amber-400/25 dark:bg-amber-950/80 dark:text-amber-100"
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300">
          <Compass className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-semibold leading-snug sm:text-sm">
              偵測到使用 {env.inAppName} 內建瀏覽器
            </p>
            {variant === "floating" && (
              <button
                type="button"
                aria-label="關閉提示"
                onClick={() => setDismissed(true)}
                className="-mr-1 -mt-1 rounded-md p-1 text-amber-700/70 transition-colors hover:bg-amber-500/15 hover:text-amber-950 dark:text-amber-300/70 dark:hover:text-amber-100"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
          <p className="text-[11px] leading-relaxed text-amber-900/85 dark:text-amber-200/85 sm:text-xs">
            Google 安全性政策禁止於 App 內建瀏覽器進行帳號驗證，建議改用{" "}
            <span className="font-semibold">{recommendedBrowser}</span>{" "}
            開啟以順利登入與獲得最佳體驗。
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1.5">
            {env.isLine && currentHref && (
              <Button
                type="button"
                size="sm"
                className="h-8 gap-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-3 text-xs font-semibold text-white shadow-xs hover:from-orange-600 hover:to-orange-700"
                onClick={() => {
                  window.location.href = buildLineExternalUrl(currentHref);
                }}
              >
                <ExternalLink className="size-3.5" aria-hidden="true" />
                用外部瀏覽器開啟
              </Button>
            )}
            {!env.isLine && env.isAndroid && currentHref && (
              <a
                href={buildAndroidChromeIntentUrl(currentHref)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-3 text-xs font-semibold text-white shadow-xs transition-colors hover:from-orange-600 hover:to-orange-700"
              >
                <ExternalLink className="size-3.5" aria-hidden="true" />
                以 Chrome 開啟
              </a>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 rounded-lg border-amber-500/35 bg-white/80 px-3 text-xs font-medium text-amber-950 hover:bg-white dark:border-amber-400/30 dark:bg-white/10 dark:text-amber-100 dark:hover:bg-white/15"
              onClick={() => void handleCopy()}
            >
              {copied ? (
                <>
                  <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  已複製網址
                </>
              ) : (
                <>
                  <Copy className="size-3.5" aria-hidden="true" />
                  複製網址
                </>
              )}
            </Button>
          </div>
          <p className="pt-0.5 text-[11px] text-amber-800/75 dark:text-amber-200/70">
            或點選右上角／右下角「⋯」→「以預設瀏覽器開啟」
          </p>
        </div>
      </div>
    </div>
  );

  if (variant === "floating") {
    return (
      <div className="pointer-events-none fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-[72] sm:inset-x-6 md:bottom-24">
        <div className="pointer-events-auto mx-auto max-w-lg">{card}</div>
      </div>
    );
  }

  return card;
}
