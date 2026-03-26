"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { useActionBarStore } from "@/store/action-bar-store";

interface ActionBarProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export function ActionBar({ children, title, className }: ActionBarProps) {
  const pathname = usePathname();
  const isHome = pathname === "/";
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

  return (
    <div
      ref={ref}
      className={cn(
        "sticky z-40 md:top-16 transition-all duration-300",
        isNavbarVisible ? "top-[104px]" : "top-0",
        isHome
          ? "bg-transparent border-transparent py-1 md:py-2"
          : "bg-stone-50 dark:bg-[hsl(var(--bar-theme))] border-b border-stone-200/70 dark:border-[hsl(var(--bar-theme-border))] py-2",
        "-mx-4 md:-mx-8 lg:-mx-10 px-4 md:px-8 lg:px-10 mb-4 md:mb-6"
      )}
    >
      <div className="flex items-center justify-between gap-4 max-w-none w-full">
        {/* Title (Hidden on mobile, shown on desktop) */}
        <div className="hidden md:block font-bold text-slate-900 dark:text-white text-sm tracking-wider">
          {title}
        </div>

        {/* Action Buttons - Responsive */}
        <div className={cn("flex items-center gap-2 flex-wrap justify-end flex-1 md:justify-center md:flex-1", className)}>
          {children}
        </div>
      </div>
    </div>
  );
}
