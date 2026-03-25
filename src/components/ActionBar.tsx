"use client";

import { cn } from "@/lib/utils";

interface ActionBarProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export function ActionBar({ children, title, className }: ActionBarProps) {
  return (
    <div
      className={cn(
        "sticky z-40 top-16 md:top-20 transition-colors duration-300",
        "bg-transparent border-transparent py-3",
        "-mx-4 md:-mx-8 lg:-mx-10 px-4 md:px-8 lg:px-10 mb-4 md:mb-6"
      )}
    >
      <div className="flex items-center justify-between gap-4 max-w-none w-full">
        {/* Title (Hidden on mobile, shown on desktop) */}
        <div className="hidden md:block font-bold text-white mix-blend-difference text-sm tracking-wider">
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
