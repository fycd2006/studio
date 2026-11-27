"use client";

import React, { useEffect, useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  const { activeEditor } = useActiveEditor();
  const [, setTick] = useState(0);
  const [popover, setPopover] = useState<string | null>(null);
  const [sizeInput, setSizeInput] = useState("");
  const [url, setUrl] = useState("");
  const [linkText, setLinkText] = useState("");

  useEffect(() => {
    if (!activeEditor) return;
    const refresh = () => setTick((t) => (t + 1) % 10_000);
    activeEditor.on("selectionUpdate", refresh);
    activeEditor.on("transaction", refresh);
    activeEditor.on("focus", refresh);
    return () => {
      activeEditor.off("selectionUpdate", refresh);
      activeEditor.off("transaction", refresh);
      activeEditor.off("focus", refresh);
    };
  }, [activeEditor]);

  const textStyleAttrs = (activeEditor?.getAttributes("textStyle") || {}) as {
    fontFamily?: string;
    fontSize?: string;
    color?: string;
  };
  const highlightAttrs = (activeEditor?.getAttributes("highlight") || {}) as { color?: string };

  const currentFont = normalizeFontLabel(textStyleAttrs.fontFamily);
  const currentSize = parseFontSizePx(textStyleAttrs.fontSize);
  const currentColor = textStyleAttrs.color;
  const currentHighlight = highlightAttrs.color;
  const disabled = !activeEditor || !activeEditor.isEditable;

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
    if (!activeEditor || !activeEditor.isEditable) return;
    fn();
    if (close) setPopover(null);
  };

  const changeSize = (nextSize: number) => {
    if (!Number.isInteger(nextSize) || nextSize < 8 || nextSize > 120) return;
    run(() => activeEditor?.chain().focus().setFontSize(`${nextSize}px`).run());
  };

  const insertMedia = (event: React.FormEvent, isImage: boolean) => {
    event.preventDefault();
    if (!activeEditor) return;
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
        activeEditor
          .chain()
          .focus()
          .setImage({ src: resolved.href, alt: "", width: "75%", align: "center" } as never)
          .run(),
      );
    } else if (linkText.trim()) {
      const text = linkText.trim();
      run(() =>
        activeEditor
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
      run(() => activeEditor.chain().focus().extendMarkRange("link").setLink({ href: resolved.href }).run());
    }
  };

  const inlineButtons = [
    {
      icon: Bold,
      label: "粗體",
      active: Boolean(activeEditor?.isActive("bold")),
      onClick: () => run(() => activeEditor?.chain().focus().toggleBold().run(), false),
    },
    {
      icon: Italic,
      label: "斜體",
      active: Boolean(activeEditor?.isActive("italic")),
      onClick: () => run(() => activeEditor?.chain().focus().toggleItalic().run(), false),
    },
    {
      icon: Underline,
      label: "底線",
      active: Boolean(activeEditor?.isActive("underline")),
      onClick: () => run(() => activeEditor?.chain().focus().toggleUnderline().run(), false),
    },
    {
      icon: Strikethrough,
      label: "刪除線",
      active: Boolean(activeEditor?.isActive("strike")),
      onClick: () => run(() => activeEditor?.chain().focus().toggleStrike().run(), false),
    },
  ];

  const listAndAlignButtons = [
    {
      icon: List,
      label: "項目符號",
      active: Boolean(activeEditor?.isActive("bulletList")),
      onClick: () => run(() => activeEditor?.chain().focus().toggleBulletList().run(), false),
    },
    {
      icon: ListOrdered,
      label: "編號清單",
      active: Boolean(activeEditor?.isActive("orderedList")),
      onClick: () => run(() => activeEditor?.chain().focus().toggleOrderedList().run(), false),
    },
    {
      icon: CheckSquare,
      label: "核取清單",
      active: Boolean(activeEditor?.isActive("taskList")),
      onClick: () => run(() => activeEditor?.chain().focus().toggleTaskList().run(), false),
    },
    {
      icon: AlignLeft,
      label: "靠左對齊",
      active: Boolean(activeEditor?.isActive({ textAlign: "left" })),
      onClick: () => run(() => activeEditor?.chain().focus().setTextAlign("left").run(), false),
    },
    {
      icon: AlignCenter,
      label: "置中對齊",
      active: Boolean(activeEditor?.isActive({ textAlign: "center" })),
      onClick: () => run(() => activeEditor?.chain().focus().setTextAlign("center").run(), false),
    },
    {
      icon: AlignRight,
      label: "靠右對齊",
      active: Boolean(activeEditor?.isActive({ textAlign: "right" })),
      onClick: () => run(() => activeEditor?.chain().focus().setTextAlign("right").run(), false),
    },
    {
      icon: AlignJustify,
      label: "左右對齊",
      active: Boolean(activeEditor?.isActive({ textAlign: "justify" })),
      onClick: () => run(() => activeEditor?.chain().focus().setTextAlign("justify").run(), false),
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
        disabled && "opacity-60",
        className,
      )}
    >
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
            onClick={() => run(() => activeEditor?.chain().focus().setParagraph().run())}
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
              onClick={() => run(() => activeEditor?.chain().focus().setHeading({ level }).run())}
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
                    ? activeEditor?.chain().focus().setFontFamily(value).run()
                    : activeEditor?.chain().focus().unsetFontFamily().run(),
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
              run(() => activeEditor?.chain().focus().setColor(color).run()),
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => run(() => activeEditor?.chain().focus().unsetColor().run())}
            >
              恢復預設字色
            </Button>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium">醒目提示</p>
            {colorChoices(highlightColors, "底色", (color) =>
              run(() => activeEditor?.chain().focus().setHighlight({ color }).run()),
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => run(() => activeEditor?.chain().focus().unsetHighlight().run())}
            >
              清除底色
            </Button>
          </div>
        </PopoverContent>
      </Popover>

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

      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled}
        className={cn(iconClass, activeEditor?.isActive("callout") && selectedClass)}
        aria-label="重點提醒框"
        title="重點提醒框"
        aria-pressed={Boolean(activeEditor?.isActive("callout"))}
        onClick={() => run(() => activeEditor?.chain().focus().toggleCallout({ tone: "tip" }).run(), false)}
      >
        <AlertCircle className="h-4 w-4" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled}
        className={cn(iconClass, activeEditor?.isActive("blockquote") && selectedClass)}
        aria-label="引言"
        title="引言"
        aria-pressed={Boolean(activeEditor?.isActive("blockquote"))}
        onClick={() => run(() => activeEditor?.chain().focus().toggleBlockquote().run(), false)}
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
        onClick={() => run(() => activeEditor?.chain().focus().setHorizontalRule().run(), false)}
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
                  activeEditor
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

      {[false, true].map((isImage) => {
        const label = isImage ? "插入圖片" : "插入連結";
        const Icon = isImage ? ImageIcon : LinkIcon;
        return (
          <Popover key={label} {...popup(isImage ? "image" : "link")}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={disabled}
                className={iconClass}
                aria-label={label}
                title={label}
              >
                <Icon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent {...popoverProps} className="w-56 p-3">
              <form className="space-y-2" onSubmit={(event) => insertMedia(event, isImage)}>
                <Input
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  type="url"
                  required
                  aria-label={`${label}網址`}
                  placeholder="https://"
                />
                {!isImage && (
                  <Input
                    value={linkText}
                    onChange={(event) => setLinkText(event.target.value)}
                    aria-label="連結文字"
                    placeholder="連結文字"
                  />
                )}
                <Button type="submit" size="sm">
                  {label}
                </Button>
              </form>
            </PopoverContent>
          </Popover>
        );
      })}

      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled}
        className={iconClass}
        aria-label="清除格式"
        title="清除格式"
        onClick={() => run(() => activeEditor?.chain().focus().unsetAllMarks().clearNodes().run(), false)}
      >
        <Eraser className="h-4 w-4" />
      </Button>
    </div>
  );
}
