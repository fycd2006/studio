"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyleKit } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import { TableKit } from "@tiptap/extension-table";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Placeholder } from "@tiptap/extensions";
import { Grid } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { parseEditorHtml } from "@/lib/editor-html";
import { maxEmbeddedImageBytes, prepareClipboardImage, utf8Length } from "@/lib/editor-image";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useActiveEditor } from "./editor/editor-context";
import { Callout, CustomImage, mergeCellRight, normalizeLegacyHtml } from "./editor/extensions";
import { EditorBubbleMenu } from "./editor/EditorBubbleMenu";
import { SlashCommandMenu } from "./editor/SlashCommandMenu";

const EMPTY_HTML_RE = /^(?:<p>(?:\s|<br\s*\/?>)*<\/p>|<div>(?:\s|<br\s*\/?>)*<\/div>)*$/i;

function normalizeEmptyHtml(html: string): string {
  return EMPTY_HTML_RE.test(html.trim()) ? "" : html;
}

interface O2RichEditorProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  minHeight?: string;
  readOnly?: boolean;
  simplified?: boolean;
  hideToolbar?: boolean;
  getPasteBudget?: () => number;
  fieldName?: string;
}

export function O2RichEditor({
  label,
  value,
  onChange,
  onFocus: onFocusProp,
  onBlur: onBlurProp,
  placeholder,
  minHeight = "220px",
  readOnly = false,
  simplified = false,
  getPasteBudget,
  fieldName,
}: O2RichEditorProps) {
  const { toast } = useToast();
  const { setActiveEditor } = useActiveEditor();
  const containerRef = useRef<HTMLDivElement>(null);

  const [isFocused, setIsFocused] = useState(false);
  const [tableMenuPos, setTableMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [tableActionsOpen, setTableActionsOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState("");

  const isInternalChange = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestHtmlRef = useRef<string | null>(null);
  const onChangeRef = useRef(onChange);
  const readOnlyRef = useRef(readOnly);
  const getPasteBudgetRef = useRef(getPasteBudget);

  useEffect(() => {
    onChangeRef.current = onChange;
    readOnlyRef.current = readOnly;
    getPasteBudgetRef.current = getPasteBudget;
  }, [onChange, readOnly, getPasteBudget]);

  const flushPendingInput = useCallback(() => {
    if (!debounceTimer.current) return;
    clearTimeout(debounceTimer.current);
    debounceTimer.current = null;
    const html = latestHtmlRef.current;
    if (html === null) return;
    isInternalChange.current = true;
    onChangeRef.current(html);
  }, []);

  const flushPendingInputRef = useRef(flushPendingInput);
  useEffect(() => {
    flushPendingInputRef.current = flushPendingInput;
  }, [flushPendingInput]);

  useEffect(() => {
    const handleBeforeUnload = () => flushPendingInputRef.current();
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      flushPendingInputRef.current();
    };
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    editable: !readOnly,
    content: normalizeLegacyHtml(value || ""),
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: {
          openOnClick: false,
          HTMLAttributes: {
            class: "text-orange-600 dark:text-amber-400 underline underline-offset-2 hover:opacity-80",
            target: "_blank",
            rel: "noopener noreferrer",
          },
        },
      }),
      TextStyleKit,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TableKit.configure({
        table: {
          resizable: true,
          HTMLAttributes: {
            class: "editor-table",
          },
        },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({
        placeholder: placeholder || (simplified ? "輸入內容…" : "輸入內容，或輸入 / 開啟指令選單…"),
      }),
      CustomImage.configure({
        allowBase64: true,
      }),
      Callout,
    ],
    editorProps: {
      attributes: {
        "data-rich-text-editor": "true",
        class:
          "tiptap w-full max-w-none outline-none px-4 py-3 text-[15px] leading-relaxed text-foreground break-words min-h-[var(--editor-min-height,220px)]",
      },
      handlePaste: (view, event) => {
        if (readOnlyRef.current) {
          event.preventDefault();
          return true;
        }
        const clipboardData = event.clipboardData;
        if (!clipboardData) return false;

        const file =
          Array.from(clipboardData.files).find((item) => item.type.startsWith("image/")) ??
          Array.from(clipboardData.items)
            .find((item) => item.type.startsWith("image/"))
            ?.getAsFile();
        const html = clipboardData.getData("text/html");

        if (!file && !html) return false;

        event.preventDefault();
        const budget = () =>
          getPasteBudgetRef.current?.() ?? Math.max(0, 900_000 - utf8Length(view.dom.innerHTML));

        void (async () => {
          try {
            if (file) {
              const compressed = await prepareClipboardImage(
                file,
                Math.min(maxEmbeddedImageBytes, Math.max(0, budget() - 512)),
              );
              const node = view.state.schema.nodes.image?.create({
                src: compressed.src,
                alt: "貼上的圖片",
                width: "75%",
                align: "center",
              });
              if (node && utf8Length(compressed.src) <= budget()) {
                view.dispatch(view.state.tr.replaceSelectionWith(node));
              } else {
                throw new Error("Exceeds document size");
              }
              return;
            }

            const cleanedHtml = normalizeLegacyHtml(html);
            const template = parseEditorHtml(cleanedHtml);
            const embedded = Array.from(
              template.content.querySelectorAll<HTMLImageElement>("img[src^='data:']"),
            );
            for (const image of embedded) {
              const source = await (await fetch(image.src)).blob();
              const compressed = await prepareClipboardImage(
                source,
                Math.min(maxEmbeddedImageBytes, Math.floor(Math.max(0, budget() - 512) / embedded.length)),
              );
              image.src = compressed.src;
              image.width = compressed.width;
              image.height = compressed.height;
              image.style.height = "auto";
            }

            if (utf8Length(template.innerHTML) > budget()) {
              throw new Error("Clipboard content exceeds available document size");
            }

            const sanitized = template.innerHTML;
            editor?.chain().focus().insertContent(sanitized).run();
          } catch {
            toast({
              title: "無法貼上內容",
              description: "請縮小圖片或減少貼上的內容後再試一次。",
              variant: "destructive",
            });
          }
        })();

        return true;
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      if (readOnlyRef.current) return;
      const html = normalizeEmptyHtml(currentEditor.getHTML());
      latestHtmlRef.current = html;
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        debounceTimer.current = null;
        isInternalChange.current = true;
        onChangeRef.current(html);
      }, 350);
    },
    onFocus: ({ editor: currentEditor }) => {
      if (readOnlyRef.current) return;
      setIsFocused(true);
      setActiveEditor(currentEditor, fieldName ?? null);
      onFocusProp?.();
    },
    onBlur: ({ event }) => {
      const nextTarget = (event as FocusEvent | undefined)?.relatedTarget as Node | null;
      if (
        nextTarget &&
        nextTarget instanceof Element &&
        (containerRef.current?.contains(nextTarget) ||
          nextTarget.closest("[data-editor-format-control]") ||
          nextTarget.closest("[data-editor-floating]"))
      ) {
        return;
      }
      setIsFocused(false);
      flushPendingInputRef.current();
      onBlurProp?.();
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (editor.isEditable !== !readOnly) {
      editor.setEditable(!readOnly);
    }
  }, [editor, readOnly]);

  // Sync external value changes without firing onUpdate loops
  useEffect(() => {
    if (!editor) return;
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    const nextContent = normalizeLegacyHtml(value || "");
    const currentHtml = normalizeEmptyHtml(editor.getHTML());
    if (currentHtml !== normalizeEmptyHtml(nextContent)) {
      editor.commands.setContent(nextContent || "", { emitUpdate: false });
      latestHtmlRef.current = normalizeEmptyHtml(nextContent);
    }
  }, [editor, value]);

  // Track active table cell position for the floating Table Action menu
  useEffect(() => {
    if (!editor) return;

    const updateTableOverlay = () => {
      if (!editor.isEditable || !editor.isActive("table")) {
        if (!tableActionsOpen) setTableMenuPos(null);
        return;
      }
      const sel = window.getSelection();
      const anchor = sel?.anchorNode;
      const el = anchor instanceof HTMLElement ? anchor : anchor?.parentElement;
      const cell = el?.closest<HTMLTableCellElement>("td, th");
      if (!cell || !editor.view.dom.contains(cell)) {
        if (!tableActionsOpen) setTableMenuPos(null);
        return;
      }
      const rect = cell.getBoundingClientRect();
      const topLimit = window.innerWidth >= 768 ? 94 : 52;
      const top = Math.max(topLimit, rect.top - 10);
      setTableMenuPos(
        rect.bottom > topLimit + 6 && top < window.innerHeight - 55
          ? { top, left: Math.max(8, Math.min(window.innerWidth - 34, rect.right - 32)) }
          : null,
      );
    };

    editor.on("selectionUpdate", updateTableOverlay);
    editor.on("transaction", updateTableOverlay);
    window.addEventListener("scroll", updateTableOverlay, true);
    window.addEventListener("resize", updateTableOverlay);

    return () => {
      editor.off("selectionUpdate", updateTableOverlay);
      editor.off("transaction", updateTableOverlay);
      window.removeEventListener("scroll", updateTableOverlay, true);
      window.removeEventListener("resize", updateTableOverlay);
    };
  }, [editor, tableActionsOpen]);

  const handleInsertImageUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editor) return;
    const raw = imageUrlInput.trim();
    if (!raw) return;
    try {
      const resolved = new URL(raw, window.location.href);
      if (!["https:", "http:"].includes(resolved.protocol)) return;
      editor
        .chain()
        .focus()
        .setImage({ src: resolved.href, alt: "", width: "75%", align: "center" } as never)
        .run();
      setImageUrlInput("");
      setIsImageModalOpen(false);
    } catch {
      toast({ title: "網址格式不正確", variant: "destructive" });
    }
  };

  return (
    <div ref={containerRef} className="w-full space-y-2 text-left">
      {label && (
        <div className="flex items-center px-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 dark:text-slate-400">
            {label}
          </label>
        </div>
      )}

      <div
        style={{ "--editor-min-height": minHeight } as React.CSSProperties}
        className={cn(
          "group relative overflow-visible rounded-xl border transition-all duration-200",
          "bg-white/65 dark:bg-white/[0.025]",
          isFocused && !readOnly
            ? "border-orange-500/50 ring-2 ring-orange-500/15 dark:border-orange-400/50"
            : "border-stone-200/80 hover:border-stone-300/90 dark:border-white/10 dark:hover:border-white/20",
        )}
      >
        <EditorContent editor={editor} />

        {!readOnly && !simplified && (
          <>
            <EditorBubbleMenu editor={editor} />
            <SlashCommandMenu
              editor={editor}
              onInsertImage={() => setIsImageModalOpen(true)}
            />
          </>
        )}

        {/* Quick Image URL Modal triggered by Slash Command */}
        <Popover open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
          <PopoverTrigger asChild>
            <span className="sr-only" aria-hidden="true" />
          </PopoverTrigger>
          <PopoverContent
            data-editor-format-control=""
            align="start"
            className="w-72 rounded-xl border border-stone-200/80 bg-white/95 p-3 shadow-xl backdrop-blur-xl dark:border-white/15 dark:bg-[#14191C]/95"
          >
            <form onSubmit={handleInsertImageUrl} className="space-y-2">
              <p className="text-xs font-medium text-foreground">輸入圖片網址</p>
              <Input
                type="url"
                required
                placeholder="https://..."
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                className="h-8 text-xs"
                autoFocus
              />
              <div className="flex justify-end gap-1.5">
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setIsImageModalOpen(false)}>
                  取消
                </Button>
                <Button type="submit" size="sm" className="h-7 text-xs">
                  插入圖片
                </Button>
              </div>
            </form>
          </PopoverContent>
        </Popover>

        {/* Floating Table Operations Menu */}
        {tableMenuPos && !readOnly && editor && (
          <div
            data-editor-floating
            style={{ top: tableMenuPos.top, left: tableMenuPos.left }}
            className="fixed z-50"
          >
            <Popover open={tableActionsOpen} onOpenChange={setTableActionsOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="表格操作"
                  title="表格操作"
                  onMouseDown={(e) => e.preventDefault()}
                  className="h-7 w-7 rounded-lg border-stone-200/90 bg-white/95 shadow-md backdrop-blur-md hover:border-orange-500/40 dark:border-white/15 dark:bg-[#14191C]/95"
                >
                  <Grid className="size-3.5 text-orange-600 dark:text-orange-400" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                data-editor-format-control=""
                align="end"
                className="grid w-44 gap-0.5 rounded-xl border border-stone-200/80 bg-white/95 p-1.5 shadow-xl backdrop-blur-xl dark:border-white/15 dark:bg-[#14191C]/95"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 justify-start text-xs"
                  onClick={() => {
                    editor.chain().focus().addRowBefore().run();
                    setTableActionsOpen(false);
                  }}
                >
                  上方插入列
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 justify-start text-xs"
                  onClick={() => {
                    editor.chain().focus().addRowAfter().run();
                    setTableActionsOpen(false);
                  }}
                >
                  下方插入列
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 justify-start text-xs"
                  onClick={() => {
                    editor.chain().focus().addColumnBefore().run();
                    setTableActionsOpen(false);
                  }}
                >
                  左方插入欄
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 justify-start text-xs"
                  onClick={() => {
                    editor.chain().focus().addColumnAfter().run();
                    setTableActionsOpen(false);
                  }}
                >
                  右方插入欄
                </Button>
                <div className="my-0.5 h-px bg-border" />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 justify-start text-xs"
                  onClick={() => {
                    mergeCellRight(editor);
                    setTableActionsOpen(false);
                  }}
                >
                  合併右側儲存格
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 justify-start text-xs"
                  onClick={() => {
                    editor.chain().focus().splitCell().run();
                    setTableActionsOpen(false);
                  }}
                >
                  分割儲存格
                </Button>
                <div className="my-0.5 h-px bg-border" />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 justify-start text-xs text-rose-600 hover:bg-rose-500/10 hover:text-rose-700"
                  onClick={() => {
                    editor.chain().focus().deleteRow().run();
                    setTableActionsOpen(false);
                  }}
                >
                  刪除目前列
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 justify-start text-xs text-rose-600 hover:bg-rose-500/10 hover:text-rose-700"
                  onClick={() => {
                    editor.chain().focus().deleteColumn().run();
                    setTableActionsOpen(false);
                  }}
                >
                  刪除目前欄
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 justify-start text-xs text-rose-600 hover:bg-rose-500/10 hover:text-rose-700"
                  onClick={() => {
                    editor.chain().focus().deleteTable().run();
                    setTableActionsOpen(false);
                  }}
                >
                  刪除表格
                </Button>
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>
    </div>
  );
}
