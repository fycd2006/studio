"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Home, FolderOpen, Clock, FileSpreadsheet, Package2, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n-context";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const TABS = [
  { key: "home", href: "/", icon: Home, labelKey: "NAV_HOME" as const },
  { key: "plans", href: "/plans", icon: FolderOpen, labelKey: "NAV_PLANS" as const },
  { key: "timer", href: "/admin?tab=timer", icon: Clock, labelKey: "NAV_TIMER" as const, adminTab: "timer" as const },
  { key: "tables", href: "/admin?tab=tables", icon: FileSpreadsheet, labelKey: "NAV_TABLES" as const, adminTab: "tables" as const },
  { key: "props", href: "/admin?tab=props", icon: Package2, labelKey: "NAV_PROPS" as const, adminTab: "props" as const },
];

/** Routes where the tab bar should NOT appear */
const HIDDEN_ROUTES = ["/login", "/signup", "/editor-mode"];

export function MobileTabBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useTranslation();

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

  const isTabActive = (tab: (typeof TABS)[number]) => {
    if (tab.adminTab) {
      return pathname === "/admin" && adminTab === tab.adminTab;
    }
    if (tab.href === "/") return pathname === "/";
    return pathname.startsWith(tab.href);
  };

  const handleNavClick = (href: string, targetAdminTab?: "timer" | "tables" | "props") => {
    if (targetAdminTab) {
      setAdminTab(targetAdminTab);
      window.dispatchEvent(new CustomEvent("admin-tab-change", { detail: targetAdminTab }));
    }
    router.push(href);
  };

  // Hide on auth pages, editor mode, plan detail pages
  const shouldHide =
    HIDDEN_ROUTES.some((r) => pathname.startsWith(r)) ||
    /^\/plans\/[^/]+$/.test(pathname);

  return (
    <AnimatePresence>
      {!shouldHide && (
        <nav
          aria-label="Mobile Navigation"
          className={cn(
            "fixed bottom-0 inset-x-0 w-full z-[60] md:hidden",
            "bg-[#FAF8F5]/95 dark:bg-[#0B1012]/95 backdrop-blur-2xl border-t border-stone-200/80 dark:border-white/10",
            "pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2 px-1",
            "shadow-[0_-4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.5)]"
          )}
        >
          <div className="grid grid-cols-5 items-center justify-items-center w-full max-w-lg mx-auto">
            {TABS.map((tab) => {
              const active = isTabActive(tab);
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handleNavClick(tab.href, tab.adminTab)}
                  className="flex flex-col items-center justify-center w-full py-0.5 focus:outline-none select-none cursor-pointer group"
                  aria-label={t(tab.labelKey)}
                >
                  <div className="relative w-11 sm:w-13 h-7 flex items-center justify-center rounded-full transition-all">
                    {active && (
                      <motion.div
                        layoutId="mobile-standalone-m3-active-pill"
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

                  <span
                    className={cn(
                      "text-[10px] tracking-tight mt-1 transition-colors truncate max-w-full px-0.5 font-sans leading-none text-center",
                      active
                        ? "font-bold text-foreground"
                        : "font-medium text-stone-500 dark:text-stone-400 group-hover:text-foreground"
                    )}
                  >
                    {t(tab.labelKey)}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </AnimatePresence>
  );
}
