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

  return (
    <div
      ref={ref}
      className={cn(
        "sticky z-[45] top-0 md:top-16 transition-all duration-300",
        tone === "plain"
          ? "bg-transparent"
          : actionBarTheme.shell,
        "py-1",
        "w-[100vw] ml-[calc(-50vw+50%)] px-4 md:px-8 lg:px-10 mb-1 md:mb-5",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 max-w-none w-full min-h-[38px]">
        {/* Title (Hidden on mobile, shown on desktop) */}
        {title && (
          <div className="hidden lg:block font-extrabold text-stone-500 dark:text-slate-400 text-[10px] uppercase tracking-[0.22em] whitespace-nowrap">
            {title}
          </div>
        )}

        {/* Action Buttons - Responsive */}
        <div className="flex items-center gap-2 flex-nowrap overflow-x-auto scrollbar-hide justify-center flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
