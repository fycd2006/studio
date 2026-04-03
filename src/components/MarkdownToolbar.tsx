"use client";

import { Button } from "@/components/ui/button";
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
 Type as FontIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useEffect, useState } from "react";

export function MarkdownToolbar({ className }: { className?: string }) {
 const execCommand = (command: string, val: string | undefined = undefined) => {
 document.execCommand(command, false, val);
 };

 const setFontSize = (size: string) => {
 document.execCommand("styleWithCSS", false, "true");
 document.execCommand("fontSize", false, "3"); 
 const selection = window.getSelection();
 if (selection && selection.rangeCount > 0) {
 const range = selection.getRangeAt(0);
 const span = document.createElement("span");
 span.style.fontSize = size;
 try {
 range.surroundContents(span);
 } catch (e) {
 execCommand("insertHTML", `<span style="font-size: ${size}">${selection.toString()}</span>`);
 }
 }
 };

 const fontSizes = [
 { label: "小 / S", size: "12px" },
 { label: "中 / M", size: "16px" },
 { label: "大 / L", size: "20px" },
 { label: "特大 / XL", size: "24px" },
 ];

 // For mobile sticky auto-hide
 const [isVisible, setIsVisible] = useState(true);
 const [lastScrollY, setLastScrollY] = useState(0);

 useEffect(() => {
 const handleScroll = () => {
 const currentScrollY = window.scrollY;
 // hide when scrolling down, show when up
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
 "flex items-center overflow-x-auto whitespace-nowrap scrollbar-hide gap-1 p-1 bg-white dark:bg-slate-900 border-none sm:border border-stone-200 dark:border-slate-800 transition-all duration-300 w-full",
 className,
 // add mobile sliding animation class if applied
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
 <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-500 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white transition-all border-none focus:ring-0" onMouseDown={(e) => { e.preventDefault(); btn.action(); }}>
 <btn.icon className="h-4 w-4" />
 </Button>
 </TooltipTrigger>
 <TooltipContent side="bottom" className="text-[9px] font-black uppercase">{btn.title}</TooltipContent>
 </Tooltip>
 ))}
 
 <div className="w-[1px] h-4 bg-stone-200 dark:bg-slate-700 mx-1 border-none" />

 <Tooltip>
 <Popover>
 <TooltipTrigger asChild>
 <PopoverTrigger asChild>
 <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-500 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white transition-all border-none">
 <FontIcon className="h-4 w-4" />
 </Button>
 </PopoverTrigger>
 </TooltipTrigger>
 <PopoverContent className="w-40 p-1 rounded-xl shadow-2xl z-[60]" side="bottom" align="start">
 <div className="flex flex-col">
 {fontSizes.map((fs) => (
 <Button
 key={fs.size}
 variant="ghost"
 className="justify-start h-8 px-3 rounded-lg text-[10px] font-black uppercase border-none hover:bg-stone-100 dark:hover:bg-slate-800"
 onMouseDown={(e) => {
 e.preventDefault();
 setFontSize(fs.size);
 }}
 >
 {fs.label}
 </Button>
 ))}
 </div>
 </PopoverContent>
 </Popover>
 <TooltipContent side="bottom" className="text-[9px] font-black uppercase">字體 / Font Size</TooltipContent>
 </Tooltip>

 <Tooltip>
 <Popover>
 <TooltipTrigger asChild>
 <PopoverTrigger asChild>
 <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-500 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white transition-all border-none">
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

 <div className="w-[1px] h-4 bg-stone-200 dark:bg-slate-700 mx-1 border-none" />

 {[
 { icon: List, title: "項目 / Bullet", action: () => execCommand("insertUnorderedList") },
 { icon: ListOrdered, title: "清單 / List", action: () => execCommand("insertOrderedList") },
 { icon: AlignLeft, title: "左 / Left", action: () => execCommand("justifyLeft") },
 { icon: AlignCenter, title: "中 / Center", action: () => execCommand("justifyCenter") },
 { icon: AlignRight, title: "右 / Right", action: () => execCommand("justifyRight") },
 ].map((btn, i) => (
 <Tooltip key={i}>
 <TooltipTrigger asChild>
 <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-500 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white transition-all border-none" onMouseDown={(e) => { e.preventDefault(); btn.action(); }}>
 <btn.icon className="h-4 w-4" />
 </Button>
 </TooltipTrigger>
 <TooltipContent side="bottom" className="text-[9px] font-black uppercase">{btn.title}</TooltipContent>
 </Tooltip>
 ))}

 <div className="flex-1 min-w-[8px]" />
 
 <Tooltip>
 <TooltipTrigger asChild>
 <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-500 dark:text-slate-400 hover:text-rose-500 transition-all border-none" onMouseDown={(e) => { e.preventDefault(); execCommand("removeFormat"); }}>
 <Eraser className="h-4 w-4" />
 </Button>
 </TooltipTrigger>
 <TooltipContent side="bottom" className="text-[9px] font-black uppercase">清除 / Clear</TooltipContent>
 </Tooltip>
 </TooltipProvider>
 </div>
 );
}
