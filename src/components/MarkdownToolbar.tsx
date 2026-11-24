"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, ChevronDown, Eraser, Image as ImageIcon,
  Italic, Link as LinkIcon, List, ListOrdered, Minus, Palette, Plus, Strikethrough, Table as TableIcon, Underline,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { createEditorTableHtml } from "@/lib/editor-table";

const fontFamilies = [
  ["預設字型", ""], ["微軟正黑體", "Microsoft JhengHei"], ["新細明體", "PMingLiU"],
  ["標楷體", "DFKai-SB"], ["思源黑體", "Noto Sans TC"], ["思源宋體", "Noto Serif TC"],
  ["Arial", "Arial"], ["Georgia", "Georgia"], ["Courier New", "Courier New"],
] as const;
const fontSizes = [12, 14, 16, 18, 20, 24, 32];
const textColors = ["#0f172a", "#e11d48", "#d97706", "#ca8a04", "#16a34a", "#2563eb", "#7c3aed", "#db2777"];
const highlightColors = ["#fef08a", "#fed7aa", "#bbf7d0", "#bfdbfe", "#e9d5ff", "#fecdd3"];
const formattingButtons = [
  { icon: Bold, label: "粗體", command: "bold" },
  { icon: Italic, label: "斜體", command: "italic" },
  { icon: Underline, label: "底線", command: "underline" },
  { icon: Strikethrough, label: "刪除線", command: "strikeThrough" },
];
const paragraphButtons = [
  { icon: List, label: "項目符號", command: "insertUnorderedList" },
  { icon: ListOrdered, label: "編號清單", command: "insertOrderedList" },
  { icon: AlignLeft, label: "靠左對齊", command: "justifyLeft" },
  { icon: AlignCenter, label: "置中對齊", command: "justifyCenter" },
  { icon: AlignRight, label: "靠右對齊", command: "justifyRight" },
  { icon: AlignJustify, label: "左右對齊", command: "justifyFull" },
];
const iconClass = "h-8 w-8 shrink-0 rounded-lg";
const controlClass = "h-8 shrink-0 gap-1 rounded-lg px-2 text-xs";
const selectedClass = "bg-orange-100 text-orange-800 dark:bg-orange-400/20 dark:text-orange-200";
const ignoreAutoFocus = (event: Event) => event.preventDefault();

function containingElement(node: Node) {
  return node instanceof HTMLElement ? node : node.parentElement;
}

function readFormatting(editor: HTMLElement, range: Range) {
  const node = range.startContainer;
  const firstChild = !range.collapsed && node instanceof Element ? node.childNodes[range.startOffset] : undefined;
  const start = containingElement(firstChild ?? node) ?? editor;
  const style = getComputedStyle(start);
  const defaultFont = getComputedStyle(editor).fontFamily;
  const family = style.fontFamily.split(",")[0].replace(/["']/g, "").trim();
  const knownFont = fontFamilies.find(([, value]) => value.toLowerCase() === family.toLowerCase());
  const background = document.queryCommandValue("hiliteColor");
  const size = Math.round(parseFloat(style.fontSize)) || 14;
  const alignment = style.textAlign === "start" ? "left" : style.textAlign === "end" ? "right" : style.textAlign;
  const active = Object.fromEntries([...formattingButtons, ...paragraphButtons].map(({ command }) =>
    [command, document.queryCommandState(command)]));
  if (!paragraphButtons.slice(2).some(({ command }) => active[command])) {
    const commands: Record<string, string> = { left: "justifyLeft", center: "justifyCenter", right: "justifyRight", justify: "justifyFull" };
    if (commands[alignment]) active[commands[alignment]] = true;
  }
  return {
    font: style.fontFamily === defaultFont ? "預設字型" : knownFont?.[0] || family,
    size,
    color: style.color,
    highlight: background || "transparent",
    active,
  };
}

function applyInlineStyle(editor: HTMLElement, range: Range, property: string, value: string) {
  const selection = window.getSelection();
  if (!selection) return;
  const createSpan = () => {
    const span = document.createElement("span");
    span.style.setProperty(property, value);
    return span;
  };
  if (range.collapsed) {
    const span = createSpan();
    span.textContent = "\u200b";
    range.insertNode(span);
    selection.collapse(span.firstChild!, 1);
    return;
  }

  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  const targets: Array<{ node: Text; start: number; end: number }> = [];
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (!range.intersectsNode(node)) continue;
    const start = node === range.startContainer ? range.startOffset : 0;
    const end = node === range.endContainer ? range.endOffset : node.length;
    if (end > start) targets.push({ node, start, end });
  }
  const spans = targets.map(({ node, start, end }) => {
    const part = document.createRange();
    part.setStart(node, start);
    part.setEnd(node, end);
    const span = createSpan();
    part.surroundContents(span);
    return span;
  });
  if (spans.length > 0) {
    selection.setBaseAndExtent(spans[0].firstChild!, 0, spans[spans.length - 1].lastChild!, spans[spans.length - 1].textContent?.length ?? 0);
  }
}

export function MarkdownToolbar({ className }: { className?: string }) {
  const selectionRef = useRef<{ editor: HTMLElement; range: Range } | null>(null);
  const [formats, setFormats] = useState<ReturnType<typeof readFormatting> | null>(null);
  const [popover, setPopover] = useState<string | null>(null);
  const [sizeInput, setSizeInput] = useState("");
  const [url, setUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const size = formats?.size ?? 14;
  const popup = (name: string) => ({
    open: popover === name,
    onOpenChange: (open: boolean) => {
      setPopover(open ? name : null);
      if (open && name === "size") setSizeInput(String(size));
      if (open && (name === "link" || name === "image")) {
        setUrl("");
        setLinkText("");
      }
    },
  });

  const captureSelection = () => {
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    const editor = containingElement(range.startContainer)?.closest<HTMLElement>("[data-rich-text-editor][contenteditable='true']");
    if (!editor || !editor.contains(range.endContainer)) return;
    selectionRef.current = { editor, range: range.cloneRange() };
    setFormats(readFormatting(editor, range));
  };

  useEffect(() => {
    const handleFocus = (event: FocusEvent) => {
      if (event.target instanceof Element && event.target.closest("[data-editor-format-control]")) return;
      if (event.target instanceof Element && !event.target.closest("[data-rich-text-editor]")) {
        selectionRef.current = null;
        setFormats(null);
      } else {
        captureSelection();
      }
    };
    document.addEventListener("selectionchange", captureSelection);
    document.addEventListener("focusin", handleFocus);
    return () => {
      document.removeEventListener("selectionchange", captureSelection);
      document.removeEventListener("focusin", handleFocus);
    };
  }, []);

  const edit = (action: (editor: HTMLElement, range: Range) => void, close = true, persistCaret = false) => {
    const saved = selectionRef.current;
    const selection = window.getSelection();
    if (!saved?.editor.isConnected || !saved.editor.isContentEditable || !selection ||
        !saved.editor.contains(saved.range.commonAncestorContainer)) return;
    const { editor, range } = saved;
    const wasCollapsed = range.collapsed;
    editor.focus({ preventScroll: true });
    selection.removeAllRanges();
    selection.addRange(range);
    action(editor, range);
    captureSelection();
    if (!wasCollapsed || persistCaret) editor.dispatchEvent(new Event("input", { bubbles: true }));
    if (close) setPopover(null);
  };

  const command = (name: string, value?: string, close = true) => {
    edit(() => { document.execCommand(name, false, value); }, close, true);
  };
  const changeSize = (value: number) => {
    if (!Number.isInteger(value) || value < 8 || value > 120) return;
    edit((editor, range) => applyInlineStyle(editor, range, "font-size", value + "px"));
  };
  const resetColor = () => edit((editor, range) =>
    applyInlineStyle(editor, range, "color", "var(--editor-default-color)"));

  const preserveSelection = (event: React.PointerEvent) => {
    if (event.pointerType === "mouse" && event.target instanceof Element && event.target.closest("button")) {
      event.preventDefault();
    }
  };
  const popoverProps = {
    "data-editor-format-control": "",
    onOpenAutoFocus: (event: Event) => {
      if (!document.activeElement?.closest("[data-editor-format-control]")) event.preventDefault();
    },
    onCloseAutoFocus: ignoreAutoFocus,
    onPointerDown: preserveSelection,
    align: "start" as const,
  };
  const formatButtons = (buttons: typeof formattingButtons) => buttons.map(({ icon: Icon, label, command: cmd }) => (
    <Button key={cmd} type="button" variant="ghost" size="icon" className={cn(iconClass, formats?.active[cmd] && selectedClass)}
      aria-label={label} title={label} aria-pressed={Boolean(formats?.active[cmd])} onClick={() => command(cmd)}>
      <Icon className="h-4 w-4" />
    </Button>
  ));

  const insertMedia = (event: React.FormEvent, image: boolean) => {
    event.preventDefault();
    let resolved: URL;
    try {
      resolved = new URL(url.trim(), window.location.href);
      if (!["https:", "http:"].includes(resolved.protocol) && (image || resolved.protocol !== "mailto:")) return;
    } catch {
      return;
    }
    if (image) {
      const img = document.createElement("img");
      img.src = resolved.href;
      img.alt = "";
      img.style.cssText = "width:75%; max-width:100%; height:auto; display:block; margin:12px auto;";
      command("insertHTML", img.outerHTML);
    } else if (linkText.trim()) {
      const link = document.createElement("a");
      link.href = resolved.href;
      link.textContent = linkText.trim();
      command("insertHTML", link.outerHTML);
    } else {
      command("createLink", resolved.href);
    }
  };

  const colorChoices = (colors: string[], name: string, onColor: (color: string) => void) => (
    <div className="flex flex-wrap gap-2">
      {colors.map((color) => (
        <button key={color} type="button" aria-label={name + " " + color} title={color}
          className="h-6 w-6 rounded-md border border-black/15" style={{ backgroundColor: color }} onClick={() => onColor(color)} />
      ))}
      <input type="color" aria-label={"自訂" + name} title={"自訂" + name}
        className="h-6 w-6 rounded border bg-transparent" onChange={(event) => onColor(event.target.value)} />
    </div>
  );

  return (
    <div data-editor-format-control onPointerDown={preserveSelection}
      className={cn("flex w-full items-center gap-0.5 overflow-x-auto whitespace-nowrap rounded-lg no-scrollbar", className)}>
      <Popover {...popup("heading")}>
        <PopoverTrigger asChild><Button type="button" variant="ghost" size="sm" className={controlClass}>段落 <ChevronDown className="h-3 w-3" /></Button></PopoverTrigger>
        <PopoverContent {...popoverProps} className="grid w-36 p-1.5">
          {["p", "h1", "h2", "h3"].map((tag, index) => (
            <Button key={tag} type="button" variant="ghost" size="sm" className="justify-start"
              onClick={() => command("formatBlock", tag)}>{index === 0 ? "一般段落" : "標題 " + index}</Button>
          ))}
        </PopoverContent>
      </Popover>

      <Popover {...popup("font")}>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" size="sm" aria-label={"字型 " + (formats?.font || "預設字型")} className={controlClass}>
            <span className="max-w-28 truncate">{formats?.font || "字型"}</span><ChevronDown className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent {...popoverProps} className="grid max-h-72 w-40 overflow-y-auto p-1.5">
          {fontFamilies.map(([label, value]) => (
            <Button key={label} type="button" variant="ghost" size="sm" className="justify-start" style={{ fontFamily: value }}
              onClick={() => value ? command("fontName", value) :
                edit((editor, range) => applyInlineStyle(editor, range, "font-family", "var(--editor-default-font)"))}>{label}</Button>
          ))}
        </PopoverContent>
      </Popover>
      <Button variant="ghost" size="icon" className={iconClass} aria-label="縮小字級" title="縮小字級"
        onClick={() => changeSize(size - 1)}><Minus className="h-3.5 w-3.5" /></Button>
      <Popover {...popup("size")}>
        <PopoverTrigger asChild><Button type="button" variant="ghost" size="sm" aria-label={"字級 " + size + "px"}
          className={controlClass}>{size}px <ChevronDown className="h-3 w-3" /></Button></PopoverTrigger>
        <PopoverContent {...popoverProps} className="w-44 p-2">
          <form className="mb-2 flex gap-1" onSubmit={(event) => { event.preventDefault(); changeSize(Number(sizeInput)); }}>
            <Input aria-label="自訂字級" type="number" min="8" max="120" step="1" value={sizeInput}
              onChange={(event) => setSizeInput(event.target.value)} className="h-8" />
            <Button type="submit" size="sm" variant="secondary">套用</Button>
          </form>
          <div className="grid grid-cols-2">
            {fontSizes.map((value) => <Button key={value} type="button" variant="ghost" size="sm" onClick={() => changeSize(value)}>{value}px</Button>)}
          </div>
        </PopoverContent>
      </Popover>
      <Button variant="ghost" size="icon" className={iconClass} aria-label="放大字級" title="放大字級"
        onClick={() => changeSize(size + 1)}><Plus className="h-3.5 w-3.5" /></Button>

      {formatButtons(formattingButtons)}
      <Popover {...popup("color")}>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" size="icon" aria-label="字色與醒目提示" title="字色與醒目提示" className={cn(iconClass, "flex flex-col gap-0.5")}>
            <Palette className="h-4 w-4" />
            <span className="flex h-0.5 w-4 gap-0.5" aria-hidden="true">
              <span className="flex-1" style={{ backgroundColor: formats?.color || "currentColor" }} />
              <span className="flex-1 bg-muted" style={{ backgroundColor: formats?.highlight === "rgba(0, 0, 0, 0)" ? undefined : formats?.highlight }} />
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent {...popoverProps} className="w-52 space-y-3 p-3">
          <div className="space-y-1.5"><p className="text-xs font-medium">文字顏色</p>
            {colorChoices(textColors, "字色", (color) => command("foreColor", color))}
            <Button type="button" variant="ghost" size="sm" onClick={resetColor}>恢復預設字色</Button>
          </div>
          <div className="space-y-1.5"><p className="text-xs font-medium">醒目提示</p>
            {colorChoices(highlightColors, "底色", (color) => command("hiliteColor", color))}
            <Button type="button" variant="ghost" size="sm" onClick={() => command("hiliteColor", "transparent")}>清除底色</Button>
          </div>
        </PopoverContent>
      </Popover>
      {formatButtons(paragraphButtons)}
      <Popover {...popup("table")}>
        <PopoverTrigger asChild><Button type="button" variant="ghost" size="icon" className={iconClass}
          aria-label="插入表格" title="插入表格"><TableIcon className="h-4 w-4" /></Button></PopoverTrigger>
        <PopoverContent {...popoverProps} className="grid w-40 grid-cols-2 p-2">
          {[[1, 2], [2, 2], [2, 3], [3, 3], [4, 3], [4, 4]].map(([rows, columns]) => (
            <Button key={rows + "x" + columns} type="button" variant="ghost" size="sm"
              onClick={() => command("insertHTML", createEditorTableHtml(rows, columns))}>
              {rows} × {columns}
            </Button>
          ))}
        </PopoverContent>
      </Popover>
      {[false, true].map((image) => {
        const label = image ? "插入圖片" : "插入連結";
        const Icon = image ? ImageIcon : LinkIcon;
        return (
          <Popover key={label} {...popup(image ? "image" : "link")}>
            <PopoverTrigger asChild><Button type="button" variant="ghost" size="icon" className={iconClass}
              aria-label={label} title={label}><Icon className="h-4 w-4" /></Button></PopoverTrigger>
            <PopoverContent {...popoverProps} className="w-56 p-3">
              <form className="space-y-2" onSubmit={(event) => insertMedia(event, image)}>
                <Input value={url} onChange={(event) => setUrl(event.target.value)} type="url" required
                  aria-label={label + "網址"} placeholder="https://" />
                {!image && <Input value={linkText} onChange={(event) => setLinkText(event.target.value)} aria-label="連結文字" placeholder="連結文字" />}
                <Button type="submit" size="sm">{label}</Button>
              </form>
            </PopoverContent>
          </Popover>
        );
      })}
      <Button variant="ghost" size="icon" className={iconClass} aria-label="清除格式" title="清除格式"
        onClick={() => command("removeFormat")}><Eraser className="h-4 w-4" /></Button>
    </div>
  );
}
