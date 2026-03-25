"use client";

import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

interface ActionBarProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export function ActionBar({ children, title, className }: ActionBarProps) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <div
      className={cn(
        "sticky z-40 top-[104px] md:top-16 transition-colors duration-300",
        isHome
          ? "bg-transparent border-transparent py-1 md:py-2"
          : "bg-white/85 dark:bg-[hsl(var(--bar-theme))] backdrop-blur-xl dark:backdrop-blur-none border-b border-stone-200/70 dark:border-[hsl(var(--bar-theme-border))] py-2",
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
