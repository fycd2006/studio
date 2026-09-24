export const actionBarTheme = {
  shell:
    "bg-transparent",
  cluster:
    "bg-transparent p-0.5 sm:p-1.5 rounded-xl",
  clusterInset:
    "bg-transparent p-0.5 sm:p-1.5 rounded-xl",
  control:
    "h-8 sm:h-9 rounded-lg bg-transparent border border-transparent text-stone-600 dark:text-foreground/80 hover:bg-stone-200/70 dark:hover:bg-white/10 active:bg-stone-300/70 dark:active:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/80 transition-colors",
  controlGhost:
    "h-8 sm:h-9 rounded-lg bg-transparent border border-transparent text-stone-600 dark:text-foreground/80 hover:bg-stone-200/70 dark:hover:bg-white/10 active:bg-stone-300/70 dark:active:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/80 transition-colors",
  controlPrimary:
    "h-8 sm:h-9 rounded-lg bg-foreground hover:opacity-90 text-background dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-[#0B1012] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/80 transition-all",
  controlAccent:
    "h-8 sm:h-9 rounded-lg bg-transparent text-orange-700 border border-orange-300/70 hover:bg-orange-100/70 dark:text-amber-400 dark:border-amber-500/40 dark:hover:bg-amber-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/80 transition-colors",
  controlIcon: "h-8 w-8 sm:h-9 sm:w-9",
  controlElevated: "shadow-none",
  separator: "w-px h-6 bg-stone-300/80 dark:bg-white/10",
  tabTrigger:
    "rounded-lg font-mono font-bold text-[10px] md:text-[11px] gap-1.5 px-3 md:px-6 tracking-widest uppercase h-9 transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-fg-muted data-[state=inactive]:hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/80",
  segmented:
    "px-3 sm:px-4 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-widest transition-all whitespace-nowrap inline-flex items-center gap-1.5",
  segmentedActive:
    "bg-white dark:bg-white/10 text-foreground shadow-sm",
  segmentedIdle:
    "text-fg-muted hover:text-foreground hover:bg-stone-200/50 dark:hover:bg-white/5",
} as const;
