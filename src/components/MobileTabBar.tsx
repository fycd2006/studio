"use client"

import { usePathname, useRouter } from "next/navigation";
import { Home, FileText, Shield, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n-context";
import { useActionBarStore } from "@/store/action-bar-store";
import { AnimatePresence, motion } from "framer-motion";

const TABS = [
  { key: "home", href: "/", icon: Home, labelKey: "NAV_HOME" as const },
  { key: "plans", href: "/plans", icon: FileText, labelKey: "NAV_PLANS" as const },
  { key: "admin", href: "/admin", icon: Shield, labelKey: "NAV_ADMIN" as const },
  { key: "settings", href: "/settings", icon: Settings, labelKey: "NAV_SETTINGS" as const },
];

/** Routes where the tab bar should NOT appear */
const HIDDEN_ROUTES = ["/login", "/signup", "/editor-mode"];

/** Check if a tab is active based on the current pathname */
function isActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function MobileTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useTranslation();
  const isFullscreen = useActionBarStore((s) => s.isFullscreen);

  // Hide on auth pages, editor mode, plan detail pages
  const shouldHide =
    HIDDEN_ROUTES.some((r) => pathname.startsWith(r)) ||
    /^\/plans\/[^/]+$/.test(pathname);

  return (
    <AnimatePresence>
      {!shouldHide && (
        <motion.nav
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 40 }}
          className={cn(
            "fixed bottom-0 inset-x-0 z-[60] md:hidden",
            "bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl saturate-150",
            "border-t border-white/20 dark:border-white/5",
            "shadow-[0_-8px_30px_rgba(140,120,100,0.06)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.4)]"
          )}
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          <div className="flex items-center justify-around h-[68px] px-2 relative">
            {TABS.map((tab) => {
              const active = isActive(tab.href, pathname);
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => router.push(tab.href)}
                  className={cn(
                    "relative flex flex-col items-center justify-center w-full h-full gap-1 transition-colors z-10",
                    "focus:outline-none"
                  )}
                >
                  {/* Sliding Highlight Indicator */}
                  {active && (
                    <motion.div
                      layoutId="mobile-tab-indicator"
                      className="absolute inset-0 m-1 rounded-2xl bg-stone-100/80 dark:bg-slate-800/80 -z-10 shadow-sm border border-white/40 dark:border-white/5"
                      initial={false}
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                  
                  <motion.div 
                    whileTap={{ scale: 0.85 }} 
                    className="flex flex-col items-center justify-center w-full h-full"
                  >
                    <Icon
                      className={cn(
                        "w-[22px] h-[22px] transition-all duration-300",
                        active ? "text-orange-500 dark:text-amber-500 scale-110 drop-shadow-sm" : "text-stone-400 dark:text-slate-500"
                      )}
                      strokeWidth={active ? 2.5 : 2}
                    />
                    <span
                      className={cn(
                        "text-[10px] tracking-wide transition-all duration-300 mt-1",
                        active 
                          ? "font-extrabold text-orange-600 dark:text-amber-500" 
                          : "font-semibold text-stone-400 dark:text-slate-500"
                      )}
                    >
                      {t(tab.labelKey)}
                    </span>
                  </motion.div>
                </button>
              );
            })}
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
