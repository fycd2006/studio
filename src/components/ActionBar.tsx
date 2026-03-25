"use client";

import { useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { useActionBarStore } from "@/store/action-bar-store";

interface ActionBarProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

/**
 * Find the closest ancestor element that has overflow-y scrolling.
 * Falls back to `document.documentElement` (the page itself).
 */
function getScrollParent(el: HTMLElement | null): HTMLElement {
  let node = el?.parentElement;
  while (node && node !== document.documentElement) {
    const style = getComputedStyle(node);
    if (/(auto|scroll)/.test(style.overflowY)) return node;
    node = node.parentElement;
  }
  return document.documentElement;
}

export function ActionBar({ children, title, className }: ActionBarProps) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isNavbarVisible = useActionBarStore((s) => s.isNavbarVisible);
  const setIsNavbarVisible = useActionBarStore((s) => s.setIsNavbarVisible);
  const setHasActionBar = useActionBarStore((s) => s.setHasActionBar);

  const ref = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);

  // Register presence
  useEffect(() => {
    setHasActionBar(true);
    return () => {
      setHasActionBar(false);
      setIsNavbarVisible(true); // reset when ActionBar unmounts
    };
  }, [setHasActionBar, setIsNavbarVisible]);

  // Scroll direction detection on the actual scrollable container
  useEffect(() => {
    const scrollContainer = getScrollParent(ref.current);
    const isDocEl = scrollContainer === document.documentElement;
    const THRESHOLD = 10;

    const handleScroll = () => {
      const currentY = isDocEl ? window.scrollY : scrollContainer.scrollTop;
      if (Math.abs(currentY - lastScrollY.current) < THRESHOLD) return;
      const goingDown = currentY > lastScrollY.current && currentY > 60;
      setIsNavbarVisible(!goingDown);
      lastScrollY.current = currentY;
    };

    const target = isDocEl ? window : scrollContainer;
    target.addEventListener("scroll", handleScroll, { passive: true });
    return () => target.removeEventListener("scroll", handleScroll);
  }, [setIsNavbarVisible]);

  return (
    <div
      ref={ref}
      className={cn(
        "sticky z-40 md:top-16 transition-all duration-300",
        isNavbarVisible ? "top-[104px]" : "top-0",
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
