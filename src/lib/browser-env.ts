export interface BrowserEnv {
  isLine: boolean;
  isKakaoTalk: boolean;
  isWeChat: boolean;
  inAppName: string | null;
  isInAppBrowser: boolean;
  canAutoRedirect: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isMobileOrTablet: boolean;
  isSafari: boolean;
  isStandalonePwa: boolean;
}

const DEFAULT_ENV: BrowserEnv = {
  isLine: false,
  isKakaoTalk: false,
  isWeChat: false,
  inAppName: null,
  isInAppBrowser: false,
  canAutoRedirect: false,
  isIOS: false,
  isAndroid: false,
  isMobileOrTablet: false,
  isSafari: false,
  isStandalonePwa: false,
};

const EXTERNAL_REDIRECT_SESSION_KEY = "ext_browser_redirect_tried";

export function detectBrowserEnv(): BrowserEnv {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return DEFAULT_ENV;
  }

  const ua = navigator.userAgent || "";
  const isIOS =
    /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const isMobileOrTablet = isIOS || isAndroid || /Mobile|Tablet|Silk/i.test(ua);

  const isLine = /\bLine\//i.test(ua);
  const isKakaoTalk = /KAKAOTALK/i.test(ua);
  const isWeChat = /MicroMessenger/i.test(ua);

  const detectors: ReadonlyArray<[RegExp, string]> = [
    [/\bLine\//i, "LINE"],
    [/KAKAOTALK/i, "KakaoTalk"],
    [/Instagram/i, "Instagram"],
    [/Barcelona/i, "Threads"],
    [/Messenger/i, "Messenger"],
    [/FBAN|FBAV|FB_IAB|FBIOS|FB4A/i, "Facebook"],
    [/MicroMessenger/i, "WeChat"],
    [/WhatsApp/i, "WhatsApp"],
    [/Telegram/i, "Telegram"],
    [/Twitter|X-Client/i, "X (Twitter)"],
    [/TikTok|musical_ly|BytedanceWebview|ByteLocale|Aweme/i, "TikTok"],
    [/Discord/i, "Discord"],
    [/Slack/i, "Slack"],
    [/Snapchat/i, "Snapchat"],
    [/LinkedInApp/i, "LinkedIn"],
    [/Pinterest/i, "Pinterest"],
    [/Reddit/i, "Reddit"],
    [/NAVER\(inapp/i, "Naver"],
    [/\bQQ\/|MQQBrowser.*QQ/i, "QQ"],
    [/Weibo/i, "Weibo"],
    [/xhs|XiaoHongShu/i, "小紅書"],
    [/Dcard/i, "Dcard"],
    [/Notion/i, "Notion"],
    [/GSA\//i, "Google App"],
  ];

  let inAppName: string | null = null;
  for (const [pattern, name] of detectors) {
    if (pattern.test(ua)) {
      inAppName = name;
      break;
    }
  }

  if (!inAppName) {
    const isGenericAndroidWebView =
      /; wv\)/i.test(ua) ||
      (isAndroid && /Version\/[\d.]+.*Chrome\//i.test(ua));
    const isGenericIosWebView =
      isIOS &&
      /AppleWebKit/i.test(ua) &&
      !/Safari/i.test(ua) &&
      !/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/i.test(ua);

    if (isGenericAndroidWebView || isGenericIosWebView) {
      inAppName = "內建瀏覽器";
    }
  }

  const isInAppBrowser = Boolean(inAppName);
  const isSafari =
    isIOS &&
    /Safari/i.test(ua) &&
    !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua) &&
    !isInAppBrowser;
  const isStandalonePwa =
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

  const canAutoRedirect =
    isLine || isKakaoTalk || (isAndroid && isInAppBrowser && !isWeChat);

  return {
    isLine,
    isKakaoTalk,
    isWeChat,
    inAppName,
    isInAppBrowser,
    canAutoRedirect,
    isIOS,
    isAndroid,
    isMobileOrTablet,
    isSafari,
    isStandalonePwa,
  };
}

export function stripExternalRedirectParam(href: string): string {
  const url = new URL(href);
  url.searchParams.delete("openExternalBrowser");
  return url.toString();
}

export function buildLineExternalUrl(href: string): string {
  const url = new URL(href);
  url.searchParams.set("openExternalBrowser", "1");
  return url.toString();
}

export function buildKakaoExternalUrl(href: string): string {
  const cleanUrl = stripExternalRedirectParam(href);
  return `kakaotalk://web/openExternal?url=${encodeURIComponent(cleanUrl)}`;
}

export function buildAndroidDefaultBrowserIntentUrl(href: string): string {
  const cleanUrl = stripExternalRedirectParam(href);
  const url = new URL(cleanUrl);
  const scheme = url.protocol.replace(":", "") || "https";
  const hostAndPath = `${url.host}${url.pathname}${url.search}${url.hash}`;
  return `intent://${hostAndPath}#Intent;scheme=${scheme};action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;S.browser_fallback_url=${encodeURIComponent(cleanUrl)};end`;
}

export function buildAndroidChromeIntentUrl(href: string): string {
  const cleanUrl = stripExternalRedirectParam(href);
  const url = new URL(cleanUrl);
  const scheme = url.protocol.replace(":", "") || "https";
  const hostAndPath = `${url.host}${url.pathname}${url.search}${url.hash}`;
  return `intent://${hostAndPath}#Intent;scheme=${scheme};package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(cleanUrl)};end`;
}

export function buildIosSafariUrl(href: string): string {
  const cleanUrl = stripExternalRedirectParam(href);
  if (cleanUrl.startsWith("https://")) {
    return `x-safari-https://${cleanUrl.slice("https://".length)}`;
  }
  if (cleanUrl.startsWith("http://")) {
    return `x-safari-http://${cleanUrl.slice("http://".length)}`;
  }
  return cleanUrl;
}

export function tryAutoRedirectExternalBrowser(): boolean {
  if (typeof window === "undefined") return false;

  const env = detectBrowserEnv();

  // Once we land in a real external browser, remove ?openExternalBrowser=1 cleanly.
  if (!env.isInAppBrowser) {
    try {
      const current = new URL(window.location.href);
      if (current.searchParams.has("openExternalBrowser")) {
        window.history.replaceState(null, "", stripExternalRedirectParam(window.location.href));
      }
    } catch {
      // Ignore URL errors
    }
    return false;
  }

  if (!env.canAutoRedirect) return false;

  try {
    const currentUrl = new URL(window.location.href);
    if (window.sessionStorage.getItem(EXTERNAL_REDIRECT_SESSION_KEY) === "1") {
      return false;
    }

    if (env.isLine) {
      if (currentUrl.searchParams.get("openExternalBrowser") === "1") {
        return false;
      }
      window.sessionStorage.setItem(EXTERNAL_REDIRECT_SESSION_KEY, "1");
      window.location.replace(buildLineExternalUrl(window.location.href));
      return true;
    }

    if (env.isKakaoTalk) {
      window.sessionStorage.setItem(EXTERNAL_REDIRECT_SESSION_KEY, "1");
      window.location.href = buildKakaoExternalUrl(window.location.href);
      return true;
    }

    if (env.isAndroid && !env.isWeChat) {
      window.sessionStorage.setItem(EXTERNAL_REDIRECT_SESSION_KEY, "1");
      window.location.href = buildAndroidDefaultBrowserIntentUrl(window.location.href);
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

export const tryAutoRedirectLineExternal = tryAutoRedirectExternalBrowser;
