export interface BrowserEnv {
  isLine: boolean;
  inAppName: string | null;
  isInAppBrowser: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isMobileOrTablet: boolean;
  isSafari: boolean;
  isStandalonePwa: boolean;
}

const DEFAULT_ENV: BrowserEnv = {
  isLine: false,
  inAppName: null,
  isInAppBrowser: false,
  isIOS: false,
  isAndroid: false,
  isMobileOrTablet: false,
  isSafari: false,
  isStandalonePwa: false,
};

const LINE_REDIRECT_SESSION_KEY = "line_ext_redirect_tried";

export function detectBrowserEnv(): BrowserEnv {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return DEFAULT_ENV;
  }

  const ua = navigator.userAgent || "";
  const isLine = /\bLine\//i.test(ua);

  let inAppName: string | null = null;
  if (isLine) {
    inAppName = "LINE";
  } else if (/Instagram/i.test(ua)) {
    inAppName = "Instagram";
  } else if (/Messenger/i.test(ua)) {
    inAppName = "Messenger";
  } else if (/FBAN|FBAV|FB_IAB/i.test(ua)) {
    inAppName = "Facebook";
  } else if (/Barcelona/i.test(ua)) {
    inAppName = "Threads";
  } else if (/MicroMessenger/i.test(ua)) {
    inAppName = "WeChat";
  } else if (/; wv\)/i.test(ua) || (/Android/i.test(ua) && /Version\/[\d.]+.*Chrome\//i.test(ua))) {
    inAppName = "內建瀏覽器";
  }

  const isInAppBrowser = Boolean(inAppName);
  const isIOS =
    /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const isMobileOrTablet = isIOS || isAndroid || /Mobile|Tablet|Silk/i.test(ua);
  const isSafari =
    isIOS &&
    /Safari/i.test(ua) &&
    !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua) &&
    !isInAppBrowser;
  const isStandalonePwa =
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

  return {
    isLine,
    inAppName,
    isInAppBrowser,
    isIOS,
    isAndroid,
    isMobileOrTablet,
    isSafari,
    isStandalonePwa,
  };
}

export function buildLineExternalUrl(href: string): string {
  const url = new URL(href);
  url.searchParams.set("openExternalBrowser", "1");
  return url.toString();
}

export function stripExternalRedirectParam(href: string): string {
  const url = new URL(href);
  url.searchParams.delete("openExternalBrowser");
  return url.toString();
}

export function buildAndroidChromeIntentUrl(href: string): string {
  const url = new URL(href);
  const scheme = url.protocol.replace(":", "") || "https";
  const hostAndPath = `${url.host}${url.pathname}${url.search}${url.hash}`;
  return `intent://${hostAndPath}#Intent;scheme=${scheme};package=com.android.chrome;end`;
}

export function tryAutoRedirectLineExternal(): boolean {
  const env = detectBrowserEnv();
  if (!env.isLine) return false;

  try {
    const currentUrl = new URL(window.location.href);
    if (currentUrl.searchParams.get("openExternalBrowser") === "1") {
      return false;
    }
    if (window.sessionStorage.getItem(LINE_REDIRECT_SESSION_KEY) === "1") {
      return false;
    }
    window.sessionStorage.setItem(LINE_REDIRECT_SESSION_KEY, "1");
    window.location.replace(buildLineExternalUrl(window.location.href));
    return true;
  } catch {
    return false;
  }
}
