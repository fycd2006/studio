"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
 Bold, 
 Italic, 
 Underline,
 List, 
 ListOrdered,
 AlignLeft,
 AlignCenter,
 AlignRight,
 Palette,
 Strikethrough,
 Eraser,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useEffect, useState } from "react";

export function MarkdownToolbar({ className }: { className?: string }) {
 const toolbarIconButtonClass = "h-9 w-9 rounded-lg text-stone-600 dark:text-slate-300 border border-transparent hover:bg-stone-200/70 dark:hover:bg-slate-800/70 active:bg-stone-300/70 dark:active:bg-slate-700/80 focus-visible:ring-2 focus-visible:ring-blue-500/80 dark:focus-visible:ring-blue-400/80 focus-visible:outline-none transition-colors";

 const execCommand = (command: string, val: string | undefined = undefined) => {
 document.execCommand(command, false, val);
 };

 const handleClearFormat = () => {
 execCommand("removeFormat");
 
 const selection = window.getSelection();
 if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

 try {
   const range = selection.getRangeAt(0);
   const contents = range.extractContents();
   
   const elements = contents.querySelectorAll("*");
   elements.forEach((el) => {
     if (el instanceof HTMLElement) {
       el.removeAttribute("style");
       el.removeAttribute("color");
       el.removeAttribute("size");
       el.removeAttribute("face");
     }
   });
   
   range.insertNode(contents);
 } catch (err) {
   console.error("Clear format error: ", err);
 }
 };

 // For mobile sticky auto-hide
 const [isVisible, setIsVisible] = useState(true);
 const [lastScrollY, setLastScrollY] = useState(0);

 useEffect(() => {
 const handleScroll = () => {
   const currentScrollY = window.scrollY;
   if (currentScrollY > lastScrollY && currentScrollY > 100) {
     setIsVisible(false);
   } else {
     setIsVisible(true);
   }
   setLastScrollY(currentScrollY);
 };

 const handleFocusIn = (e: FocusEvent) => {
   const target = e.target as HTMLElement;
   if (target.isContentEditable) {
     setIsVisible(true);
   }
 };

 window.addEventListener('scroll', handleScroll, { passive: true });
 document.addEventListener('focusin', handleFocusIn);
 
 return () => {
 window.removeEventListener('scroll', handleScroll);
 document.removeEventListener('focusin', handleFocusIn);
 };
 }, [lastScrollY]);

 return (
 <div className={cn(
 "flex items-center overflow-x-auto whitespace-nowrap scrollbar-hide gap-1.5 px-1.5 py-1 bg-transparent rounded-xl transition-all duration-300 w-full",
 className,
 className?.includes('fixed') ? (isVisible ? "translate-y-0" : "translate-y-full") : ""
 )}>
 <TooltipProvider>
 {[
 { icon: Bold, title: "粗體 / Bold", action: () => execCommand("bold") },
 { icon: Italic, title: "斜體 / Italic", action: () => execCommand("italic") },
 { icon: Underline, title: "底線 / Underline", action: () => execCommand("underline") },
 { icon: Strikethrough, title: "刪除線 / Strike", action: () => execCommand("strikeThrough") },
 ].map((btn, i) => (
 <Tooltip key={i}>
 <TooltipTrigger asChild>
 <Button variant="ghost" size="icon" className={toolbarIconButtonClass} onMouseDown={(e) => { e.preventDefault(); btn.action(); }}>
 <btn.icon className="h-4 w-4" />
 </Button>
 </TooltipTrigger>
 <TooltipContent side="bottom" className="text-[9px] font-black uppercase">{btn.title}</TooltipContent>
 </Tooltip>
 ))}
 
 <div className="w-px h-5 bg-stone-300/80 dark:bg-slate-700/80 mx-1.5 border-none" />

 <Tooltip>
 <Popover>
 <TooltipTrigger asChild>
 <PopoverTrigger asChild>
 <Button variant="ghost" size="icon" className={toolbarIconButtonClass}>
 <Palette className="h-4 w-4" />
 </Button>
 </PopoverTrigger>
 </TooltipTrigger>
 <PopoverContent className="w-48 p-2 rounded-2xl shadow-2xl z-[60]" side="bottom" align="start">
 <div className="grid grid-cols-4 gap-2">
 {['#0f172a', '#64748b', '#3b82f6', '#06b6d4', '#ef4444', '#22c55e', '#f97316', '#a855f7'].map((color) => (
 <div key={color} className="w-7 h-7 rounded-full cursor-pointer hover:shadow-sm transition-all border-none" style={{ backgroundColor: color }} onMouseDown={(e) => { e.preventDefault(); execCommand("foreColor", color); }} />
 ))}
 </div>
 </PopoverContent>
 </Popover>
 <TooltipContent side="bottom" className="text-[9px] font-black uppercase">顏色 / Color</TooltipContent>
 </Tooltip>

 <div className="w-px h-5 bg-stone-300/80 dark:bg-slate-700/80 mx-1.5 border-none" />

 {[
 { icon: List, title: "項目 / Bullet", action: () => execCommand("insertUnorderedList") },
 { icon: ListOrdered, title: "編號 / List", action: () => execCommand("insertOrderedList") },
 { icon: AlignLeft, title: "靠左 / Left", action: () => execCommand("justifyLeft") },
 { icon: AlignCenter, title: "置中 / Center", action: () => execCommand("justifyCenter") },
 { icon: AlignRight, title: "靠右 / Right", action: () => execCommand("justifyRight") },
 ].map((btn, i) => (
 <Tooltip key={i}>
 <TooltipTrigger asChild>
 <Button variant="ghost" size="icon" className={toolbarIconButtonClass} onMouseDown={(e) => { e.preventDefault(); btn.action(); }}>
 <btn.icon className="h-4 w-4" />
 </Button>
 </TooltipTrigger>
 <TooltipContent side="bottom" className="text-[9px] font-black uppercase">{btn.title}</TooltipContent>
 </Tooltip>
 ))}

 <div className="flex-1 min-w-[8px]" />
 
 <Tooltip>
 <TooltipTrigger asChild>
 <Button variant="ghost" size="icon" className={cn(toolbarIconButtonClass, "hover:text-rose-500 dark:hover:text-rose-400")} onMouseDown={(e) => { e.preventDefault(); handleClearFormat(); }}>
 <Eraser className="h-4 w-4" />
 </Button>
 </TooltipTrigger>
 <TooltipContent side="bottom" className="text-[9px] font-black uppercase">清除 / Clear</TooltipContent>
 </Tooltip>
 </TooltipProvider>
 </div>
 );
}
