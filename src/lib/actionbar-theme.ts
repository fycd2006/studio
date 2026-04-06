export const actionBarTheme = {
  shell:
    "bg-transparent",
  cluster:
    "bg-transparent p-1.5 rounded-xl",
  clusterInset:
    "bg-transparent p-1.5 rounded-xl",
  control:
    "h-9 rounded-lg bg-transparent border border-transparent text-stone-600 dark:text-slate-300 hover:bg-stone-200/70 dark:hover:bg-slate-800/70 active:bg-stone-300/70 dark:active:bg-slate-700/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/80 dark:focus-visible:ring-blue-400/80 transition-colors",
  controlGhost:
    "h-9 rounded-lg bg-transparent border border-transparent text-stone-600 dark:text-slate-300 hover:bg-stone-200/70 dark:hover:bg-slate-800/70 active:bg-stone-300/70 dark:active:bg-slate-700/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/80 dark:focus-visible:ring-blue-400/80 transition-colors",
  controlPrimary:
    "h-9 rounded-lg bg-stone-900 hover:bg-stone-800 text-white dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-[#2C2A28] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/80 dark:focus-visible:ring-blue-400/80 transition-colors",
  controlAccent:
    "h-9 rounded-lg bg-transparent text-orange-700 border border-orange-300/70 hover:bg-orange-100/70 dark:text-amber-400 dark:border-amber-500/40 dark:hover:bg-amber-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/80 dark:focus-visible:ring-blue-400/80 transition-colors",
  controlIcon: "h-9 w-9",
  controlElevated: "shadow-none",
  separator: "w-px h-6 bg-stone-300/80 dark:bg-slate-700/80",
  tabTrigger:
    "rounded-lg font-extrabold text-[10px] md:text-[11px] gap-1.5 px-3 md:px-6 tracking-widest uppercase h-9 transition-all data-[state=active]:bg-stone-300/80 dark:data-[state=active]:bg-slate-700/80 data-[state=active]:text-stone-950 dark:data-[state=active]:text-white data-[state=inactive]:text-stone-500 dark:data-[state=inactive]:text-slate-400 data-[state=inactive]:hover:text-stone-700 dark:data-[state=inactive]:hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/80 dark:focus-visible:ring-blue-400/80",
  segmented:
    "px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap inline-flex items-center gap-1.5",
  segmentedActive:
    "bg-stone-300/80 dark:bg-slate-700/80 text-stone-950 dark:text-white",
  segmentedIdle:
    "text-stone-500 dark:text-slate-400 hover:text-stone-700 dark:hover:text-slate-200 hover:bg-stone-200/50 dark:hover:bg-slate-700/50",
} as const;
