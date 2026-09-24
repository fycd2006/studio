"use client";

import { useEffect, useRef, useState } from "react";
import { useActionBarStore } from "@/store/action-bar-store";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Menu,
  Home,
  FolderOpen,
  ShieldCheck,
  Settings,
  ChevronUp,
  Plus,
  Volume2,
  Monitor,
  Clock,
  FileSpreadsheet,
  Package2,
} from "lucide-react";
import { cn, getUnifiedGroupBadgeParams } from "@/lib/utils";
import { usePlans } from "@/hooks/use-plans";
import { usePresence } from "@/hooks/use-presence";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "@/lib/i18n-context";
import { AnimatePresence, motion } from "framer-motion";

interface NavbarProps {
  groups?: Array<{ id: string; slug: string; nameZh: string; nameEn: string }>;
}

export function TransparentNavbar({ groups }: NavbarProps) {
  const SHORT_BEEP_URL = "/beep.wav";
  const [activeSubmenu, setActiveSubmenu] = useState<"plans" | "admin" | null>(null);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [isQuickAddExpanded, setIsQuickAddExpanded] = useState(false);

  // Read scroll state from store (ActionBar writes it)
  const isNavbarVisible = useActionBarStore((s) => s.isNavbarVisible);
  const setIsNavbarVisible = useActionBarStore((s) => s.setIsNavbarVisible);
  const hasActionBar = useActionBarStore((s) => s.hasActionBar);
  const isFullscreen = useActionBarStore((s) => s.isFullscreen);

  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { t, language } = useTranslation();
  const { role } = useAuth();
  const { camps, activeCampId, activePlanId, groups: allGroups, addPlan } = usePlans();
  const { activeViewers } = usePresence(activePlanId);
  const lastScrollY = useRef(0);
  const shortBeepRef = useRef<HTMLAudioElement | null>(null);
  const closeSubmenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    shortBeepRef.current = new Audio(SHORT_BEEP_URL);
    shortBeepRef.current.preload = "auto";

    return () => {
      shortBeepRef.current = null;
    };
  }, []);

  const activeCamp = camps?.find((c) => c.id === activeCampId);
  const displayGroups = groups || allGroups || [];

  const safeGroups = displayGroups.filter(
    (group): group is { id: string; slug: string; nameZh: string; nameEn: string } =>
      !!group &&
      typeof group.id === "string" &&
      group.id.length > 0 &&
      typeof group.slug === "string" &&
      group.slug.length > 0 &&
      typeof group.nameZh === "string" &&
      typeof group.nameEn === "string"
  );

  const planDropdownGroups = safeGroups.length > 0
    ? safeGroups
    : [
        { id: "group-activity", slug: "activity", nameZh: "活動組", nameEn: "Activity" },
        { id: "group-teaching", slug: "teaching", nameZh: "教學組", nameEn: "Teaching" },
      ];

  const searchParams = useSearchParams();
  const [adminTab, setAdminTab] = useState<"timer" | "tables" | "props">(() => {
    const tab = (searchParams?.get("tab") || "").toLowerCase();
    if (tab === "tables" || tab === "props") return tab;
    return "timer";
  });

  useEffect(() => {
    const tab = (searchParams?.get("tab") || "").toLowerCase();
    if (tab === "tables" || tab === "props" || tab === "timer") {
      setAdminTab(tab as "timer" | "tables" | "props");
    } else if (pathname === "/admin") {
      setAdminTab("timer");
    }
  }, [searchParams, pathname]);

  useEffect(() => {
    const handleAdminTabSync = (e: Event) => {
      const custom = e as CustomEvent<string>;
      if (custom.detail === "timer" || custom.detail === "tables" || custom.detail === "props") {
        setAdminTab(custom.detail);
      }
    };
    window.addEventListener("admin-tab-change", handleAdminTabSync);
    return () => window.removeEventListener("admin-tab-change", handleAdminTabSync);
  }, []);

  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const NAV_ITEMS = [
    { key: "home", href: "/", icon: Home, labelKey: "NAV_HOME" as const },
    { key: "plans", href: "/plans", icon: FolderOpen, labelKey: "NAV_PLANS" as const },
    { key: "timer", href: "/admin?tab=timer", icon: Clock, labelKey: "NAV_TIMER" as const, adminTab: "timer" as const },
    { key: "tables", href: "/admin?tab=tables", icon: FileSpreadsheet, labelKey: "NAV_TABLES" as const, adminTab: "tables" as const },
    { key: "props", href: "/admin?tab=props", icon: Package2, labelKey: "NAV_PROPS" as const, adminTab: "props" as const },
  ];

  const isItemActive = (item: (typeof NAV_ITEMS)[number]) => {
    if (item.adminTab) {
      return pathname === "/admin" && adminTab === item.adminTab;
    }
    if (item.href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(item.href);
  };

  const handleNavClick = (href: string, targetAdminTab?: "timer" | "tables" | "props") => {
    if (targetAdminTab) {
      setAdminTab(targetAdminTab);
      window.dispatchEvent(new CustomEvent("admin-tab-change", { detail: targetAdminTab }));
    }
    setActiveSubmenu(null);
    router.push(href);
  };

  const handleMouseEnter = (menu: "plans" | "admin") => {
    if (closeSubmenuTimeoutRef.current) {
      clearTimeout(closeSubmenuTimeoutRef.current);
      closeSubmenuTimeoutRef.current = null;
    }
    setActiveSubmenu(menu);
  };

  const handleMouseLeave = () => {
    closeSubmenuTimeoutRef.current = setTimeout(() => {
      setActiveSubmenu(null);
    }, 180);
  };

  const toggleAudioUnlock = async () => {
    if (audioUnlocked) {
      localStorage.setItem("camp-audio-unlocked", "false");
      window.dispatchEvent(new Event("camp-audio-sync"));
      setAudioUnlocked(false);
      toast({ title: t('AUDIO_DISABLED_TITLE'), description: t('NAV_TIMER_AUDIO_SYNCED') });
      return;
    }

    try {
      if (!shortBeepRef.current) {
        shortBeepRef.current = new Audio(SHORT_BEEP_URL);
        shortBeepRef.current.preload = "auto";
      }

      shortBeepRef.current.currentTime = 0;
      shortBeepRef.current.volume = 1.0;
      await shortBeepRef.current.play();

      localStorage.setItem("camp-audio-unlocked", "true");
      window.dispatchEvent(new Event("camp-audio-sync"));
      setAudioUnlocked(true);
      toast({ title: t('AUDIO_LOCKED_TITLE'), description: t('NAV_TIMER_AUDIO_SYNCED') });
    } catch {
      toast({ title: t('AUDIO_UNLOCK_FAILED_TITLE'), description: t('AUDIO_UNLOCK_FAILED_DESC'), variant: "destructive" });
    }
  };

  const enterBlackoutMode = () => {
    router.push("/admin?tab=timer&saver=1");
  };

  const handleQuickAddPlan = (groupSlug: string, groupName: string) => {
    if (role !== "admin") {
      toast({ title: t('READONLY_TITLE'), description: t('READONLY_QUICK_ADD_DESC') });
      return;
    }

    const newId = addPlan(groupSlug);
    if (!newId) {
      toast({ title: t('FAILED'), description: t('PLAN_CREATE_FAILED_DESC'), variant: "destructive" });
      return;
    }

    toast({ title: t('PLAN_CREATED_QUICK'), description: t('PLAN_CREATED_QUICK_DESC', { name: groupName }) });
    router.push("/plans");
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncAudioState = () => {
      setAudioUnlocked(localStorage.getItem("camp-audio-unlocked") === "true");
    };

    syncAudioState();
    window.addEventListener("storage", syncAudioState);
    window.addEventListener("camp-audio-sync", syncAudioState as EventListener);
    return () => {
      window.removeEventListener("storage", syncAudioState);
      window.removeEventListener("camp-audio-sync", syncAudioState as EventListener);
    };
  }, []);

  useEffect(() => {
    const THRESHOLD = 10;

    const handleScroll = () => {
      const currentY = window.scrollY;
      if (Math.abs(currentY - lastScrollY.current) < THRESHOLD) return;
      const goingDown = currentY > lastScrollY.current && currentY > 60;
      setIsNavbarVisible(!goingDown);
      lastScrollY.current = currentY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [setIsNavbarVisible]);

  useEffect(() => {
    setActiveSubmenu(null);
  }, [pathname]);

  // Hide the floating dock on specific full-screen or sub routes if needed
  const isPlanDetail = /^\/plans\/[^/]+$/.test(pathname);

  return (
    <>
      {/* ── 1. TOP MINIMALIST ARCHITECTURAL HEADER (Logo on top) ── */}
      <header className={cn(
        "fixed top-0 left-0 w-full z-40 px-4 sm:px-8 py-3 sm:py-3.5 pointer-events-none transition-all duration-300",
        isScrolled
          ? "bg-[#FAF8F5]/90 dark:bg-[#0B1012]/90 backdrop-blur-md border-b border-stone-200/60 dark:border-white/10 shadow-2xs"
          : "bg-transparent border-b border-transparent"
      )}>
        <div className="max-w-[1720px] mx-auto flex items-center justify-between">
          {/* Left: Brand LOGO & Title */}
          <div className="pointer-events-auto">
            <Link href="/" className="flex items-center gap-3 group btn-tactile">
              <div className="relative w-8 h-8 rounded-full overflow-hidden bg-white/80 dark:bg-white/10 p-0.5 border border-hairline-light shadow-sm flex-shrink-0 transition-transform group-hover:scale-105">
                <Image
                  src="/NTUTCDlogo.png"
                  alt="NTUTCDlogo"
                  fill
                  sizes="32px"
                  className="object-cover rounded-full"
                  priority
                />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-xs font-bold tracking-wider text-foreground whitespace-nowrap">
                  北科崇德
                </span>
                <span className="text-[10px] font-mono tracking-technical text-fg-muted uppercase whitespace-nowrap">
                  NTUT CD CLUB
                </span>
              </div>
            </Link>
          </div>

          {/* Right: Operational Status & System Controls */}
          <div className="pointer-events-auto flex items-center gap-2 sm:gap-3">
            {/* Active Camp Badge */}
            {activeCamp && (
              <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono tracking-wider text-primary bg-primary/10 border border-primary/20">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse inline-block" />
                <span className="max-w-[140px] truncate uppercase">{activeCamp.name}</span>
              </div>
            )}

            {/* Active Live Collaborators */}
            {activePlanId && activeViewers && activeViewers.length > 0 && (
              <div className="flex items-center -space-x-1.5">
                {activeViewers.slice(0, 3).map((viewer) => {
                  const initials = viewer.name.slice(0, 2);
                  return (
                    <div
                      key={viewer.uid}
                      className="w-6 h-6 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center border border-canvas-dark shadow-sm"
                      title={viewer.name}
                    >
                      {initials}
                    </div>
                  );
                })}
              </div>
            )}

            {/* System Controls Dropdown (Theme, Quick Add, Audio) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full glass-pill border border-hairline-light hover:border-hairline-hover transition-all btn-tactile"
                  aria-label="System Menu"
                >
                  <Menu className="w-4 h-4 text-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-[320px] rounded-2xl glass-pill shadow-2xl p-3 border border-hairline-light"
              >
                <div className="flex flex-col gap-2.5">
                  <div className="rounded-xl bg-black/5 dark:bg-white/5 p-3 border border-hairline-light">
                    <button
                      type="button"
                      onClick={() => setIsQuickAddExpanded((prev) => !prev)}
                      className="w-full flex items-center justify-between gap-2 px-1 py-1 text-foreground"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Plus className="w-4 h-4 text-primary" />
                        <span className="font-medium text-sm">{t('QUICK_ADD_PLAN')}</span>
                      </span>
                      <ChevronUp
                        className={cn(
                          "w-4 h-4 transition-transform duration-300",
                          isQuickAddExpanded ? "rotate-0" : "rotate-180"
                        )}
                      />
                    </button>

                    {isQuickAddExpanded &&
                      (safeGroups.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2 pt-2">
                          {safeGroups.map((group) => (
                            <button
                              type="button"
                              key={group.id}
                              onClick={() => handleQuickAddPlan(group.slug, language === 'zh' ? group.nameZh : group.nameEn)}
                              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-left text-foreground bg-white/70 hover:bg-white dark:bg-white/10 dark:hover:bg-white/20 border border-hairline-light transition-all"
                            >
                              {language === 'zh' ? group.nameZh : group.nameEn}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="px-1 py-2 text-xs text-fg-muted">{t('NO_GROUP_AVAILABLE')}</div>
                      ))}
                  </div>

                  <button
                    type="button"
                    onClick={toggleAudioUnlock}
                    className="flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-all btn-tactile"
                  >
                    <span className="inline-flex items-center gap-2.5">
                      <Volume2 className="w-4 h-4 text-primary" />
                      {audioUnlocked ? t('AUDIO_DISABLE') : t('AUDIO_ENABLE')}
                    </span>
                    <span className="text-xs font-mono font-bold text-fg-muted">
                      {audioUnlocked ? t('AUDIO_STATUS_ON') : t('AUDIO_STATUS_OFF')}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={enterBlackoutMode}
                    className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl font-medium text-sm text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-all btn-tactile"
                  >
                    <Monitor className="w-4 h-4 text-primary" />
                    {t('ENTER_SAVER_MODE')}
                  </button>

                  <Link
                    href="/settings"
                    className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl font-medium text-sm text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-all btn-tactile"
                  >
                    <Settings className="w-4 h-4 text-primary" />
                    <span>{t('SETTINGS')}</span>
                  </Link>

                  <div className="pt-1">
                    <div className="flex items-center justify-between rounded-xl bg-black/5 dark:bg-white/5 px-3 py-2 border border-hairline-light">
                      <span className="text-xs font-medium text-foreground">{t('THEME_LABEL')}</span>
                      <ThemeToggle className="h-8 w-8 rounded-lg bg-white/80 dark:bg-white/10 border border-stone-200/80 dark:border-white/10" />
                    </div>
                    {activeCamp && (
                      <div className="pt-2 px-1">
                        <p className="text-[10px] font-mono uppercase tracking-wider text-fg-muted mb-0.5">{t('CURRENT_CAMP')}</p>
                        <p className="text-xs font-semibold text-foreground truncate">{activeCamp.name}</p>
                      </div>
                    )}
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* ── 2A. MOBILE BOTTOM BAR (Google Play M3 Style, edge-to-edge) ── */}
      <nav
        aria-label="Mobile Navigation"
        className={cn(
          "fixed bottom-0 inset-x-0 w-full z-50 md:hidden",
          "bg-[#FAF8F5]/95 dark:bg-[#0B1012]/95 backdrop-blur-2xl border-t border-stone-200/80 dark:border-white/10",
          "pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2 px-1",
          "shadow-[0_-4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.5)] transition-all duration-300",
          isPlanDetail ? "hidden" : "block"
        )}
      >
        <div className="grid grid-cols-5 items-center justify-items-center w-full max-w-lg mx-auto">
          {NAV_ITEMS.map((item) => {
            const active = isItemActive(item);
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleNavClick(item.href, item.adminTab)}
                className="flex flex-col items-center justify-center w-full py-0.5 focus:outline-none select-none cursor-pointer group"
                aria-label={t(item.labelKey)}
              >
                {/* M3 Active Oval Pill Capsule behind Icon */}
                <div className="relative w-11 sm:w-13 h-7 flex items-center justify-center rounded-full transition-all">
                  {active && (
                    <motion.div
                      layoutId="mobile-m3-active-pill"
                      className="absolute inset-0 rounded-full bg-orange-500/15 dark:bg-orange-500/25 border border-orange-500/20"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                  <Icon
                    className={cn(
                      "w-4 h-4 z-10 transition-all duration-200",
                      active
                        ? "text-orange-600 dark:text-orange-400 scale-105"
                        : "text-stone-500 dark:text-stone-400 group-hover:text-foreground"
                    )}
                    strokeWidth={active ? 2.2 : 1.7}
                  />
                </div>

                {/* Text Label Below Icon */}
                <span
                  className={cn(
                    "text-[10px] tracking-tight mt-1 transition-colors truncate max-w-full px-0.5 font-sans leading-none text-center",
                    active
                      ? "font-bold text-foreground"
                      : "font-medium text-stone-500 dark:text-stone-400 group-hover:text-foreground"
                  )}
                >
                  {t(item.labelKey)}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── 2B. DESKTOP BOTTOM FLOATING DOCK (Hidden on mobile) ── */}
      <div 
        className={cn(
          "hidden md:block fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 pointer-events-auto",
          isPlanDetail ? "opacity-90 hover:opacity-100" : "opacity-100"
        )}
      >
        <div 
          className="relative"
          onMouseLeave={handleMouseLeave}
        >
          {/* Upward-Floating Plans Submenu Sheet */}
          <AnimatePresence>
            {activeSubmenu === "plans" && (
              <motion.div
                initial={{ opacity: 0, y: 8, x: "-50%", scale: 0.96 }}
                animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
                exit={{ opacity: 0, y: 8, x: "-50%", scale: 0.96 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                  "absolute bottom-full mb-3 left-1/2 rounded-2xl p-3 backdrop-blur-[24px] z-50",
                  "bg-white/95 dark:bg-[#121619]/95 border border-stone-200/90 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)]",
                  "before:absolute before:top-full before:left-0 before:w-full before:h-4 before:content-['']",
                  planDropdownGroups.length <= 2
                    ? "w-[300px] sm:w-[380px]"
                    : planDropdownGroups.length === 3
                    ? "w-[340px] sm:w-[480px]"
                    : "w-[340px] sm:w-[560px]"
                )}
                onMouseEnter={() => {
                  if (closeSubmenuTimeoutRef.current) {
                    clearTimeout(closeSubmenuTimeoutRef.current);
                    closeSubmenuTimeoutRef.current = null;
                  }
                }}
                onMouseLeave={handleMouseLeave}
              >
                <div
                  className={cn(
                    "grid gap-2.5",
                    planDropdownGroups.length === 1 && "grid-cols-1",
                    planDropdownGroups.length === 2 && "grid-cols-2",
                    planDropdownGroups.length === 3 && "grid-cols-3",
                    planDropdownGroups.length >= 4 && "grid-cols-2 sm:grid-cols-4"
                  )}
                >
                  {planDropdownGroups.map((group) => {
                    const badgeParams = getUnifiedGroupBadgeParams(group.slug, group.nameZh);
                    return (
                      <Link
                        key={group.id}
                        href={`/plans?group=${encodeURIComponent(group.slug)}`}
                        onClick={() => setActiveSubmenu(null)}
                        className="p-3 rounded-xl bg-stone-50 hover:bg-white dark:bg-white/5 dark:hover:bg-white/10 border border-stone-200/80 dark:border-white/10 hover:border-primary/50 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group flex flex-col justify-between"
                      >
                        <div>
                          <div className="architectural-tag mb-1.5 flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full shrink-0 shadow-xs"
                              style={{ backgroundColor: badgeParams.uiBg }}
                            />
                            <span className="font-mono text-[9px] uppercase tracking-wider truncate text-fg-muted">
                              {group.nameEn || group.slug}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                            {language === "zh" ? group.nameZh : group.nameEn}
                          </div>
                        </div>
                        <div className="text-[10px] text-fg-secondary mt-1 line-clamp-1 font-medium">
                          {language === "zh" ? group.nameEn : group.nameZh}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Desktop Fluid Glass Capsule */}
          <nav className="glass-pill rounded-full border border-hairline-light shadow-[0_20px_50px_rgba(0,0,0,0.6)] p-1.5 flex items-center gap-1 sm:gap-1.5">
            {NAV_ITEMS.map((item) => {
              const active = isItemActive(item);
              const Icon = item.icon;
              if (item.key === "plans") {
                return (
                  <div
                    key={item.key}
                    className="relative"
                    onMouseEnter={() => handleMouseEnter("plans")}
                  >
                    <button
                      type="button"
                      onClick={() => handleNavClick(item.href)}
                      className={cn(
                        "px-3.5 py-1.5 rounded-full text-xs font-mono uppercase tracking-wider transition-all duration-200 btn-tactile inline-flex items-center justify-center gap-1.5 cursor-pointer",
                        active || activeSubmenu === "plans"
                          ? "bg-white dark:bg-white/15 text-foreground font-semibold shadow-sm"
                          : "text-fg-secondary hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10"
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{t(item.labelKey)}</span>
                      <ChevronUp
                        className={cn(
                          "w-3 h-3 transition-transform duration-200",
                          activeSubmenu === "plans" ? "rotate-180 text-primary opacity-100" : "opacity-60"
                        )}
                      />
                    </button>
                  </div>
                );
              }

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleNavClick(item.href, item.adminTab)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-full text-xs font-mono uppercase tracking-wider transition-all duration-200 btn-tactile inline-flex items-center justify-center gap-1.5 cursor-pointer",
                    active
                      ? "bg-white dark:bg-white/15 text-foreground font-semibold shadow-sm"
                      : "text-fg-secondary hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t(item.labelKey)}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
}
