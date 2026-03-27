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
  ChevronDown,
  Plus,
  Volume2,
  Monitor,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlans } from "@/hooks/use-plans";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";

const NAV_ITEMS = [
  { label: "Home", href: "/", icon: Home },
  { label: "Plans", href: "/plans", icon: FolderOpen },
  { label: "Admin", href: "/admin", icon: ShieldCheck },
  { label: "Settings", href: "/settings", icon: Settings },
] as const;

interface NavbarProps {
  groups?: Array<{ id: string; slug: string; nameZh: string; nameEn: string }>;
}

export function TransparentNavbar({ groups }: NavbarProps) {
  const SHORT_BEEP_URL = "/beep.wav";
  const [activeMegaMenu, setActiveMegaMenu] = useState<"plans" | "admin" | null>(null);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [isQuickAddExpanded, setIsQuickAddExpanded] = useState(false);

  // Read scroll state from store (ActionBar writes it)
  const isNavbarVisible = useActionBarStore((s) => s.isNavbarVisible);
  const setIsNavbarVisible = useActionBarStore((s) => s.setIsNavbarVisible);
  const hasActionBar = useActionBarStore((s) => s.hasActionBar);

  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { role } = useAuth();
  const { camps, activeCampId, groups: allGroups, addPlan } = usePlans();
  const isHome = pathname === "/";
  const lastScrollY = useRef(0);
  const shortBeepRef = useRef<HTMLAudioElement | null>(null);

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

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const isMenuOpen = activeMegaMenu !== null;
  const navTextClass = "text-[#2C2A28] dark:text-white hover:opacity-80";
  const navIconClass = "text-[#2C2A28] dark:text-white hover:opacity-80";

  const planDropdownGroups = safeGroups.slice(0, 10);
  const adminDropdownItems = [
    { label: "計時控制", href: "/admin?tab=timer" },
    { label: "輪替表", href: "/admin?tab=tables" },
    { label: "道具清單", href: "/admin?tab=props" },
  ];

  const toggleAudioUnlock = async () => {
    if (audioUnlocked) {
      localStorage.setItem("camp-audio-unlocked", "false");
      window.dispatchEvent(new Event("camp-audio-sync"));
      setAudioUnlocked(false);
      toast({ title: "音效已關閉", description: "已同步到 Timer 音效狀態。" });
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
      toast({ title: "音效已解鎖", description: "已同步到 Timer 音效狀態。" });
    } catch {
      toast({ title: "音效解鎖失敗", description: "請再點一次或確認瀏覽器權限。", variant: "destructive" });
    }
  };

  const enterBlackoutMode = () => {
    router.push("/admin?tab=timer&saver=1");
  };

  const handleQuickAddPlan = (groupSlug: string, groupName: string) => {
    if (role !== "admin") {
      toast({ title: "🔒 唯讀模式", description: "僅管理員可快速新增教案。" });
      return;
    }

    const newId = addPlan(groupSlug);
    if (!newId) {
      toast({ title: "建立失敗", description: "目前無法新增教案，請稍後再試。", variant: "destructive" });
      return;
    }

    toast({ title: "已快速新增", description: `已新增「${groupName}」教案。` });
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
      if (process.env.NODE_ENV !== "production") {
        console.log("[Navbar scrollY]", currentY);
      }

      if (Math.abs(currentY - lastScrollY.current) < THRESHOLD) return;
      const goingDown = currentY > lastScrollY.current && currentY > 60;
      setIsNavbarVisible(!goingDown);
      lastScrollY.current = currentY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [setIsNavbarVisible]);

  return (
    <>
      <nav
        className={cn(
          "fixed top-0 left-0 w-full z-50 transition-all duration-300 ease-in-out",
          isHome
            ? "bg-transparent border-none"
            : "bg-[#FBF9F6] dark:bg-[hsl(var(--bar-theme))] border-none shadow-none",
          !isNavbarVisible && hasActionBar
            ? "max-md:-translate-y-full"
            : "max-md:translate-y-0"
        )}
      >
        <div
          className={cn(
            "relative",
            isHome ? "bg-transparent border-none" : "bg-transparent"
          )}
          onMouseLeave={() => setActiveMegaMenu(null)}
        >
          <div className="hidden md:flex items-center justify-between px-6 py-4 h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center gap-3 min-w-0">
                <div className="relative w-10 h-10 rounded-full overflow-hidden bg-transparent dark:bg-white shadow-[0_4px_14px_rgba(0,0,0,0.35)] flex-shrink-0">
                  <Image
                    src="/NTUTCDlogo.png"
                    alt="NTUTCDlogo"
                    fill
                    sizes="40px"
                    className="object-cover"
                    priority
                  />
                </div>
                <div className="flex flex-col leading-tight text-[#2C2A28] dark:text-white min-w-0">
                  <span className="text-[1.02rem] font-black tracking-[0.02em] truncate">
                    NTUT Chong De Camp
                  </span>
                  <span className="text-[0.68rem] font-semibold tracking-[0.08em] text-slate-700 dark:text-white/95">
                    北科崇德青年社
                  </span>
                </div>
              </Link>
            </div>

            <div className="flex items-center gap-8 justify-center">
              <Link
                href="/"
                className={cn(
                  "font-bold tracking-widest uppercase text-base md:text-lg transition-colors duration-300 ",
                  isActive("/")
                    ? "text-[#2C2A28] dark:text-white underline underline-offset-8"
                    : "text-[#2C2A28] dark:text-white hover:text-orange-600 dark:hover:text-orange-200"
                )}
              >
                Home
              </Link>

              <div className="relative group" onMouseEnter={() => setActiveMegaMenu("plans")}>
                <Link
                  href="/plans"
                  className={cn(
                    "font-bold tracking-widest uppercase text-base md:text-lg transition-colors duration-300 inline-flex items-center gap-1 ",
                    isActive("/plans")
                      ? "text-[#2C2A28] dark:text-white underline underline-offset-8"
                      : "text-[#2C2A28] dark:text-white hover:text-orange-600 dark:hover:text-orange-200"
                  )}
                >
                  Plans
                  <ChevronDown className={cn("w-3.5 h-3.5 opacity-90", navIconClass)} />
                </Link>
              </div>

              <div className="relative group" onMouseEnter={() => setActiveMegaMenu("admin")}>
                <Link
                  href="/admin"
                  className={cn(
                    "font-bold tracking-widest uppercase text-base md:text-lg transition-colors duration-300 inline-flex items-center gap-1 ",
                    isActive("/admin")
                      ? "text-[#2C2A28] dark:text-white underline underline-offset-8"
                      : "text-[#2C2A28] dark:text-white hover:text-orange-600 dark:hover:text-orange-200"
                  )}
                >
                  Admin
                  <ChevronDown className={cn("w-3.5 h-3.5 opacity-90", navIconClass)} />
                </Link>
              </div>

              <Link
                href="/settings"
                className={cn(
                  "font-bold tracking-widest uppercase text-base md:text-lg transition-colors duration-300 ",
                  isActive("/settings")
                    ? "text-[#2C2A28] dark:text-white underline underline-offset-8"
                    : "text-[#2C2A28] dark:text-white hover:text-orange-600 dark:hover:text-orange-200"
                )}
              >
                Settings
              </Link>
            </div>

            <div className="flex items-center gap-4">
              {activeCamp && (
                <div
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-semibold text-[#2C2A28] dark:text-white bg-white/25 dark:bg-white/15 backdrop-blur-sm"
                  )}
                >
                  {activeCamp.name}
                </div>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-9 w-9 rounded-lg bg-transparent transition-colors duration-300 hover:bg-white/15",
                      navIconClass
                    )}
                    aria-label="Desktop navigation menu"
                  >
                    <Menu className={cn("w-5 h-5", navIconClass)} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-[360px] rounded-2xl bg-[#FBF9F6] dark:bg-black/80 backdrop-blur-md shadow-2xl p-3 border-none"
                >
                  <div className="flex flex-col gap-3">
                    <div className="rounded-xl bg-stone-100/70 dark:bg-white/10 p-3">
                      <button
                        type="button"
                        onClick={() => setIsQuickAddExpanded((prev) => !prev)}
                        className="w-full flex items-center justify-between gap-2 px-1 py-1 text-[#2C2A28] dark:text-white"
                      >
                        <span className="inline-flex items-center gap-2">
                          <Plus className="w-5 h-5" />
                          <span className="font-semibold">快速新增教案</span>
                        </span>
                        <ChevronDown
                          className={cn(
                            "w-4 h-4 transition-transform duration-300",
                            isQuickAddExpanded ? "rotate-180" : "rotate-0"
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
                                onClick={() => handleQuickAddPlan(group.slug, group.nameZh)}
                                className="rounded-lg px-3 py-2 text-sm font-semibold text-left text-[#2C2A28] bg-white/80 hover:bg-white dark:bg-white/10 dark:text-white dark:hover:bg-white/20 transition-colors duration-300"
                              >
                                {group.nameZh}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="px-1 py-2 text-sm text-stone-500 dark:text-slate-300">目前沒有可新增的類群</div>
                        ))}
                    </div>

                    <button
                      type="button"
                      onClick={toggleAudioUnlock}
                      className="flex items-center justify-between px-4 py-3 rounded-lg font-semibold transition-all duration-300 text-[#2C2A28] hover:bg-stone-100 dark:text-white dark:hover:bg-white/15 border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow"
                    >
                      <span className="inline-flex items-center gap-3">
                        <Volume2 className="w-5 h-5 text-[#2C2A28] dark:text-white" />
                        {audioUnlocked ? "關閉音效" : "音效解鎖"}
                      </span>
                      <span className="text-xs font-bold text-stone-500 dark:text-slate-300">
                        {audioUnlocked ? "已開啟" : "已關閉"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={enterBlackoutMode}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-all duration-300 text-[#2C2A28] hover:bg-stone-100 dark:text-white dark:hover:bg-white/15 border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow"
                    >
                      <Monitor className="w-5 h-5 text-[#2C2A28] dark:text-white" />
                      進入省電模式
                    </button>

                    <div className="pt-2">
                      <div className="flex items-center justify-between rounded-xl bg-stone-100/70 dark:bg-white/10 px-3 py-2">
                        <span className="text-sm font-semibold text-[#2C2A28] dark:text-white">Theme</span>
                        <ThemeToggle className="h-9 w-9 rounded-lg bg-white dark:bg-slate-900" />
                      </div>
                      {activeCamp && (
                        <div className="pt-3">
                          <p className="text-xs text-stone-600 dark:text-white/80 mb-1">Current Camp</p>
                          <p className="font-semibold text-[#2C2A28] dark:text-white">{activeCamp.name}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div
            className={cn(
              "hidden md:block absolute top-full left-0 w-full origin-top transition-all duration-300 ease-out",
              activeMegaMenu ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-2 pointer-events-none"
            )}
            onMouseEnter={() => setActiveMegaMenu((prev) => prev ?? "plans")}
          >
            <div
              className={cn(
                "w-full border-none rounded-t-none",
                isHome
                  ? "bg-transparent shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
                  : "border-none shadow-none bg-[#FBF9F6] dark:bg-[hsl(var(--bar-theme))]"
              )}
            >
              <div className="max-w-6xl mx-auto px-6 py-6">
                {activeMegaMenu === "plans" && (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {(planDropdownGroups.length > 0
                      ? planDropdownGroups
                      : [
                          { id: "activity", slug: "activity", nameZh: "活動組", nameEn: "Activity" },
                          { id: "teaching", slug: "teaching", nameZh: "教學組", nameEn: "Teaching" },
                        ]
                    ).map((group) => (
                      <Link
                        key={group.id}
                        href={`/plans?group=${group.slug}`}
                        className="block rounded-lg px-4 py-3 bg-white/5 dark:bg-black/20 text-[#2C2A28] dark:text-white hover:bg-white/20 dark:hover:bg-black/40 transition-all duration-300 transform hover:-translate-y-0.5 shadow-[0_8px_30px_rgba(140,120,100,0.05)]"
                      >
                        <p className="font-semibold">{group.nameZh}</p>
                        <p className="text-[11px] uppercase tracking-wide text-slate-700 dark:text-white/80">{group.nameEn}</p>
                      </Link>
                    ))}
                  </div>
                )}

                {activeMegaMenu === "admin" && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {adminDropdownItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="block rounded-lg px-4 py-3 bg-transparent text-[#2C2A28] dark:text-white font-semibold"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="md:hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 min-h-16">
              <Link href="/" className="flex items-center gap-2.5 flex-1 pr-2 min-w-0">
                <div className="relative w-9 h-9 rounded-full overflow-hidden bg-transparent dark:bg-white shadow-[0_4px_14px_rgba(0,0,0,0.35)] flex-shrink-0">
                  <Image
                    src="/NTUTCDlogo.png"
                    alt="NTUTCDlogo"
                    fill
                    sizes="36px"
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-col leading-tight text-[#2C2A28] dark:text-white">
                  <span className="text-[0.82rem] font-extrabold tracking-[0.01em]">
                    NTUT Chong De Camp
                  </span>
                  <span className="text-[0.61rem] font-semibold tracking-[0.04em] text-slate-700 dark:text-white/95">
                    北科崇德青年社
                  </span>
                </div>
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      "p-2 rounded-lg transition-colors duration-300 bg-transparent text-[#2C2A28] dark:text-white hover:bg-white/15"
                    )}
                    aria-label="Open menu"
                  >
                    <Menu className={cn("w-5 h-5", navIconClass)} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-[92vw] max-w-[360px] rounded-2xl bg-[#FBF9F6] dark:bg-black/80 backdrop-blur-md shadow-2xl p-3 border-none"
                >
                  <div className="flex flex-col gap-3">
                    <div className="rounded-xl bg-stone-100/70 dark:bg-white/10 p-3">
                      <button
                        type="button"
                        onClick={() => setIsQuickAddExpanded((prev) => !prev)}
                        className="w-full flex items-center justify-between gap-2 px-1 py-1 text-[#2C2A28] dark:text-white"
                      >
                        <span className="inline-flex items-center gap-2">
                          <Plus className="w-5 h-5" />
                          <span className="font-semibold">快速新增教案</span>
                        </span>
                        <ChevronDown
                          className={cn(
                            "w-4 h-4 transition-transform duration-300",
                            isQuickAddExpanded ? "rotate-180" : "rotate-0"
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
                                onClick={() => handleQuickAddPlan(group.slug, group.nameZh)}
                                className="rounded-lg px-3 py-2 text-sm font-semibold text-left text-[#2C2A28] bg-white/80 hover:bg-white dark:bg-white/10 dark:text-white dark:hover:bg-white/20 transition-colors duration-300"
                              >
                                {group.nameZh}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="px-1 py-2 text-sm text-stone-500 dark:text-slate-300">目前沒有可新增的類群</div>
                        ))}
                    </div>

                    <button
                      type="button"
                      onClick={toggleAudioUnlock}
                      className="flex items-center justify-between px-4 py-3 rounded-lg font-semibold transition-all duration-300 text-[#2C2A28] hover:bg-stone-100 dark:text-white dark:hover:bg-white/15 border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow"
                    >
                      <span className="inline-flex items-center gap-3">
                        <Volume2 className="w-5 h-5 text-[#2C2A28] dark:text-white" />
                        {audioUnlocked ? "關閉音效" : "音效解鎖"}
                      </span>
                      <span className="text-xs font-bold text-stone-500 dark:text-slate-300">
                        {audioUnlocked ? "已開啟" : "已關閉"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={enterBlackoutMode}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-all duration-300 text-[#2C2A28] hover:bg-stone-100 dark:text-white dark:hover:bg-white/15 border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow"
                    >
                      <Monitor className="w-5 h-5 text-[#2C2A28] dark:text-white" />
                      進入省電模式
                    </button>

                    <div className="pt-2">
                      <div className="flex items-center justify-between rounded-xl bg-stone-100/70 dark:bg-white/10 px-3 py-2">
                        <span className="text-sm font-semibold text-[#2C2A28] dark:text-white">Theme</span>
                        <ThemeToggle className="h-9 w-9 rounded-lg bg-white dark:bg-slate-900" />
                      </div>
                      {activeCamp && (
                        <div className="pt-3">
                          <p className="text-xs text-stone-600 dark:text-white/80 mb-1">Current Camp</p>
                          <p className="font-semibold text-[#2C2A28] dark:text-white">{activeCamp.name}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="px-4 pb-3">
              <div className="grid grid-cols-4 items-center text-center gap-2 w-full max-w-md mx-auto">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "text-[0.94rem] font-black uppercase tracking-wide whitespace-nowrap transition-colors duration-300 ",
                      isActive(item.href)
                        ? "text-[#2C2A28] dark:text-white underline underline-offset-8"
                        : "text-[#2C2A28] dark:text-white hover:text-orange-600 dark:hover:text-orange-200"
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </nav>

    </>
  );
}
