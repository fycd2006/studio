"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  CheckSquare,
  ChevronDown,
  Eraser,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Palette,
  Plus,
  Quote,
  Strikethrough,
  Table as TableIcon,
  Underline,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { maxEmbeddedImageBytes, prepareClipboardImage, utf8Length } from "@/lib/editor-image";
import { cn } from "@/lib/utils";
import { useActiveEditor } from "./editor/editor-context";

const fontFamilies = [
  ["預設字型", ""],
  ["微軟正黑體", "Microsoft JhengHei"],
  ["新細明體", "PMingLiU"],
  ["標楷體", "DFKai-SB"],
  ["思源黑體", "Noto Sans TC"],
  ["思源宋體", "Noto Serif TC"],
  ["Arial", "Arial"],
  ["Georgia", "Georgia"],
  ["Courier New", "Courier New"],
] as const;

const fontSizes = [12, 14, 16, 18, 20, 24, 32];
const textColors = ["#0f172a", "#e11d48", "#d97706", "#ca8a04", "#16a34a", "#2563eb", "#7c3aed", "#db2777"];
const highlightColors = ["#fef08a", "#fed7aa", "#bbf7d0", "#bfdbfe", "#e9d5ff", "#fecdd3"];

const iconClass = "h-8 w-8 shrink-0 rounded-lg";
const controlClass = "h-8 shrink-0 gap-1 rounded-lg px-2 text-xs";
const selectedClass = "bg-orange-100 text-orange-800 dark:bg-orange-400/20 dark:text-orange-200";
const ignoreAutoFocus = (event: Event) => event.preventDefault();

function Divider() {
  return <span className="mx-1 h-4 w-px shrink-0 bg-stone-200 dark:bg-white/10" aria-hidden="true" />;
}

function normalizeFontLabel(rawFamily: string | undefined | null): string {
  if (!rawFamily) return "預設字型";
  const first = rawFamily.split(",")[0].replace(/["']/g, "").trim().toLowerCase();
  const matched = fontFamilies.find(([, val]) => val.toLowerCase() === first);
  if (matched) return matched[0];
  return rawFamily.split(",")[0].replace(/["']/g, "").trim() || "預設字型";
}

function parseFontSizePx(rawSize: string | undefined | null): number {
  if (!rawSize) return 15;
  const parsed = Math.round(parseFloat(rawSize));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 15;
}

export function MarkdownToolbar({ className }: { className?: string }) {
  const { activeEditor, primaryEditor, getPasteBudgetForEditor } = useActiveEditor();
  const { toast } = useToast();
  const editor = activeEditor ?? primaryEditor;

  const [, setTick] = useState(0);
  const [popover, setPopover] = useState<string | null>(null);
  const [sizeInput, setSizeInput] = useState("");
  const [url, setUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editor) return;
    const refresh = () => setTick((t) => (t + 1) % 10_000);
    const onTransaction = ({
      transaction,
    }: {
      transaction: { docChanged: boolean; selectionSet: boolean; storedMarksSet: boolean };
    }) => {
      if (transaction.docChanged || transaction.selectionSet || transaction.storedMarksSet) {
        refresh();
      }
    };
    editor.on("selectionUpdate", refresh);
    editor.on("transaction", onTransaction);
    editor.on("focus", refresh);
    return () => {
      editor.off("selectionUpdate", refresh);
      editor.off("transaction", onTransaction);
      editor.off("focus", refresh);
    };
  }, [editor]);

  const textStyleAttrs = (editor?.getAttributes("textStyle") || {}) as {
    fontFamily?: string;
    fontSize?: string;
    color?: string;
  };
  const highlightAttrs = (editor?.getAttributes("highlight") || {}) as { color?: string };

  const currentFont = normalizeFontLabel(textStyleAttrs.fontFamily);
  const currentSize = parseFontSizePx(textStyleAttrs.fontSize);
  const currentColor = textStyleAttrs.color;
  const currentHighlight = highlightAttrs.color;
  const disabled = !editor || !editor.isEditable;

  const popup = (name: string) => ({
    open: popover === name,
    onOpenChange: (open: boolean) => {
      setPopover(open ? name : null);
      if (open && name === "size") setSizeInput(String(currentSize));
      if (open && (name === "link" || name === "image")) {
        setUrl("");
        setLinkText("");
      }
    },
  });

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

  const run = (fn: () => void, close = true) => {
    if (!editor || !editor.isEditable) return;
    fn();
    if (close) setPopover(null);
  };

  const changeSize = (nextSize: number) => {
    if (!Number.isInteger(nextSize) || nextSize < 8 || nextSize > 120) return;
    run(() => editor?.chain().focus().setFontSize(`${nextSize}px`).run());
  };

  const handleImageFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !editor || !editor.isEditable) return;
    setIsUploading(true);
    try {
      const budget = getPasteBudgetForEditor(editor);
      const compressed = await prepareClipboardImage(
        file,
        Math.min(maxEmbeddedImageBytes, Math.max(0, budget - 512)),
      );
      if (utf8Length(compressed.src) > budget) {
        throw new Error("Exceeds size");
      }
      editor
        .chain()
        .focus()
        .setImage({ src: compressed.src, alt: file.name || "圖片", width: "75%", align: "center" } as never)
        .run();
      setPopover(null);
    } catch {
      toast({
        title: "無法插入圖片",
        description: "圖片大小超過文件剩餘容量，請壓縮後再試。",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const insertMedia = (event: React.FormEvent, isImage: boolean) => {
    event.preventDefault();
    if (!editor) return;
    let resolved: URL;
    try {
      resolved = new URL(url.trim(), window.location.href);
      if (!["https:", "http:"].includes(resolved.protocol) && (isImage || resolved.protocol !== "mailto:")) {
        return;
      }
    } catch {
      return;
    }

    if (isImage) {
      run(() =>
        editor
          .chain()
          .focus()
          .setImage({ src: resolved.href, alt: "", width: "75%", align: "center" } as never)
          .run(),
      );
    } else if (linkText.trim()) {
      const text = linkText.trim();
      run(() =>
        editor
          .chain()
          .focus()
          .insertContent({
            type: "text",
            text,
            marks: [{ type: "link", attrs: { href: resolved.href } }],
          })
          .run(),
      );
    } else {
      run(() => editor.chain().focus().extendMarkRange("link").setLink({ href: resolved.href }).run());
    }
  };

  const inlineButtons = [
    {
      icon: Bold,
      label: "粗體",
      active: Boolean(editor?.isActive("bold")),
      onClick: () => run(() => editor?.chain().focus().toggleBold().run(), false),
    },
    {
      icon: Italic,
      label: "斜體",
      active: Boolean(editor?.isActive("italic")),
      onClick: () => run(() => editor?.chain().focus().toggleItalic().run(), false),
    },
    {
      icon: Underline,
      label: "底線",
      active: Boolean(editor?.isActive("underline")),
      onClick: () => run(() => editor?.chain().focus().toggleUnderline().run(), false),
    },
    {
      icon: Strikethrough,
      label: "刪除線",
      active: Boolean(editor?.isActive("strike")),
      onClick: () => run(() => editor?.chain().focus().toggleStrike().run(), false),
    },
  ];

  const listAndAlignButtons = [
    {
      icon: List,
      label: "項目符號",
      active: Boolean(editor?.isActive("bulletList")),
      onClick: () => run(() => editor?.chain().focus().toggleBulletList().run(), false),
    },
    {
      icon: ListOrdered,
      label: "編號清單",
      active: Boolean(editor?.isActive("orderedList")),
      onClick: () => run(() => editor?.chain().focus().toggleOrderedList().run(), false),
    },
    {
      icon: CheckSquare,
      label: "核取清單",
      active: Boolean(editor?.isActive("taskList")),
      onClick: () => run(() => editor?.chain().focus().toggleTaskList().run(), false),
    },
    {
      icon: AlignLeft,
      label: "靠左對齊",
      active: Boolean(editor?.isActive({ textAlign: "left" })),
      onClick: () => run(() => editor?.chain().focus().setTextAlign("left").run(), false),
    },
    {
      icon: AlignCenter,
      label: "置中對齊",
      active: Boolean(editor?.isActive({ textAlign: "center" })),
      onClick: () => run(() => editor?.chain().focus().setTextAlign("center").run(), false),
    },
    {
      icon: AlignRight,
      label: "靠右對齊",
      active: Boolean(editor?.isActive({ textAlign: "right" })),
      onClick: () => run(() => editor?.chain().focus().setTextAlign("right").run(), false),
    },
    {
      icon: AlignJustify,
      label: "左右對齊",
      active: Boolean(editor?.isActive({ textAlign: "justify" })),
      onClick: () => run(() => editor?.chain().focus().setTextAlign("justify").run(), false),
    },
  ];

  const colorChoices = (colors: string[], name: string, onColor: (color: string) => void) => (
    <div className="flex flex-wrap gap-2">
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={`${name} ${color}`}
          title={color}
          className="h-6 w-6 rounded-md border border-black/15"
          style={{ backgroundColor: color }}
          onClick={() => onColor(color)}
        />
      ))}
      <input
        type="color"
        aria-label={`自訂${name}`}
        title={`自訂${name}`}
        className="h-6 w-6 rounded border bg-transparent"
        onChange={(event) => onColor(event.target.value)}
      />
    </div>
  );

  return (
    <div
      data-editor-format-control=""
      onPointerDown={preserveSelection}
      className={cn(
        "flex w-full items-center gap-0.5 overflow-x-auto whitespace-nowrap rounded-lg no-scrollbar",
        disabled && "opacity-55",
        className,
      )}
    >
      {/* Quick Insert Block Menu (Mouse-friendly alternative to /) */}
      <Popover {...popup("insertBlock")}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            className="h-8 shrink-0 gap-1 rounded-lg bg-orange-500/10 px-2.5 text-xs font-semibold text-orange-700 hover:bg-orange-500/15 dark:text-orange-300"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>插入</span>
            <ChevronDown className="h-3 w-3 opacity-70" />
          </Button>
        </PopoverTrigger>
        <PopoverContent {...popoverProps} className="grid w-44 gap-0.5 p-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 justify-start gap-2 text-xs"
            onClick={() => run(() => editor?.chain().focus().setHeading({ level: 1 }).run())}
          >
            <Heading1 className="size-3.5 text-orange-500" /> 大標題 H1
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 justify-start gap-2 text-xs"
            onClick={() => run(() => editor?.chain().focus().setHeading({ level: 2 }).run())}
          >
            <Heading2 className="size-3.5 text-orange-500" /> 次標題 H2
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 justify-start gap-2 text-xs"
            onClick={() => run(() => editor?.chain().focus().setHeading({ level: 3 }).run())}
          >
            <Heading3 className="size-3.5 text-orange-500" /> 小標題 H3
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 justify-start gap-2 text-xs"
            onClick={() => run(() => editor?.chain().focus().toggleTaskList().run())}
          >
            <CheckSquare className="size-3.5 text-orange-500" /> 核取清單
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 justify-start gap-2 text-xs"
            onClick={() => run(() => editor?.chain().focus().toggleCallout({ tone: "tip" }).run())}
          >
            <AlertCircle className="size-3.5 text-orange-500" /> 重點提醒框
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 justify-start gap-2 text-xs"
            onClick={() => run(() => editor?.chain().focus().toggleBlockquote().run())}
          >
            <Quote className="size-3.5 text-orange-500" /> 引言區塊
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 justify-start gap-2 text-xs"
            onClick={() =>
              run(() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: false }).run())
            }
          >
            <TableIcon className="size-3.5 text-orange-500" /> 表格 3 × 3
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 justify-start gap-2 text-xs"
            onClick={() => run(() => editor?.chain().focus().setHorizontalRule().run())}
          >
            <Minus className="size-3.5 text-orange-500" /> 分隔線
          </Button>
        </PopoverContent>
      </Popover>

      <Divider />

      <Popover {...popup("heading")}>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className={controlClass} disabled={disabled}>
            段落 <ChevronDown className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent {...popoverProps} className="grid w-36 p-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="justify-start"
            onClick={() => run(() => editor?.chain().focus().setParagraph().run())}
          >
            一般段落
          </Button>
          {([1, 2, 3] as const).map((level) => (
            <Button
              key={level}
              type="button"
              variant="ghost"
              size="sm"
              className="justify-start"
              onClick={() => run(() => editor?.chain().focus().setHeading({ level }).run())}
            >
              標題 {level}
            </Button>
          ))}
        </PopoverContent>
      </Popover>

      <Popover {...popup("font")}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`字型 ${currentFont}`}
            className={controlClass}
            disabled={disabled}
          >
            <span className="max-w-28 truncate">{currentFont}</span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent {...popoverProps} className="grid max-h-72 w-40 overflow-y-auto p-1.5">
          {fontFamilies.map(([label, value]) => (
            <Button
              key={label}
              type="button"
              variant="ghost"
              size="sm"
              className="justify-start"
              style={{ fontFamily: value || undefined }}
              onClick={() =>
                run(() =>
                  value
                    ? editor?.chain().focus().setFontFamily(value).run()
                    : editor?.chain().focus().unsetFontFamily().run(),
                )
              }
            >
              {label}
            </Button>
          ))}
        </PopoverContent>
      </Popover>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={iconClass}
        aria-label="縮小字級"
        title="縮小字級"
        disabled={disabled}
        onClick={() => changeSize(currentSize - 1)}
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>

      <Popover {...popup("size")}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`字級 ${currentSize}px`}
            className={controlClass}
            disabled={disabled}
          >
            {currentSize}px <ChevronDown className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent {...popoverProps} className="w-44 p-2">
          <form
            className="mb-2 flex gap-1"
            onSubmit={(event) => {
              event.preventDefault();
              changeSize(Number(sizeInput));
            }}
          >
            <Input
              aria-label="自訂字級"
              type="number"
              min="8"
              max="120"
              step="1"
              value={sizeInput}
              onChange={(event) => setSizeInput(event.target.value)}
              className="h-8"
            />
            <Button type="submit" size="sm" variant="secondary">
              套用
            </Button>
          </form>
          <div className="grid grid-cols-2">
            {fontSizes.map((value) => (
              <Button
                key={value}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => changeSize(value)}
              >
                {value}px
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={iconClass}
        aria-label="放大字級"
        title="放大字級"
        disabled={disabled}
        onClick={() => changeSize(currentSize + 1)}
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>

      <Divider />

      {inlineButtons.map(({ icon: Icon, label, active, onClick }) => (
        <Button
          key={label}
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          className={cn(iconClass, active && selectedClass)}
          aria-label={label}
          title={label}
          aria-pressed={active}
          onClick={onClick}
        >
          <Icon className="h-4 w-4" />
        </Button>
      ))}

      <Popover {...popup("color")}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            aria-label="字色與醒目提示"
            title="字色與醒目提示"
            className={cn(iconClass, "flex flex-col gap-0.5")}
          >
            <Palette className="h-4 w-4" />
            <span className="flex h-0.5 w-4 gap-0.5" aria-hidden="true">
              <span className="flex-1" style={{ backgroundColor: currentColor || "currentColor" }} />
              <span className="flex-1 bg-muted" style={{ backgroundColor: currentHighlight || undefined }} />
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent {...popoverProps} className="w-52 space-y-3 p-3">
          <div className="space-y-1.5">
            <p className="text-xs font-medium">文字顏色</p>
            {colorChoices(textColors, "字色", (color) =>
              run(() => editor?.chain().focus().setColor(color).run()),
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => run(() => editor?.chain().focus().unsetColor().run())}
            >
              恢復預設字色
            </Button>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium">醒目提示</p>
            {colorChoices(highlightColors, "底色", (color) =>
              run(() => editor?.chain().focus().setHighlight({ color }).run()),
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => run(() => editor?.chain().focus().unsetHighlight().run())}
            >
              清除底色
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Divider />

      {listAndAlignButtons.map(({ icon: Icon, label, active, onClick }) => (
        <Button
          key={label}
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          className={cn(iconClass, active && selectedClass)}
          aria-label={label}
          title={label}
          aria-pressed={active}
          onClick={onClick}
        >
          <Icon className="h-4 w-4" />
        </Button>
      ))}

      <Divider />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled}
        className={cn(iconClass, editor?.isActive("callout") && selectedClass)}
        aria-label="重點提醒框"
        title="重點提醒框"
        aria-pressed={Boolean(editor?.isActive("callout"))}
        onClick={() => run(() => editor?.chain().focus().toggleCallout({ tone: "tip" }).run(), false)}
      >
        <AlertCircle className="h-4 w-4" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled}
        className={cn(iconClass, editor?.isActive("blockquote") && selectedClass)}
        aria-label="引言"
        title="引言"
        aria-pressed={Boolean(editor?.isActive("blockquote"))}
        onClick={() => run(() => editor?.chain().focus().toggleBlockquote().run(), false)}
      >
        <Quote className="h-4 w-4" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled}
        className={iconClass}
        aria-label="分隔線"
        title="分隔線"
        onClick={() => run(() => editor?.chain().focus().setHorizontalRule().run(), false)}
      >
        <Minus className="h-4 w-4" />
      </Button>

      <Popover {...popup("table")}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            className={iconClass}
            aria-label="插入表格"
            title="插入表格"
          >
            <TableIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent {...popoverProps} className="grid w-40 grid-cols-2 p-2">
          {[
            [1, 2],
            [2, 2],
            [2, 3],
            [3, 3],
            [4, 3],
            [4, 4],
          ].map(([rows, columns]) => (
            <Button
              key={`${rows}x${columns}`}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                run(() =>
                  editor
                    ?.chain()
                    .focus()
                    .insertTable({ rows, cols: columns, withHeaderRow: false })
                    .run(),
                )
              }
            >
              {rows} × {columns}
            </Button>
          ))}
        </PopoverContent>
      </Popover>

      <Popover {...popup("link")}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            className={iconClass}
            aria-label="插入連結"
            title="插入連結"
          >
            <LinkIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent {...popoverProps} className="w-60 p-3">
          <form className="space-y-2" onSubmit={(event) => insertMedia(event, false)}>
            <Input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              type="url"
              required
              aria-label="插入連結網址"
              placeholder="https://"
            />
            <Input
              value={linkText}
              onChange={(event) => setLinkText(event.target.value)}
              aria-label="連結文字"
              placeholder="連結文字"
            />
            <Button type="submit" size="sm">
              插入連結
            </Button>
          </form>
        </PopoverContent>
      </Popover>

      <Popover {...popup("image")}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            className={iconClass}
            aria-label="插入圖片"
            title="插入圖片"
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent {...popoverProps} className="w-64 space-y-2.5 p-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void handleImageFileSelect(e)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="h-8 w-full gap-1.5 rounded-lg border-dashed border-orange-500/45 bg-orange-500/5 text-xs font-medium text-orange-700 hover:bg-orange-500/10 dark:text-orange-300"
          >
            <Upload className="size-3.5" aria-hidden="true" />
            {isUploading ? "處理圖片中…" : "從裝置選擇圖片上傳"}
          </Button>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            或網址
            <span className="h-px flex-1 bg-border" />
          </div>
          <form className="space-y-2" onSubmit={(event) => insertMedia(event, true)}>
            <Input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              type="url"
              required
              aria-label="插入圖片網址"
              placeholder="https://"
            />
            <Button type="submit" size="sm" className="w-full">
              插入圖片
            </Button>
          </form>
        </PopoverContent>
      </Popover>

      <Divider />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled}
        className={iconClass}
        aria-label="清除格式"
        title="清除格式"
        onClick={() => run(() => editor?.chain().focus().unsetAllMarks().clearNodes().run(), false)}
      >
        <Eraser className="h-4 w-4" />
      </Button>
    </div>
  );
}
