"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { actionBarTheme } from "@/lib/actionbar-theme";
import { usePathname } from "next/navigation";
import { useActionBarStore } from "@/store/action-bar-store";

interface ActionBarProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  tone?: "warm" | "plain";
}

export function ActionBar({ children, title, className, tone = "warm" }: ActionBarProps) {
  const pathname = usePathname();
  const isNavbarVisible = useActionBarStore((s) => s.isNavbarVisible);
  const setIsNavbarVisible = useActionBarStore((s) => s.setIsNavbarVisible);
  const setHasActionBar = useActionBarStore((s) => s.setHasActionBar);

  const ref = useRef<HTMLDivElement>(null);

  // Register presence
  useEffect(() => {
    setHasActionBar(true);
    return () => {
      setHasActionBar(false);
      setIsNavbarVisible(true); // reset when ActionBar unmounts
    };
  }, [setHasActionBar, setIsNavbarVisible]);

  // Mobile keyboard visual viewport tracking (iOS Notes / Notion style)
  useEffect(() => {
    const handleViewportChange = () => {
      if (typeof window !== "undefined" && window.visualViewport && ref.current) {
        if (window.innerWidth < 768) {
          const offset = window.innerHeight - (window.visualViewport.height + window.visualViewport.offsetTop);
          const keyboardOffset = Math.max(0, offset);
          ref.current.style.bottom = `${keyboardOffset}px`;
          if (keyboardOffset > 10) {
            ref.current.style.paddingBottom = "0px";
          } else {
            ref.current.style.paddingBottom = "max(0.25rem, env(safe-area-inset-bottom))";
          }
        } else {
          ref.current.style.bottom = "";
          ref.current.style.paddingBottom = "";
        }
      }
    };

    window.visualViewport?.addEventListener("resize", handleViewportChange);
    window.visualViewport?.addEventListener("scroll", handleViewportChange);
    handleViewportChange();

    return () => {
      window.visualViewport?.removeEventListener("resize", handleViewportChange);
      window.visualViewport?.removeEventListener("scroll", handleViewportChange);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "max-md:fixed max-md:bottom-0 max-md:inset-x-0 max-md:top-auto max-md:z-[35] max-md:pb-[max(0.25rem,env(safe-area-inset-bottom))] max-md:pt-1 max-md:px-2 max-md:bg-white/95 max-md:dark:bg-[#0B1012]/95 max-md:backdrop-blur-2xl max-md:border-t max-md:border-stone-200/80 max-md:dark:border-white/10 max-md:shadow-[0_-4px_20px_rgba(0,0,0,0.06)] md:sticky md:z-[40] md:top-20 md:py-1.5 md:px-6 md:mb-6 transition-all duration-300",
        className
      )}
    >
      <div className="max-w-6xl mx-auto max-md:w-full md:glass-pill rounded-2xl md:rounded-full px-1.5 sm:px-5 py-0.5 sm:py-1.5 flex items-center justify-between gap-1 sm:gap-3 md:shadow-lg md:border md:border-white/40 md:dark:border-white/10">
        {/* Architectural Title Specification (Hidden on mobile, shown on desktop) */}
        {title && (
          <div className="hidden lg:flex items-center gap-2 architectural-tag whitespace-nowrap pl-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
            {title}
          </div>
        )}

        {/* Action Buttons - Responsive */}
        <div className="flex items-center gap-1 sm:gap-2 flex-nowrap overflow-x-auto scrollbar-hide justify-start sm:justify-center flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
