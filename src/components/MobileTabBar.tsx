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
          initial={{ y: "150%", opacity: 0, x: "-50%" }}
          animate={{ y: 0, opacity: 1, x: "-50%" }}
          exit={{ y: "150%", opacity: 0, x: "-50%" }}
          transition={{ type: "spring", stiffness: 400, damping: 40 }}
          className={cn(
            "fixed bottom-6 left-1/2 z-[60] md:hidden w-[calc(100%-2rem)] max-w-sm",
            "glass-pill rounded-full p-1.5",
            "border border-hairline-light shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
          )}
        >
          <div className="flex items-center justify-around h-14 px-1 relative">
            {TABS.map((tab) => {
              const active = isActive(tab.href, pathname);
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => router.push(tab.href)}
                  className={cn(
                    "relative flex flex-col items-center justify-center w-full h-full gap-0.5 transition-colors z-10",
                    "focus:outline-none"
                  )}
                >
                  {/* Sliding Highlight Indicator */}
                  {active && (
                    <motion.div
                      layoutId="mobile-tab-indicator"
                      className="absolute inset-0 rounded-full bg-white/10 dark:bg-white/10 -z-10 border border-hairline-light"
                      initial={false}
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                  
                  <motion.div 
                    whileTap={{ scale: 0.88 }} 
                    className="flex flex-col items-center justify-center w-full h-full"
                  >
                    <Icon
                      className={cn(
                        "w-4 h-4 transition-all duration-300",
                        active ? "text-primary scale-105" : "text-fg-secondary"
                      )}
                      strokeWidth={active ? 2.2 : 1.7}
                    />
                    <span
                      className={cn(
                        "text-[9px] font-mono uppercase tracking-wider transition-all duration-300 mt-0.5",
                        active 
                          ? "font-semibold text-foreground" 
                          : "font-normal text-fg-secondary"
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
