"use client";

import { useEffect, useRef, useState } from "react";
import { useActionBarStore } from "@/store/action-bar-store";
import { usePathname, useRouter } from "next/navigation";
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

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
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
      <header className="fixed top-0 left-0 w-full z-40 px-4 sm:px-8 py-3.5 pointer-events-none transition-all duration-300">
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

      {/* ── 2. BOTTOM FLOATING CAPSULE NAV ISLAND (Fluid Glass signature dock) ── */}
      <div 
        className={cn(
          "fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 pointer-events-auto",
          isPlanDetail ? "max-md:hidden opacity-90 hover:opacity-100" : "opacity-100"
        )}
      >
        <div 
          className="relative"
          onMouseLeave={handleMouseLeave}
        >
          {/* Mobile backdrop to dismiss upward submenu on click outside */}
          {activeSubmenu && (
            <div
              className="fixed inset-0 z-40 sm:hidden"
              onClick={() => setActiveSubmenu(null)}
            />
          )}

          {/* Upward-Floating Submenu Sheet (Detached from the capsule) */}
          <AnimatePresence>
            {activeSubmenu && (
              <motion.div
                initial={{ opacity: 0, y: 8, x: "-50%", scale: 0.96 }}
                animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
                exit={{ opacity: 0, y: 8, x: "-50%", scale: 0.96 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                  "absolute bottom-full mb-3 left-1/2 rounded-2xl p-3 backdrop-blur-[24px] max-w-[calc(100vw-32px)] z-50",
                  "bg-white/95 dark:bg-[#121619]/95 border border-stone-200/90 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)]",
                  "before:absolute before:top-full before:left-0 before:w-full before:h-4 before:content-['']",
                  activeSubmenu === "plans"
                    ? planDropdownGroups.length <= 2
                      ? "w-[300px] sm:w-[380px]"
                      : planDropdownGroups.length === 3
                      ? "w-[340px] sm:w-[480px]"
                      : "w-[340px] sm:w-[560px]"
                    : "w-[340px] sm:w-[480px]"
                )}
                onMouseEnter={() => {
                  if (closeSubmenuTimeoutRef.current) {
                    clearTimeout(closeSubmenuTimeoutRef.current);
                    closeSubmenuTimeoutRef.current = null;
                  }
                }}
                onMouseLeave={handleMouseLeave}
              >
                {activeSubmenu === "plans" && (
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
                )}

                {activeSubmenu === "admin" && (
                  <div className="grid grid-cols-3 gap-2.5">
                    <Link
                      href="/admin?tab=timer"
                      onClick={() => setActiveSubmenu(null)}
                      className="p-3 rounded-xl bg-stone-50 hover:bg-white dark:bg-white/5 dark:hover:bg-white/10 border border-stone-200/80 dark:border-white/10 hover:border-primary/50 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group flex flex-col justify-between"
                    >
                      <div>
                        <div className="architectural-tag mb-1.5 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-primary" />
                          <span>TIMER</span>
                        </div>
                        <div className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                          {t('TIMER_CONTROL')}
                        </div>
                      </div>
                      <div className="text-[10px] text-fg-secondary mt-1 line-clamp-1 font-medium">
                        Countdown & Audio
                      </div>
                    </Link>

                    <Link
                      href="/admin?tab=tables"
                      onClick={() => setActiveSubmenu(null)}
                      className="p-3 rounded-xl bg-stone-50 hover:bg-white dark:bg-white/5 dark:hover:bg-white/10 border border-stone-200/80 dark:border-white/10 hover:border-primary/50 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group flex flex-col justify-between"
                    >
                      <div>
                        <div className="architectural-tag mb-1.5 flex items-center gap-1">
                          <FileSpreadsheet className="w-3 h-3 text-primary" />
                          <span>ROTATION</span>
                        </div>
                        <div className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                          {t('ROTATION_TABLE')}
                        </div>
                      </div>
                      <div className="text-[10px] text-fg-secondary mt-1 line-clamp-1 font-medium">
                        Stations & Schedule
                      </div>
                    </Link>

                    <Link
                      href="/admin?tab=props"
                      onClick={() => setActiveSubmenu(null)}
                      className="p-3 rounded-xl bg-stone-50 hover:bg-white dark:bg-white/5 dark:hover:bg-white/10 border border-stone-200/80 dark:border-white/10 hover:border-primary/50 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group flex flex-col justify-between"
                    >
                      <div>
                        <div className="architectural-tag mb-1.5 flex items-center gap-1">
                          <Package2 className="w-3 h-3 text-primary" />
                          <span>PROPS</span>
                        </div>
                        <div className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                          {t('PROPS_LIST')}
                        </div>
                      </div>
                      <div className="text-[10px] text-fg-secondary mt-1 line-clamp-1 font-medium">
                        Items & Checklist
                      </div>
                    </Link>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Fluid Glass Capsule Dock Island */}
          <nav className="glass-pill rounded-full border border-hairline-light shadow-[0_20px_50px_rgba(0,0,0,0.6)] p-1.5 flex items-center gap-1 sm:gap-1.5">
            {/* Home Tab */}
            <Link
              href="/"
              aria-label={t('NAV_HOME')}
              className={cn(
                "w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2 rounded-full text-xs font-mono uppercase tracking-wider transition-all duration-200 btn-tactile inline-flex items-center justify-center gap-1.5",
                isActive("/")
                  ? "bg-white dark:bg-white/15 text-foreground font-semibold shadow-sm"
                  : "text-fg-secondary hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10"
              )}
            >
              <Home className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">{t('NAV_HOME')}</span>
            </Link>

            {/* Plans Tab with Upward Submenu Indicator */}
            <div
              className="relative"
              onMouseEnter={() => handleMouseEnter("plans")}
            >
              <Link
                href="/plans"
                aria-label={t('NAV_PLANS')}
                onClick={() => setActiveSubmenu((prev) => (prev === "plans" ? null : "plans"))}
                className={cn(
                  "w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2 rounded-full text-xs font-mono uppercase tracking-wider transition-all duration-200 btn-tactile inline-flex items-center justify-center gap-1.5",
                  isActive("/plans") || activeSubmenu === "plans"
                    ? "bg-white dark:bg-white/15 text-foreground font-semibold shadow-sm"
                    : "text-fg-secondary hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10"
                )}
              >
                <FolderOpen className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                <span className="hidden sm:inline whitespace-nowrap">{t('NAV_PLANS')}</span>
                <ChevronUp
                  className={cn(
                    "w-3 h-3 transition-transform duration-200 hidden sm:inline-block",
                    activeSubmenu === "plans" ? "rotate-180 text-primary opacity-100" : "opacity-60"
                  )}
                />
              </Link>
            </div>

            {/* Admin Tab with Upward Submenu Indicator */}
            <div
              className="relative"
              onMouseEnter={() => handleMouseEnter("admin")}
            >
              <Link
                href="/admin"
                aria-label={t('NAV_ADMIN')}
                onClick={() => setActiveSubmenu((prev) => (prev === "admin" ? null : "admin"))}
                className={cn(
                  "w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2 rounded-full text-xs font-mono uppercase tracking-wider transition-all duration-200 btn-tactile inline-flex items-center justify-center gap-1.5",
                  isActive("/admin") || activeSubmenu === "admin"
                    ? "bg-white dark:bg-white/15 text-foreground font-semibold shadow-sm"
                    : "text-fg-secondary hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10"
                )}
              >
                <ShieldCheck className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                <span className="hidden sm:inline whitespace-nowrap">{t('NAV_ADMIN')}</span>
                <ChevronUp
                  className={cn(
                    "w-3 h-3 transition-transform duration-200 hidden sm:inline-block",
                    activeSubmenu === "admin" ? "rotate-180 text-primary opacity-100" : "opacity-60"
                  )}
                />
              </Link>
            </div>

            {/* Settings Tab */}
            <Link
              href="/settings"
              aria-label={t('NAV_SETTINGS')}
              className={cn(
                "w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2 rounded-full text-xs font-mono uppercase tracking-wider transition-all duration-200 btn-tactile inline-flex items-center justify-center gap-1.5",
                isActive("/settings")
                  ? "bg-white dark:bg-white/15 text-foreground font-semibold shadow-sm"
                  : "text-fg-secondary hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10"
              )}
            >
              <Settings className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">{t('NAV_SETTINGS')}</span>
            </Link>
          </nav>
        </div>
      </div>
    </>
  );
}
