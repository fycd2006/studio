
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
    placeholder?: string;
    minHeight?: string;
}

export function MarkdownArea({ label, value, onChange, onFocus: onFocusProp, onBlur: onBlurProp, placeholder, minHeight = '500px' }: MarkdownAreaProps) {
    const editorRef = useRef<HTMLDivElement>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
    const [imageMenuPos, setImageMenuPos] = useState({ top: 0, left: 0 });

    const isEditorEmpty = !value || value.replace(/<(img|table|iframe|video)[^>]*>/gi, 'HAS_MEDIA').replace(/<[^>]*>|&nbsp;|\s/gi, '').length === 0;

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
                        document.execCommand("insertHTML", false, imgHtml);
                    };
                    reader.readAsDataURL(file);
                }
            }
        }
        if (!imageFound) setTimeout(handleInput, 50);
    };

    return (
        <div className="space-y-2">
            {label && (
                <div className="flex items-center px-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{label}</label>
                </div>
            )}

            <div className={cn(
                "border-none rounded-none bg-transparent overflow-visible transition-all duration-300 relative group",
                isFocused ? " ring-1 ring-stone-200 dark:ring-slate-700" : ""
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


                <div style={{ minHeight }} className="h-auto relative">
                    {isEditorEmpty && (
                        <div className="absolute top-1 left-1 md:top-2 md:left-2 p-0 m-0 pointer-events-none text-muted-foreground font-medium text-[14px] select-none z-10 w-full whitespace-pre-wrap break-words">
                            {placeholder || `撰寫教案內容... (支援貼上圖片) / Write content here... (Supports pasting images)`}
                        </div>
                    )}
                    <div
                        ref={editorRef}
                        contentEditable
                        onInput={handleInput}
                        onClick={handleEditorClick}
                        onFocus={() => { setIsFocused(true); onFocusProp?.(); }}
                        onBlur={() => { setIsFocused(false); onBlurProp?.(); }}
                        onPaste={handlePaste}
                        style={{ minHeight }}
                        className={cn(
                            "relative w-full max-w-full h-auto p-1 md:p-2 bg-transparent text-foreground outline-none prose prose-p:bg-transparent prose-li:bg-transparent prose-sm text-[14px] transition-all duration-[300ms]",
                            "dark:prose-invert break-words whitespace-pre-wrap",
                            "focus:ring-0",
                            "[&_ul]:list-disc [&_ol]:list-decimal [&_ul,&_ol]:ml-6 [&_ol]:my-3",
                            "[&_p]:leading-[1.7] [&_p]:mb-3 [&_p:last-child]:mb-0 [&_p]:text-foreground",
                            "[&_img]:cursor-pointer [&_img]:transition-all [&_img]:duration-300 [&_img]:shadow-md [&_img:hover]:shadow-lg [&_img]:rounded-xl [&_img]:inline-block [&_img]:max-w-full [&_img]:h-auto [&_img]:object-contain [&_img]:align-top",
                            "[&_table]:block [&_table]:overflow-x-auto [&_table]:w-full [&_table]:max-w-full"
                        )}
                        data-placeholder={placeholder || `撰寫教案內容... (支援貼上圖片) / Write content here... (Supports pasting images)`}
                    />
                </div>
            </div>
        </div>
    );
}
