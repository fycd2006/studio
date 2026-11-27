"use client";

import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyleKit } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import { TableKit } from "@tiptap/extension-table";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Placeholder } from "@tiptap/extensions";
import {
  ArrowDownToLine,
  ArrowRightToLine,
  Columns2,
  Grid,
  Merge,
  Split,
  Trash2,
  Upload,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { parseEditorHtml } from "@/lib/editor-html";
import { maxEmbeddedImageBytes, prepareClipboardImage, utf8Length } from "@/lib/editor-image";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  minHeight = "140px",
  readOnly = false,
  simplified = false,
  getPasteBudget,
  fieldName,
}: O2RichEditorProps) {
  const { toast } = useToast();
  const { setActiveEditor, registerEditor } = useActiveEditor();
  const fallbackId = useId();
  const registrationKey = fieldName || fallbackId;
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isFocused, setIsFocused] = useState(false);
  const [tableMenuPos, setTableMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [tableActionsOpen, setTableActionsOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);

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

  const insertImageFileWithView = useCallback(
    async (file: File, view: NonNullable<ReturnType<typeof useEditor>>["view"], insertPos?: number) => {
      const budget =
        getPasteBudgetRef.current?.() ?? Math.max(0, 900_000 - utf8Length(view.dom.innerHTML));
      const compressed = await prepareClipboardImage(
        file,
        Math.min(maxEmbeddedImageBytes, Math.max(0, budget - 512)),
      );
      if (utf8Length(compressed.src) > budget) {
        throw new Error("Exceeds document size");
      }
      const node = view.state.schema.nodes.image?.create({
        src: compressed.src,
        alt: file.name || "圖片",
        width: "75%",
        align: "center",
      });
      if (!node) return;
      if (typeof insertPos === "number") {
        view.dispatch(view.state.tr.insert(insertPos, node));
      } else {
        view.dispatch(view.state.tr.replaceSelectionWith(node));
      }
    },
    [],
  );

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
        placeholder: placeholder || (simplified ? "輸入內容…" : "輸入內容，或輸入 / 開啟區塊選單…"),
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
          "tiptap w-full max-w-none outline-none px-3 py-2 text-[15px] leading-relaxed text-foreground break-words min-h-[var(--editor-min-height,140px)]",
      },
      handleDrop: (view, event, _slice, moved) => {
        if (moved || readOnlyRef.current) return false;
        const files = Array.from(event.dataTransfer?.files ?? []).filter((f) =>
          f.type.startsWith("image/"),
        );
        if (!files.length) return false;
        event.preventDefault();
        const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
        void (async () => {
          try {
            for (const file of files) {
              await insertImageFileWithView(file, view, coords?.pos);
            }
          } catch {
            toast({
              title: "無法插入圖片",
              description: "圖片大小超過文件剩餘容量，請壓縮後再試。",
              variant: "destructive",
            });
          }
        })();
        return true;
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
              await insertImageFileWithView(file, view);
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
    registerEditor(registrationKey, editor, () =>
      getPasteBudgetRef.current?.() ?? Math.max(0, 900_000 - utf8Length(editor.view.dom.innerHTML)),
    );
    return () => {
      registerEditor(registrationKey, null);
    };
  }, [editor, registrationKey, registerEditor]);

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

  // Track active table bounds for the portaled Table Floating Toolbar
  useEffect(() => {
    if (!editor) return;

    const updateTableOverlay = () => {
      if (!editor.isEditable || !editor.isActive("table")) {
        if (!tableActionsOpen) {
          setTableMenuPos((prev) => (prev === null ? prev : null));
        }
        return;
      }
      const sel = window.getSelection();
      const anchor = sel?.anchorNode;
      const el = anchor instanceof HTMLElement ? anchor : anchor?.parentElement;
      const cell = el?.closest<HTMLTableCellElement>("td, th");
      const table = cell?.closest<HTMLTableElement>("table");
      if (!cell || !table || !editor.view.dom.contains(cell)) {
        if (!tableActionsOpen) {
          setTableMenuPos((prev) => (prev === null ? prev : null));
        }
        return;
      }
      const rect = table.getBoundingClientRect();
      const topLimit = window.innerWidth >= 768 ? 96 : 54;
      const top = Math.round(Math.max(topLimit, rect.top - 40));
      const left = Math.round(Math.max(12, Math.min(window.innerWidth - 310, rect.left)));
      const visible = rect.bottom > topLimit + 10 && rect.top < window.innerHeight - 60;
      const nextPos = visible ? { top, left } : null;

      setTableMenuPos((prev) => {
        if (!prev && !nextPos) return prev;
        if (prev && nextPos && prev.top === nextPos.top && prev.left === nextPos.left) {
          return prev;
        }
        return nextPos;
      });
    };

    const handleTransaction = ({
      transaction,
    }: {
      transaction: { docChanged: boolean; selectionSet: boolean };
    }) => {
      if (transaction.docChanged || transaction.selectionSet) {
        updateTableOverlay();
      }
    };

    editor.on("selectionUpdate", updateTableOverlay);
    editor.on("transaction", handleTransaction);
    window.addEventListener("scroll", updateTableOverlay, true);
    window.addEventListener("resize", updateTableOverlay);

    return () => {
      editor.off("selectionUpdate", updateTableOverlay);
      editor.off("transaction", handleTransaction);
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

  const handleUploadImageFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !editor) return;
    setIsUploadingImage(true);
    try {
      await insertImageFileWithView(file, editor.view);
      setIsImageModalOpen(false);
    } catch {
      toast({
        title: "無法上傳圖片",
        description: "圖片大小超過文件剩餘容量，請選擇較小的圖片。",
        variant: "destructive",
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  return (
    <div ref={containerRef} className="w-full space-y-1.5 text-left">
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
          "group relative overflow-visible rounded-xl border transition-all duration-150",
          readOnly
            ? "border-transparent bg-transparent"
            : isFocused
              ? "border-orange-500/45 bg-white/95 ring-2 ring-orange-500/12 dark:border-orange-400/45 dark:bg-white/[0.03]"
              : "border-transparent bg-transparent hover:border-stone-200/80 hover:bg-stone-50/45 dark:hover:border-white/10 dark:hover:bg-white/[0.015]",
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

        {/* Centered Image Insert Dialog (Local Upload + URL) */}
        <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
          <DialogContent
            data-editor-format-control=""
            className="max-w-sm rounded-2xl border-stone-200/80 bg-white/95 backdrop-blur-xl dark:border-white/15 dark:bg-[#14191C]/95"
          >
            <DialogHeader>
              <DialogTitle className="text-base">插入圖片</DialogTitle>
              <DialogDescription className="text-xs">
                選擇本機照片自動壓縮插入，或貼上公開圖片網址。
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void handleUploadImageFile(e)}
              />
              <Button
                type="button"
                variant="outline"
                disabled={isUploadingImage}
                onClick={() => fileInputRef.current?.click()}
                className="h-10 w-full gap-2 rounded-xl border-dashed border-orange-500/45 bg-orange-500/5 text-xs font-medium text-orange-700 hover:bg-orange-500/10 dark:text-orange-300"
              >
                <Upload className="size-4" aria-hidden="true" />
                {isUploadingImage ? "正在壓縮處理圖片…" : "從裝置選擇圖片上傳"}
              </Button>

              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                或貼上網址
                <span className="h-px flex-1 bg-border" />
              </div>

              <form onSubmit={handleInsertImageUrl} className="flex gap-2">
                <Input
                  type="url"
                  required
                  placeholder="https://example.com/image.jpg"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  className="h-9 text-xs"
                />
                <Button type="submit" size="sm" className="h-9 shrink-0 px-3 text-xs">
                  插入
                </Button>
              </form>
            </div>
          </DialogContent>
        </Dialog>

        {/* Portaled Floating Table Toolbar */}
        {tableMenuPos &&
          !readOnly &&
          editor &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              data-editor-floating
              data-editor-format-control=""
              style={{ top: tableMenuPos.top, left: tableMenuPos.left }}
              onMouseDown={(e) => e.preventDefault()}
              className="fixed z-[110] flex items-center gap-0.5 rounded-xl border border-stone-200/90 bg-white/95 p-1 text-foreground shadow-lg backdrop-blur-xl dark:border-white/15 dark:bg-[#14191C]/95"
            >
              <Button
                type="button"
                variant="ghost"
                size="sm"
                title="下方插入列"
                onClick={() => editor.chain().focus().addRowAfter().run()}
                className="h-7 gap-1 rounded-lg px-2 text-[11px]"
              >
                <ArrowDownToLine className="size-3.5 text-orange-500" />
                <span>+列</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                title="右方插入欄"
                onClick={() => editor.chain().focus().addColumnAfter().run()}
                className="h-7 gap-1 rounded-lg px-2 text-[11px]"
              >
                <ArrowRightToLine className="size-3.5 text-orange-500" />
                <span>+欄</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title="合併右側儲存格"
                onClick={() => mergeCellRight(editor)}
                className="h-7 w-7 rounded-lg"
              >
                <Merge className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title="分割儲存格"
                onClick={() => editor.chain().focus().splitCell().run()}
                className="h-7 w-7 rounded-lg"
              >
                <Split className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title="刪除表格"
                onClick={() => editor.chain().focus().deleteTable().run()}
                className="h-7 w-7 rounded-lg text-rose-600 hover:bg-rose-500/10 hover:text-rose-700"
              >
                <Trash2 className="size-3.5" />
              </Button>

              <div className="mx-0.5 h-4 w-px bg-border" />

              <Popover open={tableActionsOpen} onOpenChange={setTableActionsOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="表格操作"
                    title="更多表格操作"
                    className="h-7 gap-1 rounded-lg px-2 text-[11px] font-medium"
                  >
                    <Grid className="size-3.5 text-orange-600 dark:text-orange-400" />
                    <Columns2 className="size-3 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  data-editor-format-control=""
                  align="start"
                  className="z-[125] grid w-44 gap-0.5 rounded-xl border border-stone-200/80 bg-white/95 p-1.5 shadow-xl backdrop-blur-xl dark:border-white/15 dark:bg-[#14191C]/95"
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
            </div>,
            document.body,
          )}
      </div>
    </div>
  );
}
