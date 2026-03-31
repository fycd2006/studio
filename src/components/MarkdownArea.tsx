
"use client"

import { useState, useRef, useEffect, useCallback } from "react";
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
 Trash2,
 Strikethrough,
 Eraser,
 Circle as CircleIcon,
 Layers,
 RectangleHorizontal,
 RotateCcw,
 Type as FontIcon,
 Layout
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface MarkdownAreaProps {
 label?: string;
 value: string;
 onChange: (value: string) => void;
 onFocus?: () => void;
 onBlur?: () => void;
}

export function MarkdownArea({ label, value, onChange, onFocus: onFocusProp, onBlur: onBlurProp }: MarkdownAreaProps) {
 const editorRef = useRef<HTMLDivElement>(null);
 const [isFocused, setIsFocused] = useState(false);
 const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
 const [imageMenuPos, setImageMenuPos] = useState({ top: 0, left: 0 });

 useEffect(() => {
 if (editorRef.current && editorRef.current.innerHTML !== value) {
 editorRef.current.innerHTML = value || "<div><br></div>";
 }
 }, [value]);

 const handleInput = useCallback(() => {
 if (editorRef.current) {
 onChange(editorRef.current.innerHTML);
 }
 }, [onChange]);

 const updateMenuPosition = useCallback(() => {
 if (selectedImage) {
 const rect = selectedImage.getBoundingClientRect();
 setImageMenuPos({
 top: rect.top - 60, 
 left: rect.left + (rect.width / 2)
 });
 }
 }, [selectedImage]);

 const deleteImage = useCallback(() => {
 if (selectedImage) {
 selectedImage.remove();
 setSelectedImage(null);
 handleInput();
 }
 }, [selectedImage, handleInput]);

 const clearImageFormat = useCallback(() => {
 if (selectedImage) {
 selectedImage.style.borderRadius = '';
 selectedImage.style.boxShadow = '';
 selectedImage.style.aspectRatio = '';
 selectedImage.style.objectFit = '';
 selectedImage.style.width = '100%';
 selectedImage.style.height = 'auto';
 selectedImage.style.display = 'inline-block';
 selectedImage.style.margin = '10px';
 selectedImage.style.verticalAlign = 'top';
 handleInput();
 setTimeout(updateMenuPosition, 50);
 }
 }, [selectedImage, handleInput, updateMenuPosition]);

 useEffect(() => {
 const handleKeyDown = (e: KeyboardEvent) => {
 const isInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '') || 
 (document.activeElement as HTMLElement)?.isContentEditable;
 
 if ((e.key === 'Delete' || e.key === 'Backspace') && selectedImage && !isFocused && !isInput) {
 e.preventDefault();
 deleteImage();
 }
 };
 window.addEventListener('keydown', handleKeyDown);
 return () => window.removeEventListener('keydown', handleKeyDown);
 }, [selectedImage, deleteImage, isFocused]);

 useEffect(() => {
 if (selectedImage) {
 const update = () => updateMenuPosition();
 window.addEventListener('scroll', update, true);
 const interval = setInterval(update, 50);
 return () => {
 window.removeEventListener('scroll', update, true);
 clearInterval(interval);
 };
 }
 }, [selectedImage, updateMenuPosition]);

 const execCommand = (command: string, val: string | undefined = undefined) => {
 document.execCommand(command, false, val);
 if (editorRef.current) {
 editorRef.current.focus();
 handleInput();
 }
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
 handleInput();
 }
 };

 const handleEditorClick = (e: React.MouseEvent) => {
 const target = e.target as HTMLElement;
 if (target.tagName === 'IMG') {
 const img = target as HTMLImageElement;
 setSelectedImage(img);
 setTimeout(updateMenuPosition, 10);
 } else {
 setSelectedImage(null);
 }
 };

 const toggleStyle = (styleName: string, value: string) => {
 if (selectedImage) {
 if (styleName === 'borderRadius') {
 selectedImage.style.borderRadius = selectedImage.style.borderRadius === value ? '0px' : value;
 } else if (styleName === 'boxShadow') {
 selectedImage.style.boxShadow = selectedImage.style.boxShadow.includes('rgba') ? 'none' : value;
 } else if (styleName === 'aspectRatio') {
 if (selectedImage.style.aspectRatio === value) {
 selectedImage.style.aspectRatio = '';
 selectedImage.style.objectFit = '';
 } else {
 selectedImage.style.aspectRatio = value;
 selectedImage.style.objectFit = 'cover';
 }
 } else if (styleName === 'display') {
 if (value === 'block') {
 selectedImage.style.display = 'block';
 selectedImage.style.marginLeft = 'auto';
 selectedImage.style.marginRight = 'auto';
 selectedImage.style.verticalAlign = 'baseline';
 } else {
 selectedImage.style.display = 'inline-block';
 selectedImage.style.margin = '10px';
 selectedImage.style.verticalAlign = 'top';
 }
 }
 handleInput();
 setTimeout(updateMenuPosition, 50);
 }
 };

 const resizeImage = (width: string) => {
 if (selectedImage) {
 selectedImage.style.width = width;
 selectedImage.style.height = 'auto';
 handleInput();
 setTimeout(updateMenuPosition, 50);
 }
 };

 const handlePaste = (e: React.ClipboardEvent) => {
 const items = e.clipboardData.items;
 let imageFound = false;
 for (let i = 0; i < items.length; i++) {
 if (items[i].type.indexOf("image") !== -1) {
 imageFound = true;
 const file = items[i].getAsFile();
 if (file) {
 e.preventDefault();
 const reader = new FileReader();
 reader.onload = (event) => {
 const dataUri = event.target?.result as string;
 const imgHtml = `<img src="${dataUri}" style="width: 50%; height: auto; display: inline-block; margin: 10px; : 12px; cursor: pointer; transition: all 0.3s; vertical-align: top;" />`;
 execCommand("insertHTML", imgHtml);
 };
 reader.readAsDataURL(file);
 }
 }
 }
 if (!imageFound) setTimeout(handleInput, 50);
 };

 const fontSizes = [
 { label: "小 / S", size: "12px" },
 { label: "中 / M", size: "16px" },
 { label: "大 / L", size: "20px" },
 { label: "特大 / XL", size: "24px" },
 ];

 return (
 <div className="space-y-2">
 {label && (
 <div className="flex items-center px-2">
 <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{label}</label>
 </div>
 )}

 <div className={cn(
 "border-none rounded-2xl bg-card overflow-visible transition-all duration-300 relative",
 isFocused ? " shadow-xl" : "shadow-sm "
 )}>
 {selectedImage && (
 <div 
 className="fixed z-[9999] flex flex-col gap-2 p-2 bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl shadow-sm animate-in fade-in zoom-in-95 duration-200"
 style={{ 
 top: `${imageMenuPos.top}px`, 
 left: `${imageMenuPos.left}px`,
 transform: 'translateX(-50%)'
 }}
 >
 <div className="flex items-center gap-1.5">
 <TooltipProvider>
 <div className="flex items-center gap-1 pr-1">
 {[
 { w: '25%', label: '25%' },
 { w: '33%', label: '33%' },
 { w: '50%', label: '50%' },
 { w: '75%', label: '75%' },
 { w: '100%', label: '100%' },
 ].map((size) => (
 <Tooltip key={size.w}>
 <TooltipTrigger asChild>
 <Button 
 variant="ghost" 
 size="sm" 
 className={cn(
 "h-7 px-1 min-w-[28px] text-[9px] font-black text-white hover:bg-white/20 transition-all", 
 selectedImage.style.width === size.w && "bg-orange-600 shadow-inner"
 )} 
 onClick={() => resizeImage(size.w)}
 >
 {size.label}
 </Button>
 </TooltipTrigger>
 <TooltipContent className="text-[10px] font-bold">縮放 / Scale</TooltipContent>
 </Tooltip>
 ))}
 </div>

 <div className="flex items-center gap-1 px-1">
 <Tooltip>
 <TooltipTrigger asChild>
 <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20 shadow-[0_8px_30px_rgba(140,120,100,0.05)] border-none" onClick={() => toggleStyle('borderRadius', '24px')}><CircleIcon className="h-4 w-4" /></Button>
 </TooltipTrigger>
 <TooltipContent className="text-[10px] font-bold">圓角 / Round</TooltipContent>
 </Tooltip>
 <Tooltip>
 <TooltipTrigger asChild>
 <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20 shadow-[0_8px_30px_rgba(140,120,100,0.05)] border-none" onClick={() => toggleStyle('boxShadow', '0 20px 25px -5px rgba(0,0,0,0.1)')}><Layers className="h-4 w-4" /></Button>
 </TooltipTrigger>
 <TooltipContent className="text-[10px] font-bold">陰影 / Shadow</TooltipContent>
 </Tooltip>
 </div>

 <div className="flex items-center gap-1 px-1">
 <Tooltip>
 <TooltipTrigger asChild>
 <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20 shadow-[0_8px_30px_rgba(140,120,100,0.05)] border-none" onClick={() => toggleStyle('aspectRatio', '16/9')}><RectangleHorizontal className="h-4 w-4" /></Button>
 </TooltipTrigger>
 <TooltipContent className="text-[10px] font-bold">16:9</TooltipContent>
 </Tooltip>
 <Tooltip>
 <TooltipTrigger asChild>
 <Button variant="ghost" size="icon" className={cn("h-8 w-8 text-white hover:bg-white/20", selectedImage.style.display === 'inline-block' && "bg-orange-600")} onClick={() => toggleStyle('display', 'inline-block')}><Layout className="h-4 w-4" /></Button>
 </TooltipTrigger>
 <TooltipContent className="text-[10px] font-bold">行內排列 / Inline</TooltipContent>
 </Tooltip>
 <Tooltip>
 <TooltipTrigger asChild>
 <Button variant="ghost" size="icon" className={cn("h-8 w-8 text-white hover:bg-white/20", selectedImage.style.display === 'block' && "bg-orange-600")} onClick={() => toggleStyle('display', 'block')}><AlignCenter className="h-4 w-4" /></Button>
 </TooltipTrigger>
 <TooltipContent className="text-[10px] font-bold">置中 / Center</TooltipContent>
 </Tooltip>
 </div>

 <div className="flex items-center gap-1 pl-1">
 <Tooltip>
 <TooltipTrigger asChild>
 <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20 shadow-[0_8px_30px_rgba(140,120,100,0.05)] border-none" onClick={clearImageFormat}><RotateCcw className="h-4 w-4" /></Button>
 </TooltipTrigger>
 <TooltipContent className="text-[10px] font-bold">重設 / Reset</TooltipContent>
 </Tooltip>
 <Tooltip>
 <TooltipTrigger asChild>
 <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-400 hover:bg-rose-500 hover:text-white border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow" onClick={deleteImage}><Trash2 className="h-4 w-4" /></Button>
 </TooltipTrigger>
 <TooltipContent className="text-[10px] font-bold">刪除 / Del</TooltipContent>
 </Tooltip>
 </div>
 </TooltipProvider>
 </div>
 </div>
 )}

 <div className="flex items-center flex-wrap gap-1 p-1 no-print sticky top-0 z-10 bg-card/95 backdrop-blur-md rounded-t-2xl">
 <TooltipProvider>
 {[
 { icon: Bold, title: "粗體 / Bold", action: () => execCommand("bold") },
 { icon: Italic, title: "斜體 / Italic", action: () => execCommand("italic") },
 { icon: Underline, title: "底線 / Underline", action: () => execCommand("underline") },
 { icon: Strikethrough, title: "刪除線 / Strike", action: () => execCommand("strikeThrough") },
 ].map((btn, i) => (
 <Tooltip key={i}>
 <TooltipTrigger asChild>
 <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary transition-all border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow" onMouseDown={(e) => { e.preventDefault(); btn.action(); }}>
 <btn.icon className="h-4 w-4" />
 </Button>
 </TooltipTrigger>
 <TooltipContent side="bottom" className="text-[9px] font-black uppercase">{btn.title}</TooltipContent>
 </Tooltip>
 ))}
 
 <div className="w-[1px] h-4 bg- mx-1 border-none" />

 <Tooltip>
 <Popover>
 <TooltipTrigger asChild>
 <PopoverTrigger asChild>
 <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary transition-all border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow">
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
 className="justify-start h-8 px-3 rounded-lg text-[10px] font-black uppercase border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow"
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
 <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary transition-all border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow">
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

 <div className="w-[1px] h-4 bg- mx-1 border-none" />

 {[
 { icon: List, title: "項目 / Bullet", action: () => execCommand("insertUnorderedList") },
 { icon: ListOrdered, title: "清單 / List", action: () => execCommand("insertOrderedList") },
 { icon: AlignLeft, title: "左 / Left", action: () => execCommand("justifyLeft") },
 { icon: AlignCenter, title: "中 / Center", action: () => execCommand("justifyCenter") },
 { icon: AlignRight, title: "右 / Right", action: () => execCommand("justifyRight") },
 ].map((btn, i) => (
 <Tooltip key={i}>
 <TooltipTrigger asChild>
 <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary transition-all border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow" onMouseDown={(e) => { e.preventDefault(); btn.action(); }}>
 <btn.icon className="h-4 w-4" />
 </Button>
 </TooltipTrigger>
 <TooltipContent side="bottom" className="text-[9px] font-black uppercase">{btn.title}</TooltipContent>
 </Tooltip>
 ))}

 <div className="flex-1" />
 
 <Tooltip>
 <TooltipTrigger asChild>
 <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-rose-500 transition-all border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow" onMouseDown={(e) => { e.preventDefault(); execCommand("removeFormat"); }}>
 <Eraser className="h-4 w-4" />
 </Button>
 </TooltipTrigger>
 <TooltipContent side="bottom" className="text-[9px] font-black uppercase">清除 / Clear</TooltipContent>
 </Tooltip>
 </TooltipProvider>
 </div>

 <div className="p-0.5 bg-card min-h-[300px] relative rounded-b-2xl">
 <div
 ref={editorRef}
 contentEditable
 onInput={handleInput}
 onClick={handleEditorClick}
 onFocus={() => { setIsFocused(true); onFocusProp?.(); }}
 onBlur={() => { setIsFocused(false); onBlurProp?.(); }}
 onPaste={handlePaste}
 className={cn(
 "w-full max-w-full min-h-[290px] p-4 md:p-8 bg-card text-foreground outline-none prose prose-p:bg-transparent prose-li:bg-transparent prose-sm transition-all duration-300",
 "dark:prose-invert",
 "focus:ring-0",
 "[&_ul]:list-disc [&_ol]:list-decimal [&_ul,&_ol]:ml-6 [&_ol]:my-3",
 "[&_p]:leading-[1.7] [&_p]:mb-3 [&_p]:text-foreground",
 "[&_img]:cursor-pointer [&_img]:transition-all [&_img]:duration-300 [&_img]:shadow-md [&_img:hover]:shadow-lg [&_img]:rounded-xl [&_img]:inline-block [&_img]:max-w-full [&_img]:align-top",
 "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:font-medium"
 )}
 data-placeholder={`撰寫教案內容... (支援貼上圖片) / Write content here... (Supports pasting images)`}
 />
 </div>
 </div>
 </div>
 );
}
