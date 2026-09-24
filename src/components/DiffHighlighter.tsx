"use client"

import React, { useMemo } from 'react';
import { cn } from "@/lib/utils";
import { DiffSegment, computeDiff } from "@/lib/text-diff";

interface DiffHighlighterProps {
 type: 'text' | 'markdown' | 'canvas' | 'table';
 oldValue: any;
 newValue: any;
 className?: string;
}

export function DiffHighlighter({ type, oldValue, newValue, className }: DiffHighlighterProps) {
 const isChanged = useMemo(() => {
 return JSON.stringify(oldValue) !== JSON.stringify(newValue);
 }, [oldValue, newValue]);

 if (type === 'text' || type === 'markdown') {
 const segments = useMemo(() => {
 // Use the word-level diffing logic we already have
 return computeDiff(String(oldValue || ""), String(newValue || ""));
 }, [oldValue, newValue]);

 return (
 <div className={cn("p-4 rounded-xl bg-white/80 dark:bg-white/[0.03] border border-stone-200/80 dark:border-white/10 dark:whitespace-pre-wrap leading-relaxed", className)}>
 {segments.map((seg, i) => (
 <span
 key={i}
 className={cn(
 seg.type === 'add' && "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-400 px-0.5 rounded",
 seg.type === 'remove' && "bg-rose-100 text-rose-900 dark:bg-rose-500/20 dark:text-rose-400 line-through px-0.5 rounded opacity-70",
 seg.type === 'same' && "text-foreground/90"
 )}
 >
 {seg.text}
 </span>
 ))}
 </div>
 );
 }

 if (type === 'canvas') {
 return (
 <div 
 className={cn(
 "relative rounded-xl overflow-hidden transition-all",
 isChanged && "ring-4 ring-emerald-500/50 dark:ring-emerald-400/50 shadow-lg",
 !newValue && isChanged && "ring-rose-500/50 grayscale opacity-50",
 className
 )}
 >
 {isChanged && (
 <div className={cn(
 "absolute top-4 right-4 z-10 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm",
 newValue ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
 )}>
 {newValue ? "Modified / Added" : "Deleted"}
 </div>
 )}
 <div className="pointer-events-none opacity-80 filter blur-[1px]">
 {/* Placeholder or static representation of canvas */}
 <div className="h-[200px] w-full bg-[#FAF8F5] dark:bg-[#0B1012] flex items-center justify-center text-stone-300">
 Canvas Preview (Protected)
 </div>
 </div>
 </div>
 );
 }

 // Fallback for tables or other complex blocks
 return (
 <div 
 className={cn(
 "p-4 rounded-xl border-none transition-all",
 isChanged ? "bg-emerald-500/10 border border-emerald-500/20" : "",
 className
 )}
 >
 {isChanged && (
 <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-2 block">
 Structural Content Changed
 </span>
 )}
 <div className="opacity-60 pointer-events-none">
 {/* Render child normally or static placeholder */}
 {String(newValue || oldValue)}
 </div>
 </div>
 );
}
