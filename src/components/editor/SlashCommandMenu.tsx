"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/react";
import {
  AlertCircle,
  CheckSquare,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  List,
  ListOrdered,
  Minus,
  Quote,
  Table as TableIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SlashCommandItem {
  id: string;
  label: string;
  description: string;
  keywords: string[];
  icon: React.ElementType;
  run: (editor: Editor, range: { from: number; to: number }, onInsertImage?: () => void) => void;
}

const SLASH_ITEMS: SlashCommandItem[] = [
  {
    id: "h1",
    label: "大標題 H1",
    description: "主要章節標題",
    keywords: ["h1", "heading", "title", "標題", "大標題"],
    icon: Heading1,
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run();
    },
  },
  {
    id: "h2",
    label: "次標題 H2",
    description: "段落子標題",
    keywords: ["h2", "heading", "subtitle", "標題", "次標題"],
    icon: Heading2,
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
    },
  },
  {
    id: "h3",
    label: "小標題 H3",
    description: "細項分類標題",
    keywords: ["h3", "heading", "標題", "小標題"],
    icon: Heading3,
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run();
    },
  },
  {
    id: "bullet",
    label: "項目符號清單",
    description: "一般條列重點",
    keywords: ["ul", "bullet", "list", "清單", "項目"],
    icon: List,
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    id: "ordered",
    label: "編號清單",
    description: "依序步驟 1, 2, 3",
    keywords: ["ol", "ordered", "number", "編號", "步驟"],
    icon: ListOrdered,
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    id: "task",
    label: "核取清單",
    description: "可勾選檢核項目",
    keywords: ["todo", "task", "check", "checklist", "待辦", "核取", "勾選"],
    icon: CheckSquare,
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    id: "callout",
    label: "重點提醒框",
    description: "突顯注意事項或關主提示",
    keywords: ["callout", "tip", "note", "alert", "提醒", "注意", "重點"],
    icon: AlertCircle,
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleCallout({ tone: "tip" }).run();
    },
  },
  {
    id: "quote",
    label: "引言區塊",
    description: "台詞、規則說明或引用",
    keywords: ["quote", "blockquote", "引言", "台詞"],
    icon: Quote,
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    id: "table",
    label: "表格 3 × 3",
    description: "流程時間分配或角色對照",
    keywords: ["table", "grid", "表格"],
    icon: TableIcon,
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: false }).run();
    },
  },
  {
    id: "divider",
    label: "分隔線",
    description: "區隔不同階段或橋段",
    keywords: ["hr", "divider", "line", "分隔線"],
    icon: Minus,
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
  {
    id: "image",
    label: "插入圖片",
    description: "從裝置上傳圖片或貼上網址",
    keywords: ["img", "image", "photo", "圖片", "照片"],
    icon: ImageIcon,
    run: (editor, range, onInsertImage) => {
      editor.chain().focus().deleteRange(range).run();
      onInsertImage?.();
    },
  },
];

function extractSlashTrigger(textBefore: string): { query: string; triggerLen: number } | null {
  const idx = Math.max(textBefore.lastIndexOf("/"), textBefore.lastIndexOf("\uff0f"));
  if (idx === -1) return null;

  const query = textBefore.slice(idx + 1);
  if (/\s/.test(query)) return null;

  if (idx > 0) {
    const prev = textBefore[idx - 1];
    const isWhitespace = /\s/.test(prev);
    const isCjkOrPunct = /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(prev);
    if (!isWhitespace && !isCjkOrPunct) return null;
  }

  return { query, triggerLen: textBefore.length - idx };
}

interface SlashState {
  query: string;
  range: { from: number; to: number };
  top: number;
  left: number;
}

export function SlashCommandMenu({
  editor,
  onInsertImage,
}: {
  editor: Editor | null;
  onInsertImage?: () => void;
}) {
  const [slash, setSlash] = useState<SlashState | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredItems = useMemo(() => {
    if (!slash) return [];
    const q = slash.query.trim().toLowerCase();
    if (!q) return SLASH_ITEMS;
    return SLASH_ITEMS.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.keywords.some((kw) => kw.toLowerCase().includes(q)),
    );
  }, [slash]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [slash?.query]);

  useEffect(() => {
    if (!editor) return;

    const evaluate = () => {
      const domFocused =
        typeof document !== "undefined" &&
        document.activeElement &&
        editor.view.dom.contains(document.activeElement);
      if (!editor.isEditable || (!editor.isFocused && !editor.view.hasFocus() && !domFocused)) {
        setSlash(null);
        return;
      }

      const { selection } = editor.state;
      if (!selection.empty) {
        setSlash(null);
        return;
      }

      const { $from } = selection;
      if ($from.parent.type.name === "codeBlock") {
        setSlash(null);
        return;
      }

      const textBefore = $from.parent.textBetween(0, $from.parentOffset, "\ufffc", "\ufffc");
      const parsed = extractSlashTrigger(textBefore);
      if (!parsed) {
        setSlash(null);
        return;
      }

      const from = $from.pos - parsed.triggerLen;
      const to = $from.pos;

      try {
        const coords = editor.view.coordsAtPos($from.pos);
        const menuHeight = 300;
        const left = Math.round(Math.max(12, Math.min(window.innerWidth - 276, coords.left)));
        const spaceBelow = window.innerHeight - coords.bottom;
        const top = Math.round(
          spaceBelow > menuHeight
            ? coords.bottom + 8
            : Math.max(12, coords.top - menuHeight - 8),
        );
        setSlash((prev) => {
          if (
            prev &&
            prev.query === parsed.query &&
            prev.range.from === from &&
            prev.range.to === to &&
            prev.top === top &&
            prev.left === left
          ) {
            return prev;
          }
          return { query: parsed.query, range: { from, to }, top, left };
        });
      } catch {
        setSlash(null);
      }
    };

    const onBlur = ({ event }: { event: FocusEvent }) => {
      const next = event?.relatedTarget as Node | null;
      if (next instanceof Element && next.closest("[data-editor-floating]")) return;
      window.setTimeout(() => {
        const active = document.activeElement;
        if (active instanceof Element && active.closest("[data-editor-floating]")) return;
        setSlash(null);
      }, 120);
    };

    editor.on("update", evaluate);
    editor.on("selectionUpdate", evaluate);
    editor.on("focus", evaluate);
    editor.on("blur", onBlur);
    window.addEventListener("scroll", evaluate, true);
    window.addEventListener("resize", evaluate);

    return () => {
      editor.off("update", evaluate);
      editor.off("selectionUpdate", evaluate);
      editor.off("focus", evaluate);
      editor.off("blur", onBlur);
      window.removeEventListener("scroll", evaluate, true);
      window.removeEventListener("resize", evaluate);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor || !slash) return;
    const dom = editor.view.dom;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!filteredItems.length) {
        if (event.key === "Escape") setSlash(null);
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        event.stopPropagation();
        setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        event.stopPropagation();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
      } else if (event.key === "Enter" && !event.isComposing) {
        event.preventDefault();
        event.stopPropagation();
        const item = filteredItems[selectedIndex] ?? filteredItems[0];
        if (item) {
          item.run(editor, slash.range, onInsertImage);
          setSlash(null);
        }
      } else if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setSlash(null);
      }
    };

    dom.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => {
      dom.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [editor, slash, filteredItems, selectedIndex, onInsertImage]);

  if (!editor || !slash || filteredItems.length === 0 || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      data-editor-floating
      data-editor-format-control=""
      role="listbox"
      aria-label="插入區塊指令"
      style={{ top: slash.top, left: slash.left }}
      onMouseDown={(e) => e.preventDefault()}
      className="fixed z-[120] max-h-72 w-64 overflow-y-auto rounded-xl border border-stone-200/80 bg-white/95 p-1.5 shadow-xl backdrop-blur-xl dark:border-white/15 dark:bg-[#14191C]/95"
    >
      <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
        插入區塊
      </div>
      <div className="space-y-0.5">
        {filteredItems.map((item, idx) => {
          const Icon = item.icon;
          const active = idx === selectedIndex;
          return (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={active}
              onMouseEnter={() => setSelectedIndex(idx)}
              onClick={() => {
                item.run(editor, slash.range, onInsertImage);
                setSlash(null);
              }}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors",
                active
                  ? "bg-orange-500/12 text-orange-700 dark:text-orange-300"
                  : "text-foreground hover:bg-stone-100 dark:hover:bg-white/5",
              )}
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-md border",
                  active
                    ? "border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400"
                    : "border-stone-200/80 bg-stone-50 text-muted-foreground dark:border-white/10 dark:bg-white/5",
                )}
              >
                <Icon className="size-3.5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{item.label}</p>
                <p className="truncate text-[11px] text-muted-foreground">{item.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>,
    document.body,
  );
}
