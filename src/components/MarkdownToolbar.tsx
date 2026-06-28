"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  Heading1,
  Heading2,
  Heading3,
  ChevronDown,
  Type as FontIcon,
  ALargeSmall,
  Table as TableIcon,
  Link as LinkIcon,
  Image as ImageIcon,
  Grid
} from "lucide-react";

export function MarkdownToolbar({ className }: { className?: string }) {
  const toolbarIconButtonClass = "h-9 w-9 rounded-lg text-stone-600 dark:text-slate-300 hover:bg-stone-200/70 dark:hover:bg-slate-800/70 active:bg-stone-300/70 dark:active:bg-slate-700/80 transition-colors shrink-0";
  
  // Selection range and active formatting states
  const [activeRange, setActiveRange] = useState<Range | null>(null);
  const [activeFormats, setActiveFormats] = useState<Record<string, boolean>>({});

  const textColorInputRef = React.useRef<HTMLInputElement>(null);
  const highlightColorInputRef = React.useRef<HTMLInputElement>(null);

  const handleCustomTextColor = (e: React.ChangeEvent<HTMLInputElement>) => {
    execCommand("foreColor", e.target.value);
  };

  const handleCustomHighlightColor = (e: React.ChangeEvent<HTMLInputElement>) => {
    execCommand("hiliteColor", e.target.value);
  };

  // Dialog States
  const [isLinkOpen, setIsLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");

  const [isImageOpen, setIsImageOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");

  // Restore selection before executing commands
  const restoreSelection = useCallback(() => {
    const selection = window.getSelection();
    if (activeRange && selection) {
      selection.removeAllRanges();
      selection.addRange(activeRange);
    }
  }, [activeRange]);

  const execCommand = (command: string, val: string | undefined = undefined) => {
    restoreSelection();
    try {
      document.execCommand(command, false, val);
    } catch (err) {
      console.error("Execute command error:", err);
    }
    updateActiveFormats();
  };

  const updateActiveFormats = () => {
    try {
      setActiveFormats({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strikeThrough: document.queryCommandState('strikeThrough'),
        insertUnorderedList: document.queryCommandState('insertUnorderedList'),
        insertOrderedList: document.queryCommandState('insertOrderedList'),
        justifyLeft: document.queryCommandState('justifyLeft'),
        justifyCenter: document.queryCommandState('justifyCenter'),
        justifyRight: document.queryCommandState('justifyRight'),
      });
    } catch { /* ignore */ }
  };

  // Track global selection changes inside editable zones
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        let node = range.startContainer as HTMLElement | null;
        let insideEditor = false;

        while (node && node !== document.body) {
          if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).isContentEditable) {
            insideEditor = true;
            setActiveRange(range.cloneRange());
            break;
          }
          node = node.parentNode as HTMLElement | null;
        }

        if (insideEditor) {
          updateActiveFormats();
        } else {
          setActiveFormats({});
        }
      } else {
        setActiveFormats({});
      }
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, []);

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
      // Unwrap empty <font> and style-only <span> wrappers
      const wrappers = contents.querySelectorAll("font, span");
      wrappers.forEach((wrapper) => {
        if (wrapper instanceof HTMLElement && wrapper.attributes.length === 0) {
          const parent = wrapper.parentNode;
          while (wrapper.firstChild) {
            parent?.insertBefore(wrapper.firstChild, wrapper);
          }
          wrapper.remove();
        }
      });
      range.insertNode(contents);
    } catch (err) {
      console.error("Clear format error: ", err);
    }
  };

  // Heading Formatting
  const setHeading = (tag: string) => {
    execCommand("formatBlock", `<${tag}>`);
  };

  // Hyperlink Insertion
  const insertLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkUrl) return;
    setIsLinkOpen(false);

    restoreSelection();
    if (linkText) {
      const linkHtml = `<a href="${linkUrl}" target="_blank" class="text-orange-600 dark:text-amber-400 underline hover:opacity-80 transition-opacity" rel="noopener noreferrer">${linkText}</a>`;
      execCommand("insertHTML", linkHtml);
    } else {
      execCommand("createLink", linkUrl);
    }
    setLinkUrl("");
    setLinkText("");
  };

  // Image URL Insertion
  const insertImageUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl) return;
    setIsImageOpen(false);

    restoreSelection();
    const imgHtml = `<img src="${imageUrl}" loading="lazy" style="width: 100%; max-width: 500px; height: auto; display: block; margin: 12px auto; border-radius: 12px; cursor: pointer; transition: all 0.3s; vertical-align: top;" />`;
    execCommand("insertHTML", imgHtml);
    setImageUrl("");
  };

  // Custom Table Insertion
  const insertTable = (rows: number, cols: number) => {
    restoreSelection();
    let tableHtml = `<table style="border-collapse: collapse; width: 100%; border: 1px solid currentColor; margin: 16px 0; font-size: 14px;"><tbody>`;
    for (let r = 0; r < rows; r++) {
      tableHtml += "<tr>";
      for (let c = 0; c < cols; c++) {
        tableHtml += `<td style="border: 1px solid currentColor; padding: 10px; min-width: 60px; vertical-align: top; opacity: 0.85;">&nbsp;</td>`;
      }
      tableHtml += "</tr>";
    }
    tableHtml += `</tbody></table>`;
    execCommand("insertHTML", tableHtml);
  };

  return (
    <div 
      onMouseDown={(e) => e.preventDefault()}
      className={cn(
        "flex flex-nowrap items-center gap-1 p-1 bg-transparent rounded-lg transition-all w-full select-none overflow-x-auto no-scrollbar scroll-smooth",
        className
      )}
    >
      <TooltipProvider>
        {/* Headings Selector */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-[11px] font-bold text-stone-700 dark:text-slate-200 rounded-lg hover:bg-stone-200/50 dark:hover:bg-slate-800 shrink-0">
              <FontIcon className="h-3.5 w-3.5" />
              格式
              <ChevronDown className="h-3 w-3 opacity-60" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-40 p-1.5 rounded-xl border border-stone-200 dark:border-slate-700 z-[99]" align="start">
            <div className="flex flex-col gap-1">
              <Button variant="ghost" size="sm" className="justify-start text-xs font-medium h-8 rounded-lg" onClick={() => setHeading("p")}>
                段落 / Paragraph
              </Button>
              <Button variant="ghost" size="sm" className="justify-start text-xs font-extrabold h-8 rounded-lg" onClick={() => setHeading("h1")}>
                <Heading1 className="h-3.5 w-3.5 mr-1.5" />
                主標題 / H1
              </Button>
              <Button variant="ghost" size="sm" className="justify-start text-xs font-bold h-8 rounded-lg" onClick={() => setHeading("h2")}>
                <Heading2 className="h-3.5 w-3.5 mr-1.5" />
                次標題 / H2
              </Button>
              <Button variant="ghost" size="sm" className="justify-start text-xs font-semibold h-8 rounded-lg" onClick={() => setHeading("h3")}>
                <Heading3 className="h-3.5 w-3.5 mr-1.5" />
                小標題 / H3
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Font Size Selector */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-[11px] font-bold text-stone-700 dark:text-slate-200 rounded-lg hover:bg-stone-200/50 dark:hover:bg-slate-800 shrink-0">
              <ALargeSmall className="h-3.5 w-3.5" />
              大小
              <ChevronDown className="h-3 w-3 opacity-60" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-32 p-1.5 rounded-xl border border-stone-200 dark:border-slate-700 z-[99]" align="start">
            <div className="flex flex-col gap-1">
              {[
                { size: "1", label: "12px" },
                { size: "2", label: "14px" },
                { size: "3", label: "16px" },
                { size: "4", label: "18px" },
                { size: "5", label: "20px" },
                { size: "6", label: "24px" },
                { size: "7", label: "32px" }
              ].map((item) => (
                <Button
                  key={item.size}
                  variant="ghost"
                  size="sm"
                  className="justify-start text-xs h-8 rounded-lg"
                  onClick={() => execCommand("fontSize", item.size)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <div className="w-px h-4 bg-stone-300 dark:bg-slate-700 mx-1 shrink-0" />

        {/* Standard Text Formatting */}
        {[
          { icon: Bold, title: "粗體 / Bold", cmd: "bold", action: () => execCommand("bold") },
          { icon: Italic, title: "斜體 / Italic", cmd: "italic", action: () => execCommand("italic") },
          { icon: Underline, title: "底線 / Underline", cmd: "underline", action: () => execCommand("underline") },
          { icon: Strikethrough, title: "刪除線 / Strike", cmd: "strikeThrough", action: () => execCommand("strikeThrough") },
        ].map((btn, i) => (
          <Tooltip key={i}>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn(toolbarIconButtonClass, activeFormats[btn.cmd] && "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300")} 
                onClick={(e) => { e.preventDefault(); btn.action(); }}
              >
                <btn.icon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-[9px] font-black uppercase z-[99]">{btn.title}</TooltipContent>
          </Tooltip>
        ))}

        <div className="w-px h-4 bg-stone-300 dark:bg-slate-700 mx-1 shrink-0" />

        {/* Colors Popover */}
        <Tooltip>
          <Popover>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className={toolbarIconButtonClass}>
                  <Palette className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <PopoverContent className="w-48 p-3 rounded-2xl shadow-xl z-[99] border border-stone-200 dark:border-slate-700" side="bottom" align="start">
              <div className="space-y-3">
                <div>
                  <span className="text-[10px] font-bold text-stone-400 dark:text-slate-500 uppercase tracking-widest block mb-1.5">文字顏色 / Text Color</span>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[
                      { value: '#0f172a', className: 'bg-[#0f172a] dark:bg-[#e2e8f0]' },
                      { value: '#e11d48', className: 'bg-[#e11d48] dark:bg-[#fb7185]' },
                      { value: '#d97706', className: 'bg-[#d97706] dark:bg-[#fbbf24]' },
                      { value: '#ca8a04', className: 'bg-[#ca8a04] dark:bg-[#fde047]' },
                      { value: '#16a34a', className: 'bg-[#16a34a] dark:bg-[#4ade80]' },
                      { value: '#2563eb', className: 'bg-[#2563eb] dark:bg-[#60a5fa]' },
                      { value: '#7c3aed', className: 'bg-[#7c3aed] dark:bg-[#c084fc]' },
                      { value: '#db2777', className: 'bg-[#db2777] dark:bg-[#f472b6]' }
                    ].map((item) => (
                      <button key={item.value} type="button" className={cn("w-6 h-6 rounded-full cursor-pointer hover:scale-105 border-none shadow-sm transition-transform", item.className)} onClick={() => execCommand("foreColor", item.value)} />
                    ))}
                    {/* Custom Text Color Button */}
                    <button type="button" className="w-6 h-6 rounded-full cursor-pointer hover:scale-105 border border-stone-200 dark:border-slate-700 shadow-sm flex items-center justify-center bg-gradient-to-tr from-rose-400 via-amber-400 to-blue-500" onClick={() => textColorInputRef.current?.click()} title="自訂顏色">
                      <span className="text-[12px] font-bold text-white shadow-sm">+</span>
                    </button>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-stone-400 dark:text-slate-500 uppercase tracking-widest block mb-1.5">螢光筆高亮 / Highlight</span>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[
                      { value: 'transparent', className: 'bg-transparent border border-stone-200 dark:border-slate-700' },
                      { value: '#fef08a', className: 'bg-[#fef08a] dark:bg-amber-950/80 dark:border-amber-400 border border-stone-200' },
                      { value: '#fed7aa', className: 'bg-[#fed7aa] dark:bg-orange-950/80 dark:border-orange-400 border border-stone-200' },
                      { value: '#bbf7d0', className: 'bg-[#bbf7d0] dark:bg-emerald-950/80 dark:border-emerald-400 border border-stone-200' },
                      { value: '#bfdbfe', className: 'bg-[#bfdbfe] dark:bg-blue-950/80 dark:border-blue-400 border border-stone-200' },
                      { value: '#e9d5ff', className: 'bg-[#e9d5ff] dark:bg-purple-950/80 dark:border-purple-400 border border-stone-200' },
                      { value: '#fecdd3', className: 'bg-[#fecdd3] dark:bg-rose-950/80 dark:border-rose-400 border border-stone-200' }
                    ].map((item) => (
                      <button key={item.value} type="button" className={cn("w-6 h-6 rounded-full cursor-pointer hover:scale-105 shadow-sm flex items-center justify-center transition-all", item.className)} onClick={() => execCommand("hiliteColor", item.value)}>
                        {item.value === 'transparent' && <span className="text-[9px] font-black text-stone-400">✕</span>}
                      </button>
                    ))}
                    {/* Custom Highlight Color Button */}
                    <button type="button" className="w-6 h-6 rounded-full cursor-pointer hover:scale-105 border border-stone-200 dark:border-slate-700 shadow-sm flex items-center justify-center bg-gradient-to-tr from-rose-400 via-amber-400 to-blue-500" onClick={() => highlightColorInputRef.current?.click()} title="自訂高亮">
                      <span className="text-[12px] font-bold text-white shadow-sm">+</span>
                    </button>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <TooltipContent side="bottom" className="text-[9px] font-black uppercase z-[99]">調色盤 / Colors</TooltipContent>
        </Tooltip>

        <div className="w-px h-4 bg-stone-300 dark:bg-slate-700 mx-1 shrink-0" />

        {/* Alignment & Lists */}
        {[
          { icon: List, title: "無序列表 / Bullet List", cmd: "insertUnorderedList", action: () => execCommand("insertUnorderedList") },
          { icon: ListOrdered, title: "有序列表 / Numbered List", cmd: "insertOrderedList", action: () => execCommand("insertOrderedList") },
          { icon: AlignLeft, title: "靠左對齊 / Left Align", cmd: "justifyLeft", action: () => execCommand("justifyLeft") },
          { icon: AlignCenter, title: "置中對齊 / Center Align", cmd: "justifyCenter", action: () => execCommand("justifyCenter") },
          { icon: AlignRight, title: "靠右對齊 / Right Align", cmd: "justifyRight", action: () => execCommand("justifyRight") },
        ].map((btn, i) => (
          <Tooltip key={i}>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn(
                  toolbarIconButtonClass,
                  activeFormats[btn.cmd] && "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
                )} 
                onClick={(e) => { e.preventDefault(); btn.action(); }}
              >
                <btn.icon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-[9px] font-black uppercase z-[99]">{btn.title}</TooltipContent>
          </Tooltip>
        ))}

        <div className="w-px h-4 bg-stone-300 dark:bg-slate-700 mx-1 shrink-0" />

        {/* Insert Table */}
        <Tooltip>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className={toolbarIconButtonClass}>
                <TableIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-2 rounded-xl z-[99] border border-stone-200 dark:border-slate-700" side="bottom" align="start">
              <span className="text-[10px] font-bold text-stone-400 dark:text-slate-500 uppercase tracking-widest block mb-2">插入表格 / Table</span>
              <div className="grid grid-cols-1 gap-1 text-xs">
                {[
                  { r: 2, c: 2, label: "2 x 2" },
                  { r: 3, c: 3, label: "3 x 3" },
                  { r: 4, c: 3, label: "4 x 3" },
                  { r: 5, c: 4, label: "5 x 4" },
                ].map((tbl) => (
                  <Button
                    key={tbl.label}
                    variant="ghost"
                    size="sm"
                    className="h-8 rounded-lg justify-start text-xs font-medium"
                    onClick={() => insertTable(tbl.r, tbl.c)}
                  >
                    <Grid className="h-3.5 w-3.5 mr-2 opacity-65" />
                    {tbl.label}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <TooltipContent side="bottom" className="text-[9px] font-black uppercase z-[99]">表格 / Table</TooltipContent>
        </Tooltip>

        {/* Hyperlink Dialog */}
        <Tooltip>
          <Popover open={isLinkOpen} onOpenChange={setIsLinkOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className={toolbarIconButtonClass}>
                <LinkIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3 rounded-2xl z-[99] border border-stone-200 dark:border-slate-700 shadow-xl" side="bottom" align="start">
              <form onSubmit={insertLink} className="space-y-2">
                <span className="text-[10px] font-bold text-stone-400 dark:text-slate-500 uppercase tracking-widest block mb-1">插入連結 / Insert Link</span>
                <Input
                  type="url"
                  placeholder="超連結網址 (https://...)"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="h-8 text-xs rounded-lg"
                  required
                />
                <Input
                  type="text"
                  placeholder="顯示文字 (選填)"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  className="h-8 text-xs rounded-lg"
                />
                <div className="flex justify-end gap-1.5 pt-1">
                  <Button type="button" variant="ghost" size="sm" className="h-7 px-2.5 rounded-lg text-xs" onClick={() => setIsLinkOpen(false)}>取消</Button>
                  <Button type="submit" size="sm" className="h-7 px-3.5 rounded-lg text-xs bg-orange-600 dark:bg-amber-400 text-white dark:text-slate-900 border-none">插入</Button>
                </div>
              </form>
            </PopoverContent>
          </Popover>
          <TooltipContent side="bottom" className="text-[9px] font-black uppercase z-[99]">超連結 / Link</TooltipContent>
        </Tooltip>

        {/* Image Insertion Dialog */}
        <Tooltip>
          <Popover open={isImageOpen} onOpenChange={setIsImageOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className={toolbarIconButtonClass}>
                <ImageIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3 rounded-2xl z-[99] border border-stone-200 dark:border-slate-700 shadow-xl" side="bottom" align="start">
              <form onSubmit={insertImageUrl} className="space-y-2">
                <span className="text-[10px] font-bold text-stone-400 dark:text-slate-500 uppercase tracking-widest block mb-1">插入圖片 URL / Image</span>
                <Input
                  type="url"
                  placeholder="圖片網址 (https://...)"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="h-8 text-xs rounded-lg"
                  required
                />
                <div className="flex justify-end gap-1.5 pt-1">
                  <Button type="button" variant="ghost" size="sm" className="h-7 px-2.5 rounded-lg text-xs" onClick={() => setIsImageOpen(false)}>取消</Button>
                  <Button type="submit" size="sm" className="h-7 px-3.5 rounded-lg text-xs bg-orange-600 dark:bg-amber-400 text-white dark:text-slate-900 border-none">插入</Button>
                </div>
              </form>
            </PopoverContent>
          </Popover>
          <TooltipContent side="bottom" className="text-[9px] font-black uppercase z-[99]">插入圖片 URL / Image</TooltipContent>
        </Tooltip>

        <div className="w-px h-4 bg-stone-300 dark:bg-slate-700 mx-1 shrink-0" />

        {/* Clear Formatting */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className={cn(toolbarIconButtonClass, "hover:text-rose-500 dark:hover:text-rose-400")} onClick={(e) => { e.preventDefault(); handleClearFormat(); }}>
              <Eraser className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-[9px] font-black uppercase z-[99]">清除格式 / Clear</TooltipContent>
        </Tooltip>
        {/* Custom color input tags (hidden) */}
        <input type="color" ref={textColorInputRef} className="sr-only" onChange={handleCustomTextColor} />
        <input type="color" ref={highlightColorInputRef} className="sr-only" onChange={handleCustomHighlightColor} />
      </TooltipProvider>
    </div>
  );
}
