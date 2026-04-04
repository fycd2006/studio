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

 const fontSizePresetsPt = [8, 9, 10, 11, 12, 14, 18, 24, 30, 36, 48, 60, 72];
 const [fontSizeInput, setFontSizeInput] = useState("12");
 const [savedRange, setSavedRange] = useState<Range | null>(null);

 const saveSelection = () => {
 const selection = window.getSelection();
 if (selection && selection.rangeCount > 0) {
 setSavedRange(selection.getRangeAt(0).cloneRange());
 }
 };

 const syncFontSizeFromSelection = () => {
 const selection = window.getSelection();
 if (!selection || selection.rangeCount === 0) return;

 const range = selection.getRangeAt(0);
 const node = range.startContainer;
 const element = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement);
 if (!element) return;

 const px = Number.parseFloat(window.getComputedStyle(element).fontSize || "16");
 if (!Number.isFinite(px)) return;
 const pt = Math.round((px * 72 / 96) * 10) / 10;
 setFontSizeInput(String(pt));
 };

 const restoreSelection = () => {
 if (!savedRange) return;

 const startNode = savedRange.startContainer;
 const startElement = startNode.nodeType === Node.TEXT_NODE ? startNode.parentElement : (startNode as HTMLElement);
 const editableRoot = startElement?.closest('[contenteditable="true"]') as HTMLElement | null;
 editableRoot?.focus();

 const selection = window.getSelection();
 if (!selection) return;
 selection.removeAllRanges();
 selection.addRange(savedRange);
 };

 const parsePt = (raw: string) => {
 const normalized = raw.trim().toLowerCase().replace(/pt$/, "").trim();
 if (!normalized) return null;
 const value = Number(normalized);
 if (!Number.isFinite(value)) return null;
 return Math.min(300, Math.max(1, Math.round(value * 10) / 10));
 };

 const applyFontSizePt = (pt: number) => {
 restoreSelection();

 const selection = window.getSelection();
 if (!selection || selection.rangeCount === 0) return;

 const range = selection.getRangeAt(0);
 const sizedSpan = document.createElement("span");
 sizedSpan.style.fontSize = `${pt}pt`;

 if (range.collapsed) {
 // Keep typing at the chosen size by inserting a styled placeholder span at caret.
 sizedSpan.appendChild(document.createTextNode("\u200b"));
 range.insertNode(sizedSpan);

 const caret = document.createRange();
 caret.setStart(sizedSpan.firstChild as Text, 1);
 caret.collapse(true);
 selection.removeAllRanges();
 selection.addRange(caret);
 setSavedRange(caret.cloneRange());
 } else {
 try {
        const contents = range.extractContents();
        // Remove overriding child styles
        const elements = contents.querySelectorAll("*");
        elements.forEach((el) => {
          if (el instanceof HTMLElement) {
             el.style.fontSize = ""; // strip specific override
             if (!el.getAttribute("style")) el.removeAttribute("style");
          }
        });
        sizedSpan.appendChild(contents);
        range.insertNode(sizedSpan);
        
        const after = document.createRange();
        after.selectNodeContents(sizedSpan);
        selection.removeAllRanges();
        selection.addRange(after);
        setSavedRange(after.cloneRange());
      } catch (err) {
        console.error("Scale apply error: ", err);
      }
    }

    setFontSizeInput(String(pt));
  };

  const commitFontSizeInput = () => {
    const parsed = parsePt(fontSizeInput);
    if (parsed === null) return;
    applyFontSizePt(parsed);
  };

  const stepFontSize = (delta: number) => {
    const current = parsePt(fontSizeInput) ?? 12;
    applyFontSizePt(current + delta);
  };

  const handleClearFormat = () => {
    restoreSelection();
    execCommand("removeFormat");
    
    // Custom pass for leftover inline spans (from color/fontSize tools)
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
 { icon: Bold, title: "蝎? / Bold", action: () => execCommand("bold") },
 { icon: Italic, title: "?? / Italic", action: () => execCommand("italic") },
 { icon: Underline, title: "摨? / Underline", action: () => execCommand("underline") },
 { icon: Strikethrough, title: "?芷蝺?/ Strike", action: () => execCommand("strikeThrough") },
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
 <Popover onOpenChange={(open) => { if (open) { saveSelection(); syncFontSizeFromSelection(); } }}>
 <TooltipTrigger asChild>
 <PopoverTrigger asChild>
 <Button
 variant="ghost"
 size="icon"
 className="h-8 w-8 text-stone-500 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white transition-all border-none"
 onMouseDown={() => {
 saveSelection();
 syncFontSizeFromSelection();
 }}
 >
 <FontIcon className="h-4 w-4" />
 </Button>
 </PopoverTrigger>
 </TooltipTrigger>
 <PopoverContent className="w-56 p-2 rounded-xl shadow-2xl z-[60]" side="bottom" align="start">
 <div className="flex items-center gap-1.5 mb-2">
 <Button
 variant="outline"
 size="icon"
 className="h-8 w-8 rounded-lg border-stone-200 dark:border-slate-700"
 onMouseDown={(e) => {
 e.preventDefault();
 stepFontSize(-1);
 }}
 >
 -
 </Button>
 <Input
 value={fontSizeInput}
 onChange={(e) => setFontSizeInput(e.target.value)}
 onKeyDown={(e) => {
 if (e.key === "Enter") {
 e.preventDefault();
 commitFontSizeInput();
 }
 }}
 onBlur={commitFontSizeInput}
 className="h-8 text-xs font-semibold text-center"
 inputMode="decimal"
 />
 <span className="text-xs font-semibold text-stone-500 dark:text-slate-400">pt</span>
 <Button
 variant="outline"
 size="icon"
 className="h-8 w-8 rounded-lg border-stone-200 dark:border-slate-700"
 onMouseDown={(e) => {
 e.preventDefault();
 stepFontSize(1);
 }}
 >
 +
 </Button>
 </div>
 <div className="grid grid-cols-4 gap-1">
 {fontSizePresetsPt.map((pt) => (
 <Button
 key={pt}
 variant="ghost"
 className="justify-center h-8 rounded-lg text-xs font-bold border-none hover:bg-stone-100 dark:hover:bg-slate-800"
 onMouseDown={(e) => {
 e.preventDefault();
 applyFontSizePt(pt);
 }}
 >
 {pt}
 </Button>
 ))}
 </div>
 </PopoverContent>
 </Popover>
 <TooltipContent side="bottom" className="text-[9px] font-black uppercase">摮? / Font Size</TooltipContent>
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
 <TooltipContent side="bottom" className="text-[9px] font-black uppercase">憿 / Color</TooltipContent>
 </Tooltip>

 <div className="w-[1px] h-4 bg-stone-200 dark:bg-slate-700 mx-1 border-none" />

 {[
 { icon: List, title: "? / Bullet", action: () => execCommand("insertUnorderedList") },
 { icon: ListOrdered, title: "皜 / List", action: () => execCommand("insertOrderedList") },
 { icon: AlignLeft, title: "撌?/ Left", action: () => execCommand("justifyLeft") },
 { icon: AlignCenter, title: "銝?/ Center", action: () => execCommand("justifyCenter") },
 { icon: AlignRight, title: "??/ Right", action: () => execCommand("justifyRight") },
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
 <TooltipContent side="bottom" className="text-[9px] font-black uppercase">皜 / Clear</TooltipContent>
 </Tooltip>
 </TooltipProvider>
 </div>
 );
}
