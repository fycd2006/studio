"use client"

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  Trash2,
  Eraser,
  RotateCcw,
  Type as FontIcon,
  ALargeSmall,
  CaseSensitive,
  Table as TableIcon,
  Plus,
  Link as LinkIcon,
  Image as ImageIcon,
  Heading1,
  Heading2,
  Heading3,
  ChevronDown,
  Sparkles,
  ExternalLink,
  Grid,
  Undo2,
  Redo2,
  MoreHorizontal
} from "lucide-react";
import { createPortal } from "react-dom";
import { useToast } from "@/hooks/use-toast";
import { parseEditorHtml } from "@/lib/editor-html";
import { maxEmbeddedImageBytes, prepareClipboardImage, utf8Length } from "@/lib/editor-image";
import {
  createEditorTableHtml, deleteEditorColumn, deleteEditorRow, insertEditorColumn, insertEditorRow,
  mergeEditorCellRight, setTableColumnSizes, splitEditorCell, tableColumnSizes, tableGrid,
} from "@/lib/editor-table";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

const objectTools = "fixed z-50 flex items-center gap-0.5 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md";
const objectButton = "h-7 w-7 rounded-md";
const selectedObjectButton = "bg-orange-100 text-orange-800 dark:bg-orange-400/20 dark:text-orange-200";

const isEmpty = (html: string) => !/<(img|table|iframe|video)\b/i.test(html) &&
  !html.replace(/<[^>]*>|&nbsp;|\s/g, "").length;

const editableHtml = (editor: HTMLDivElement) => editor.innerHTML.replace(/\u200b/g, "");

function selectCell(cell: HTMLTableCellElement, end = false) {
  const range = document.createRange();
  range.selectNodeContents(cell);
  range.collapse(!end);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function imageToolsPosition(target: DOMRect, menu: HTMLElement | null) {
  const height = menu?.offsetHeight || 38;
  const width = menu?.offsetWidth || 156;
  const topLimit = window.innerWidth >= 768 ? 96 : 56;
  const bottomLimit = window.innerHeight - (window.innerWidth >= 768 ? 16 : 62);
  if (target.bottom < topLimit || target.top > bottomLimit) return null;

  const below = target.bottom + 6;
  const above = target.top - height - 6;
  const left = Math.min(window.innerWidth - width - 8, Math.max(8, target.left));
  if (below + height <= bottomLimit) return { top: below, left };
  if (above >= topLimit) return { top: above, left };
  if (target.right + width + 14 < window.innerWidth) {
    return { top: Math.max(topLimit, target.top), left: target.right + 6 };
  }
  return { top: bottomLimit - height, left };
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
}

export function O2RichEditor({
  label,
  value,
  onChange,
  onFocus: onFocusProp,
  onBlur: onBlurProp,
  placeholder,
  minHeight = '300px',
  readOnly = false,
  simplified = false,
  hideToolbar = true,
  getPasteBudget
}: O2RichEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const imageMenuRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const isInternalChange = useRef(false);
  const savedRangeRef = useRef<Range | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
  const [imageMenuPos, setImageMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [activeCell, setActiveCell] = useState<HTMLTableCellElement | null>(null);
  const [columnHandle, setColumnHandle] = useState<{ top: number; left: number; height: number } | null>(null);
  const [activeTable, setActiveTable] = useState<HTMLTableElement | null>(null);
  const [tableMenuPos, setTableMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [tableActionsOpen, setTableActionsOpen] = useState(false);
  const [imageOptionsOpen, setImageOptionsOpen] = useState(false);

  // Link dialog state
  const [isLinkOpen, setIsLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");

  // Image dialog state
  const [isImageOpen, setIsImageOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");

  // States for Image Resizing (#11) and Auto-save indicator (#13)
  const [imageRect, setImageRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Active formatting state for toolbar button highlighting (#10)
  const [activeFormats, setActiveFormats] = useState<Record<string, boolean>>({});

  const textColorInputRef = useRef<HTMLInputElement>(null);
  const highlightColorInputRef = useRef<HTMLInputElement>(null);

  const handleCustomTextColor = (e: React.ChangeEvent<HTMLInputElement>) => {
    execCommand("foreColor", e.target.value);
  };

  const handleCustomHighlightColor = (e: React.ChangeEvent<HTMLInputElement>) => {
    execCommand("hiliteColor", e.target.value);
  };

  const applyCustomFontSize = (sizePx: number) => {
    // Restore saved selection into the editor
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const selection = window.getSelection();
    if (selection && savedRangeRef.current) {
      selection.removeAllRanges();
      selection.addRange(savedRangeRef.current);
    }
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

    // Use fontSize 7 as a marker, then replace with custom px
    document.execCommand("fontSize", false, "7");
    const fontElements = editor.querySelectorAll('font[size="7"]');
    fontElements.forEach((font) => {
      if (font instanceof HTMLElement) {
        font.removeAttribute("size");
        font.style.fontSize = `${sizePx}px`;
        font.style.lineHeight = "1.45";
      }
    });
    handleInput();
  };

  const [isEditorEmpty, setIsEditorEmpty] = useState(() => isEmpty(value || ""));

  // Update active formatting state from current selection
  const updateActiveFormats = useCallback(() => {
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
  }, []);

  // Sync editor content with external value (skip if change was from internal editing)
  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || "<div><br></div>";
    }
    setIsEditorEmpty(isEmpty(value || ""));
  }, [value]);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * 使用者最後打出來的內容。
   *
   * 為什麼要多一個 ref：卸載時 React **會先把 editorRef 設回 null**，才執行
   * effect 的清理函式（實測 2026-10-15：清理函式裡看到 `timer=true el=false`）。
   * 只靠 editorRef.current 補送的話，條件永遠不成立 —— 補送的程式碼看起來有寫，
   * 實際上一次都沒跑過，而使用者的字就這樣沒了。
   */
  const latestHtmlRef = useRef<string | null>(null);

  const handleInput = useCallback(() => {
    if (readOnly) return;
    // 同步記下來（不是等 debounce）—— 卸載補送就是靠這一行
    if (editorRef.current) {
      latestHtmlRef.current = editableHtml(editorRef.current);
      setIsEditorEmpty(isEmpty(latestHtmlRef.current));
    }
    setIsSaving(true);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      // 送出去了就不再算「還在等著送」。
      //
      // ⚠️ 少了這一行，debounceTimer.current 在第一次打字之後就**永遠是真值** ——
      //    下面的 flushPendingInput 於是會在「每一次卸載」都把 latestHtmlRef 再送
      //    一遍。平常看起來沒事（寫回同樣的值），但只要這期間有別人寫過這個欄位，
      //    這個補送就會把舊草稿蓋回去。實測 2026-10-16：按「還原版本」之後資料庫
      //    先變成舊版內容，350ms 後又被改回還原前的草稿 —— 還原等於被悄悄抹掉。
      //    （進入歷史模式會卸載這個編輯器，補送就是在那一刻發生的。）
      debounceTimer.current = null;
      if (editorRef.current) {
        isInternalChange.current = true;
        onChange(editableHtml(editorRef.current));
        setIsSaving(false);
      }
    }, 350);
  }, [onChange, readOnly]);

  /**
   * 卸載 / 關頁前把「還在 debounce 等著送」的內容補送出去。
   *
   * 原本這裡只是 clearTimeout —— 等於**把使用者剛打的字丟掉**：
   * handleInput 要等 350ms 才呼叫 onChange，而卸載時把那個 timer 清掉之後，
   * 父層 PlanEditor 的卸載 flush 根本沒收到這段文字（它的 pendingUpdates 是空的），
   * 於是 Firestore 裡那個欄位還是舊值，畫面上卻一直寫著「已儲存至雲端」。
   *
   * 實測（2026-10-15，cypress 探測）：在目標欄位打字後立刻離開編輯器，
   * 2.5 秒後讀資料庫 → purpose 仍是 ""。使用者會以為存好了。
   * 對應測試：cypress/e2e/feature_test/editor/field-persistence.cy.ts
   *           「打完字立刻按返回，內容不該掉」
   *
   * ⚠️ 這個 effect 的清理函式必須是「補送」而不是「丟掉」。改回 clearTimeout
   *    就會把上面那個 bug 放回去。
   */
  const flushPendingInput = useCallback(() => {
    if (!debounceTimer.current) return;
    clearTimeout(debounceTimer.current);
    debounceTimer.current = null;
    // editorRef 在卸載時已經是 null，所以這裡要能退回 latestHtmlRef
    const html = editorRef.current ? editableHtml(editorRef.current) : latestHtmlRef.current;
    if (html === null) return;
    isInternalChange.current = true;
    onChange(html);
    setIsSaving(false);
  }, [onChange]);

  // 用 ref 轉一手，讓下面那個 effect 的依賴可以是 []。
  // ⚠️ 不要把 flushPendingInput 直接當依賴：onChange 是父層每次 render 都重建的
  //    行內箭頭函式（PlanEditor 的 `onChange={(val) => handlePlanUpdate({...})}`），
  //    所以 flushPendingInput 的 identity 每次 render 都變 → effect 每次 render
  //    都重跑 → 它的清理函式也每次都跑 → debounce 等於**每次 render 都被提前結算**。
  //    這個專案的其他地方（PlanEditor 的 onUpdateRef / autoSaveRef）也是這樣處理的。
  const flushPendingInputRef = useRef(flushPendingInput);
  useEffect(() => {
    flushPendingInputRef.current = flushPendingInput;
  }, [flushPendingInput]);

  useEffect(() => {
    // 關整個分頁走的是 beforeunload（卸載清理函式不保證會跑），
    // 用 router 換頁走的是下面的清理函式 —— 兩條路都要補送。
    const handleBeforeUnload = () => flushPendingInputRef.current();
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      flushPendingInputRef.current();
    };
  }, []);

  // Listen to native input events (crucial for detached toolbars that dispatch native events)
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    el.addEventListener('input', handleInput);
    return () => el.removeEventListener('input', handleInput);
  }, [handleInput]);

  const getSelectedTableCell = () => {
    const anchor = window.getSelection()?.anchorNode;
    const editor = editorRef.current;
    if (!editor || !anchor || !editor.contains(anchor)) return null;
    const element = anchor instanceof HTMLElement ? anchor : anchor.parentElement;
    const cell = element?.closest<HTMLTableCellElement>("td,th");
    return cell && editor.contains(cell) ? cell : null;
  };

  const updateMenuPosition = useCallback(() => {
    if (selectedImage?.isConnected) {
      const rect = selectedImage.getBoundingClientRect();
      setImageMenuPos(imageToolsPosition(rect, imageMenuRef.current));
      setImageRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    } else {
      setImageMenuPos(null);
      setImageRect(null);
    }
    if (activeTable?.isConnected && activeCell?.isConnected) {
      const rect = activeCell.getBoundingClientRect();
      const topLimit = window.innerWidth >= 768 ? 94 : 52;
      const top = Math.max(topLimit, rect.top - 10);
      setTableMenuPos(rect.bottom > topLimit + 6 && top < window.innerHeight - 55
        ? { top, left: Math.max(8, Math.min(window.innerWidth - 34, rect.right - 32)) } : null);
      const { cells, width } = tableGrid(activeTable);
      const position = cells.find(({ cell }) => cell === activeCell);
      setColumnHandle(position && position.column + position.columns < width
        ? { top: rect.top, left: rect.right, height: rect.height } : null);
    } else {
      setTableMenuPos(null);
      setColumnHandle(null);
    }
  }, [selectedImage, activeTable, activeCell]);

  // Handle document click/selection change to detect active elements
  // Scoped: only react when selection is inside this editor instance (#8 multi-instance perf)
  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const anchor = sel.anchorNode;
      if (!editorRef.current || !anchor || !editorRef.current.contains(anchor)) {
        if (tableActionsOpen || imageOptionsOpen) return;
        setActiveTable(null);
        setActiveCell(null);
        return;
      }
      const cell = getSelectedTableCell();
      setActiveTable(cell?.closest("table") ?? null);
      setActiveCell(cell);
      if (!hideToolbar) updateActiveFormats();
      // Save the current selection range so toolbar actions can restore it
      if (sel.rangeCount > 0) {
        savedRangeRef.current = sel.getRangeAt(0).cloneRange();
      }
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [updateActiveFormats, hideToolbar, tableActionsOpen, imageOptionsOpen]);

  useEffect(() => {
    if (!selectedImage && !activeTable) return;

    const update = () => updateMenuPosition();
    const clearOutside = (event: PointerEvent) => {
      if (event.target instanceof Element && (editorRef.current?.contains(event.target) ||
        event.target.closest("[data-editor-floating]"))) return;
      setSelectedImage(null);
      setActiveTable(null);
      setActiveCell(null);
      setTableActionsOpen(false);
      setImageOptionsOpen(false);
    };
    update();
    document.addEventListener("pointerdown", clearOutside);
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        update();
      });
      if (selectedImage) {
        observer.observe(selectedImage);
      }
      if (activeTable) {
        observer.observe(activeTable);
      }
      if (editorRef.current) {
        observer.observe(editorRef.current);
      }
    }

    return () => {
      document.removeEventListener('pointerdown', clearOutside);
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
      if (observer) {
        observer.disconnect();
      }
    };
  }, [selectedImage, activeTable, updateMenuPosition]);

  const dragHorizontally = (event: React.PointerEvent<HTMLElement>, apply: (delta: number) => void) => {
    event.preventDefault();
    event.stopPropagation();
    const handle = event.currentTarget;
    const start = event.clientX;
    handle.setPointerCapture(event.pointerId);
    const move = (next: PointerEvent) => {
      apply(next.clientX - start);
      updateMenuPosition();
    };
    const end = () => {
      handle.removeEventListener("pointermove", move);
      handleInput();
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("lostpointercapture", end, { once: true });
  };

  const startImageResize = (event: React.PointerEvent<HTMLElement>, direction: number) => {
    const editor = editorRef.current;
    if (!selectedImage || !editor) return;
    const base = selectedImage.offsetWidth;
    const scale = editor.getBoundingClientRect().width / editor.offsetWidth || 1;
    const style = getComputedStyle(editor);
    const max = editor.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    dragHorizontally(event, (delta) => {
      selectedImage.style.maxWidth = "100%";
      selectedImage.style.width = Math.min(max, Math.max(32, base + direction * delta / scale)) + "px";
      selectedImage.style.height = "auto";
      selectedImage.style.aspectRatio = "";
    });
  };

  const startColumnResize = (event: React.PointerEvent<HTMLElement>) => {
    if (!activeTable || !activeCell) return;
    const { cells } = tableGrid(activeTable);
    const selected = cells.find(({ cell }) => cell === activeCell);
    if (!selected) return;
    const column = selected.column + selected.columns - 1;
    const widths = tableColumnSizes(activeTable);
    const neighbor = widths[column + 1];
    if (!neighbor) return;
    const scale = activeTable.getBoundingClientRect().width / activeTable.offsetWidth || 1;
    const minimum = Math.min(40, widths[column], neighbor);
    dragHorizontally(event, (delta) => {
      const shift = Math.max(minimum - widths[column], Math.min(neighbor - minimum, delta / scale));
      const next = [...widths];
      next[column] += shift;
      next[column + 1] -= shift;
      setTableColumnSizes(activeTable, next);
    });
  };

  const handleEditorClick = (e: React.MouseEvent) => {
    if (readOnly) {
      setSelectedImage(null);
      return;
    }
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG') {
      const img = target as HTMLImageElement;
      setSelectedImage(img);
      setActiveTable(null);
      setActiveCell(null);
    } else {
      setSelectedImage(null);
    }
  };

  const execCommand = (command: string, value?: string) => {
    const editor = editorRef.current;
    if (readOnly || !editor) return;
    const selection = window.getSelection();
    if (!selection?.anchorNode || !editor.contains(selection.anchorNode)) {
      const saved = savedRangeRef.current;
      if (!saved || !editor.contains(saved.commonAncestorContainer) || !selection) return;
      editor.focus({ preventScroll: true });
      selection.removeAllRanges();
      selection.addRange(saved);
    }
    document.execCommand(command, false, value);
    handleInput();
    if (!hideToolbar) updateActiveFormats();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (readOnly || event.nativeEvent.isComposing) return;
    if (event.key === "Escape") {
      setSelectedImage(null);
      setTableActionsOpen(false);
      setImageOptionsOpen(false);
      return;
    }
    if (selectedImage && ["Delete", "Backspace"].includes(event.key)) {
      event.preventDefault();
      selectedImage.remove();
      setSelectedImage(null);
      handleInput();
      return;
    }
    if (event.key === "Tab" && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const cell = getSelectedTableCell();
      const table = cell?.closest("table");
      if (!cell || !table) return;
      const { cells } = tableGrid(table);
      const index = cells.findIndex((position) => position.cell === cell);
      let target: HTMLTableCellElement | null | undefined = cells[index + (event.shiftKey ? -1 : 1)]?.cell;
      if (!target && !event.shiftKey) {
        target = insertEditorRow(table, cell, true);
        handleInput();
      }
      if (target) {
        event.preventDefault();
        selectCell(target, event.shiftKey);
      }
      return;
    }
    if (!event.ctrlKey && !event.metaKey) return;
    const commands: Record<string, string> = { b: "bold", i: "italic", u: "underline", y: "redo", z: event.shiftKey ? "redo" : "undo" };
    const command = commands[event.key.toLowerCase()];
    if (command) {
      event.preventDefault();
      execCommand(command);
    }
  };

  // Heading functions
  const setHeading = (tag: string) => {
    execCommand("formatBlock", `<${tag}>`);
  };

  // Link insertions
  const insertLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkUrl) return;
    setIsLinkOpen(false);

    // If text is provided, insert a structured hyperlink
    if (linkText) {
      const linkHtml = `<a href="${linkUrl}" target="_blank" class="text-orange-600 dark:text-amber-400 underline hover:opacity-80 transition-opacity" rel="noopener noreferrer">${linkText}</a>`;
      execCommand("insertHTML", linkHtml);
    } else {
      execCommand("createLink", linkUrl);
    }
    setLinkUrl("");
    setLinkText("");
  };

  // Image URL insertion
  const insertImageUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl) return;
    setIsImageOpen(false);
    const imgHtml = `<img src="${imageUrl}" loading="lazy" style="width: 100%; max-width: 500px; height: auto; display: block; margin: 12px auto; border-radius: 8px; cursor: pointer; transition: all 0.3s; vertical-align: top;" />`;
    execCommand("insertHTML", imgHtml);
    setImageUrl("");
  };

  // Image manipulation functions
  const deleteImage = useCallback(() => {
    if (selectedImage) {
      selectedImage.remove();
      setSelectedImage(null);
      handleInput();
    }
  }, [selectedImage, handleInput]);

  const toggleImageStyle = (styleName: string, value: string) => {
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
      selectedImage.style.maxWidth = ''; // Reset to default constrain for percentage presets
      handleInput();
      setTimeout(updateMenuPosition, 50);
    }
  };

  const clearImageFormat = useCallback(() => {
    if (selectedImage) {
      selectedImage.style.borderRadius = '';
      selectedImage.style.boxShadow = '';
      selectedImage.style.aspectRatio = '';
      selectedImage.style.objectFit = '';
      selectedImage.style.width = '100%';
      selectedImage.style.height = 'auto';
      selectedImage.style.maxWidth = ''; // Reset to default constrain
      selectedImage.style.display = 'block';
      selectedImage.style.margin = '12px auto';
      selectedImage.style.verticalAlign = 'top';
      handleInput();
      setTimeout(updateMenuPosition, 50);
    }
  }, [selectedImage, handleInput, updateMenuPosition]);

  // Keyboard events for deleting selected images
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

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    if (readOnly) {
      event.preventDefault();
      return;
    }
    const file = Array.from(event.clipboardData.files).find((item) => item.type.startsWith("image/"))
      ?? Array.from(event.clipboardData.items).find((item) => item.type.startsWith("image/"))?.getAsFile();
    const html = event.clipboardData.getData("text/html");
    if (!file && !html) return;
    event.preventDefault();

    const editor = event.currentTarget;
    const selection = window.getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
    if (!range || !editor.contains(range.commonAncestorContainer)) return;
    const budget = () => getPasteBudget?.() ?? Math.max(0, 900_000 - utf8Length(editor.innerHTML));

    const paste = async () => {
      try {
        const template = parseEditorHtml(file ? "" : html);
        if (file) {
          const image = document.createElement("img");
          image.alt = "貼上的圖片";
          image.style.cssText = "width:75%; max-width:100%; height:auto; display:block; margin:12px auto;";
          template.content.append(image);
        }
        const embedded = [...template.content.querySelectorAll<HTMLImageElement>(file ? "img" : "img[src^='data:']")];
        for (const image of embedded) {
          const source = file ?? await (await fetch(image.src)).blob();
          const compressed = await prepareClipboardImage(source,
            Math.min(maxEmbeddedImageBytes, Math.floor((budget() - 512) / embedded.length)));
          image.src = compressed.src;
          image.width = compressed.width;
          image.height = compressed.height;
          image.style.height = "auto";
        }
        if (!editor.isConnected || !editor.isContentEditable || !editor.contains(range.commonAncestorContainer)) return;
        if (utf8Length(template.innerHTML) > budget()) throw new Error("Clipboard content exceeds the available document size");
        if (document.activeElement === editor && selection) {
          selection.removeAllRanges();
          selection.addRange(range);
          document.execCommand("insertHTML", false, template.innerHTML);
        } else {
          range.deleteContents();
          range.insertNode(template.content);
        }
        handleInput();
      } catch {
        toast({ title: "無法貼上內容", description: "請縮小圖片或減少貼上的內容後再試一次。", variant: "destructive" });
      }
    };
    void paste();
  };

  const mutateTable = (mutate: (table: HTMLTableElement, cell: HTMLTableCellElement) => void) => {
    const cell = getSelectedTableCell() ?? activeCell;
    const table = cell?.closest("table");
    if (!cell || !table || !editorRef.current?.isContentEditable) return;
    mutate(table, cell);
    if (!table.querySelector("td,th")) table.remove();
    const next = table.isConnected ? (cell.isConnected ? cell : table.rows[0]?.cells[0]) : null;
    if (next) {
      editorRef.current?.focus({ preventScroll: true });
      selectCell(next);
      setActiveCell(next);
      updateMenuPosition();
    } else {
      setActiveTable(null);
      setActiveCell(null);
    }
    handleInput();
  };

  const alignImage = (alignment: "left" | "center" | "right") => {
    if (!selectedImage) return;
    selectedImage.style.display = "block";
    selectedImage.style.marginLeft = alignment === "left" ? "0px" : "auto";
    selectedImage.style.marginRight = alignment === "right" ? "0px" : "auto";
    handleInput();
    updateMenuPosition();
  };

  const handleClearFormat = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

    // Step 1: Use browser removeFormat for bold/italic/underline/strike
    document.execCommand("removeFormat", false, undefined);

    // Step 2: Walk the selected range and strip inline styles, font attributes, etc.
    try {
      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;
      const rootEl = container.nodeType === Node.ELEMENT_NODE
        ? (container as HTMLElement)
        : container.parentElement;
      if (!rootEl) return;

      // Collect all elements within selection range
      const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_ELEMENT, null);
      const elementsToClean: HTMLElement[] = [];
      let node = walker.nextNode();
      while (node) {
        if (node instanceof HTMLElement && range.intersectsNode(node)) {
          elementsToClean.push(node);
        }
        node = walker.nextNode();
      }

      // Clean each element
      elementsToClean.forEach((el) => {
        el.removeAttribute("style");
        el.removeAttribute("color");
        el.removeAttribute("size");
        el.removeAttribute("face");
        el.removeAttribute("class");

        // Unwrap <font> and pure-wrapper <span> tags into plain text
        const tag = el.tagName.toLowerCase();
        if (tag === "font" || (tag === "span" && el.attributes.length === 0)) {
          const parent = el.parentNode;
          while (el.firstChild) {
            parent?.insertBefore(el.firstChild, el);
          }
          el.remove();
        }
      });

      // Step 3: Reset block-level to <p> if it's a heading within selection
      document.execCommand("formatBlock", false, "<p>");
    } catch (err) {
      console.error("Clear format error: ", err);
    }
    handleInput();
  };

  return (
    <div className="space-y-2 w-full text-left">
      {label && (
        <div className="flex items-center px-1">
          <label className="text-[10px] font-bold text-stone-500 dark:text-slate-400 uppercase tracking-widest">
            {label}
          </label>
        </div>
      )}

      {/* Editor Main Container */}
      <div 
        tabIndex={-1}
        onFocus={() => { if (!readOnly) { setIsFocused(true); onFocusProp?.(); } }}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) {
            setIsFocused(false);
            onBlurProp?.();
          }
        }}
        className={cn(
          "rounded-lg bg-white/50 dark:bg-slate-800/50 border border-stone-200 dark:border-slate-700/50 shadow-sm transition-all duration-300 relative group overflow-visible",
          isFocused ? "ring-2 ring-orange-500/20 border-orange-500/40 dark:border-amber-400/40" : "hover:border-stone-300 dark:hover:border-slate-600"
        )}
      >

        {/* Toolbar - Always visible when not readOnly (#7) */}
        {!readOnly && !hideToolbar && (
          <div
            onMouseDown={(e) => {
              const target = e.target as HTMLElement;
              if (target.tagName.toLowerCase() === 'input' || target.closest('input')) {
                return;
              }
              e.preventDefault();
            }}
            className="flex flex-wrap items-center gap-1.5 p-2 border-b border-stone-200/60 dark:border-slate-700/60 bg-stone-50/50 dark:bg-slate-900/30 select-none"
          >
                     {/* Headings Selector */}
            {!simplified && (
              <>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-9 gap-1 text-[11px] font-bold text-stone-700 dark:text-slate-200 rounded-lg hover:bg-stone-200/50 dark:hover:bg-slate-800 shrink-0">
                      <FontIcon className="h-4 w-4" />
                      <span className="hidden sm:inline">格式</span>
                      <ChevronDown className="h-3 w-3 opacity-60" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-40 p-1.5 rounded-lg border border-stone-200 dark:border-slate-700 z-[99]" align="start">
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

                {/* Font Family Selector */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-9 gap-1 text-[11px] font-bold text-stone-700 dark:text-slate-200 rounded-lg hover:bg-stone-200/50 dark:hover:bg-slate-800 shrink-0">
                      <CaseSensitive className="h-4 w-4" />
                      <span className="hidden sm:inline">字型</span>
                      <ChevronDown className="h-3 w-3 opacity-60" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-40 p-1.5 rounded-lg border border-stone-200 dark:border-slate-700 z-[99]" align="start">
                    <div className="flex flex-col gap-1 max-h-60 overflow-y-auto no-scrollbar">
                      {[
                        { label: "預設字型", value: "inherit" },
                        { label: "微軟正黑體", value: "'Microsoft JhengHei', sans-serif" },
                        { label: "新細明體", value: "PMingLiU, serif" },
                        { label: "標楷體", value: "DFKai-SB, serif" },
                        { label: "思源黑體", value: "'Noto Sans TC', sans-serif" },
                        { label: "思源宋體", value: "'Noto Serif TC', serif" },
                        { label: "Arial", value: "Arial, sans-serif" },
                        { label: "Georgia", value: "Georgia, serif" },
                        { label: "Courier New", value: "'Courier New', monospace" }
                      ].map((item) => (
                        <Button
                          key={item.label}
                          variant="ghost"
                          size="sm"
                          className="justify-start text-xs h-8 rounded-lg"
                          style={{ fontFamily: item.value }}
                          onClick={() => execCommand("fontName", item.value)}
                        >
                          {item.label}
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Font Size Selector */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-9 gap-1 text-[11px] font-bold text-stone-700 dark:text-slate-200 rounded-lg hover:bg-stone-200/50 dark:hover:bg-slate-800 shrink-0">
                      <ALargeSmall className="h-4 w-4" />
                      <span className="hidden sm:inline">大小</span>
                      <ChevronDown className="h-3 w-3 opacity-60" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-40 p-1.5 rounded-lg border border-stone-200 dark:border-slate-700 z-[99]" align="start">
                    <div className="flex flex-col gap-1 max-h-56 overflow-y-auto no-scrollbar">
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
                      
                      {/* Custom font size input */}
                      <div className="p-1 border-t border-stone-100 dark:border-slate-800 mt-1.5 pt-1.5 flex items-center gap-1.5 shrink-0">
                        <Input
                          type="number"
                          placeholder="px"
                          min="8"
                          max="120"
                          className="h-7 text-xs rounded-lg w-16 px-1.5"
                          id="editor-custom-font-size"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const val = parseInt((e.target as HTMLInputElement).value);
                              if (val >= 8 && val <= 120) {
                                applyCustomFontSize(val);
                              }
                            }
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[10px] px-2 rounded-lg bg-orange-500/10 text-orange-600 hover:bg-orange-500 hover:text-white shrink-0"
                          onClick={() => {
                            const input = document.getElementById('editor-custom-font-size') as HTMLInputElement;
                            const val = parseInt(input?.value);
                            if (val >= 8 && val <= 120) {
                              applyCustomFontSize(val);
                            }
                          }}
                        >
                          套用
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                <div className="w-px h-4 bg-stone-300 dark:bg-slate-700 mx-1 shrink-0" />
              </>
            )}

            {/* Standard Text Formatting */}
            <TooltipProvider>
              {[
                { icon: Bold, title: "粗體 / Bold", cmd: "bold", action: () => execCommand("bold") },
                { icon: Italic, title: "斜體 / Italic", cmd: "italic", action: () => execCommand("italic") },
                { icon: Underline, title: "底線 / Underline", cmd: "underline", action: () => execCommand("underline") },
                { icon: Strikethrough, title: "刪除線 / Strike", cmd: "strikeThrough", action: () => execCommand("strikeThrough") },
              ].map((btn, i) => (
                <Tooltip key={i}>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className={cn("h-9 w-9 rounded-lg text-stone-700 dark:text-slate-300 hover:bg-stone-200/50 dark:hover:bg-slate-800", activeFormats[btn.cmd] && "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300")} onClick={(e) => { e.preventDefault(); btn.action(); }}>
                      <btn.icon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-[9px] font-black uppercase z-[99]">{btn.title}</TooltipContent>
                </Tooltip>
              ))}

              {!simplified && (
                <>
                  <div className="w-px h-4 bg-stone-300 dark:bg-slate-700 mx-1" />

                  {/* Colors Popover (Text & Highlight) */}
                  <Tooltip>
                    <Popover>
                      <TooltipTrigger asChild>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-stone-700 dark:text-slate-300 hover:bg-stone-200/50 dark:hover:bg-slate-800">
                            <Palette className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                      </TooltipTrigger>
                      <PopoverContent className="w-48 p-3 rounded-lg shadow-xl z-[99] border border-stone-200 dark:border-slate-700" side="bottom" align="start">
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
                                <button key={item.value} type="button" className={cn("w-6 h-6 rounded-md cursor-pointer hover:scale-105 border-none shadow-sm transition-transform", item.className)} onClick={() => execCommand("foreColor", item.value)} />
                              ))}
                              {/* Custom Text Color Button */}
                              <button type="button" className="w-6 h-6 rounded-md cursor-pointer hover:scale-105 border border-stone-200 dark:border-slate-700 shadow-sm flex items-center justify-center bg-gradient-to-tr from-rose-400 via-amber-400 to-blue-500" onClick={() => textColorInputRef.current?.click()} title="自訂顏色">
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
                                <button key={item.value} type="button" className={cn("w-6 h-6 rounded-md cursor-pointer hover:scale-105 shadow-sm flex items-center justify-center transition-all", item.className)} onClick={() => execCommand("hiliteColor", item.value)}>
                                  {item.value === 'transparent' && <span className="text-[9px] font-black text-stone-400">✕</span>}
                                </button>
                              ))}
                              {/* Custom Highlight Color Button */}
                              <button type="button" className="w-6 h-6 rounded-md cursor-pointer hover:scale-105 border border-stone-200 dark:border-slate-700 shadow-sm flex items-center justify-center bg-gradient-to-tr from-rose-400 via-amber-400 to-blue-500" onClick={() => highlightColorInputRef.current?.click()} title="自訂高亮">
                                <span className="text-[12px] font-bold text-white shadow-sm">+</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <TooltipContent side="bottom" className="text-[9px] font-black uppercase z-[99]">調色盤 / Colors</TooltipContent>
                  </Tooltip>

                  <div className="w-px h-4 bg-stone-300 dark:bg-slate-700 mx-1" />

                  {/* Layout Alignment & Lists */}
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
                            "h-9 w-9 rounded-lg text-stone-700 dark:text-slate-300 hover:bg-stone-200/50 dark:hover:bg-slate-800",
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

                  <div className="w-px h-4 bg-stone-300 dark:bg-slate-700 mx-1" />

                  {/* Insert Table */}
                  <Tooltip>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-stone-700 dark:text-slate-300 hover:bg-stone-200/50 dark:hover:bg-slate-800">
                          <TableIcon className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-40 p-2 rounded-lg z-[99] border border-stone-200 dark:border-slate-700" side="bottom" align="start">
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
                              onClick={() => execCommand("insertHTML", createEditorTableHtml(tbl.r, tbl.c))}
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
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-stone-700 dark:text-slate-300 hover:bg-stone-200/50 dark:hover:bg-slate-800">
                          <LinkIcon className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-3 rounded-lg z-[99] border border-stone-200 dark:border-slate-700 shadow-xl" side="bottom" align="start">
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
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-stone-700 dark:text-slate-300 hover:bg-stone-200/50 dark:hover:bg-slate-800">
                          <ImageIcon className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-3 rounded-lg z-[99] border border-stone-200 dark:border-slate-700 shadow-xl" side="bottom" align="start">
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
                </>
              )}

              {!simplified && <div className="w-px h-4 bg-stone-300 dark:bg-slate-700 mx-1" />}

              {/* Clear Styling Eraser */}
              {/* Undo / Redo (#8) */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-stone-700 dark:text-slate-300 hover:bg-stone-200/50 dark:hover:bg-slate-800" onClick={(e) => { e.preventDefault(); execCommand('undo'); }}>
                    <Undo2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-[9px] font-black uppercase z-[99]">復原 / Undo</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-stone-700 dark:text-slate-300 hover:bg-stone-200/50 dark:hover:bg-slate-800" onClick={(e) => { e.preventDefault(); execCommand('redo'); }}>
                    <Redo2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-[9px] font-black uppercase z-[99]">重做 / Redo</TooltipContent>
              </Tooltip>

              <div className="w-px h-4 bg-stone-300 dark:bg-slate-700 mx-1" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20" onClick={(e) => { e.preventDefault(); handleClearFormat(); }}>
                    <Eraser className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-[9px] font-black uppercase z-[99]">清除格式 / Clear</TooltipContent>
              </Tooltip>

              {/* Auto-save Status Indicator (#13) */}
              <div className="ml-auto flex items-center gap-1.5 px-2 text-[10px] text-stone-400 dark:text-slate-500 font-bold tracking-wider select-none">
                {isSaving ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    <span>儲存中...</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>已儲存</span>
                  </>
                )}
              </div>

            </TooltipProvider>
          </div>
        )}

        {selectedImage && imageMenuPos && !readOnly && createPortal(
          <div ref={imageMenuRef} data-editor-floating role="toolbar" aria-label="圖片工具"
            onPointerDown={(event) => { if (event.pointerType === "mouse") event.preventDefault(); }}
            className={objectTools} style={imageMenuPos}>
            {([
              ["left", "圖片靠左", AlignLeft], ["center", "圖片置中", AlignCenter], ["right", "圖片靠右", AlignRight],
            ] as const).map(([alignment, label, Icon]) => {
              const { display, marginLeft, marginRight } = selectedImage.style;
              const active = display === "block" && (alignment === "center" ? marginLeft === "auto" && marginRight === "auto"
                : alignment === "left" ? marginLeft !== "auto" && marginRight === "auto" : marginLeft === "auto" && marginRight !== "auto");
              return (
                <Button key={alignment} variant="ghost" size="icon" title={label} aria-label={label} aria-pressed={active}
                  className={cn(objectButton, active && selectedObjectButton)} onClick={() => alignImage(alignment)}>
                  <Icon className="h-4 w-4" />
                </Button>
              );
            })}
            <Popover open={imageOptionsOpen} onOpenChange={setImageOptionsOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="圖片選項" title="圖片選項" className={objectButton}>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent data-editor-floating align="start" className="w-56 space-y-2 rounded-lg border p-2"
                onOpenAutoFocus={(event) => event.preventDefault()} onCloseAutoFocus={(event) => event.preventDefault()}
                onPointerDown={(event) => { if (event.pointerType === "mouse" && event.target instanceof Element && event.target.closest("button")) event.preventDefault(); }}>
                <div aria-label="圖片寬度" role="group" className="grid grid-cols-5 gap-0.5">
                  {["25%", "33%", "50%", "75%", "100%"].map((width) => (
                    <Button key={width} variant="ghost" size="sm" aria-pressed={selectedImage.style.width === width}
                      className={cn("h-7 px-1 text-xs", selectedImage.style.width === width && selectedObjectButton)}
                      onClick={() => resizeImage(width)}>{width}</Button>
                  ))}
                </div>
                <div className="grid grid-cols-2 border-y py-1">
                  {[
                    { label: "與文字同行", apply: () => toggleImageStyle("display", "inline-block") },
                    { label: "獨立一行", apply: () => toggleImageStyle("display", "block") },
                    { label: "圓角", apply: () => toggleImageStyle("borderRadius", "8px") },
                    { label: "陰影", apply: () => toggleImageStyle("boxShadow", "0 20px 25px -5px rgba(0,0,0,0.25)") },
                    { label: "16:9 比例", apply: () => toggleImageStyle("aspectRatio", "16/9") },
                    { label: "重設格式", apply: clearImageFormat },
                  ].map(({ label, apply }) => (
                    <Button key={label} variant="ghost" size="sm" className="h-8 justify-start px-2 text-xs" onClick={apply}>{label}</Button>
                  ))}
                </div>
                <Button variant="ghost" size="sm" className="h-8 w-full justify-start text-destructive" onClick={() => {
                  setImageOptionsOpen(false);
                  deleteImage();
                }}><Trash2 className="h-4 w-4" />刪除圖片</Button>
              </PopoverContent>
            </Popover>
          </div>, document.body
        )}

        {activeTable && !selectedImage && !readOnly && tableMenuPos && createPortal(
          <>
            <div data-editor-floating role="toolbar" aria-label="表格工具" className="fixed z-50" style={tableMenuPos}
              onPointerDown={(event) => { if (event.pointerType === "mouse") event.preventDefault(); }}>
              <Popover open={tableActionsOpen} onOpenChange={setTableActionsOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="表格操作" title="表格操作（或按右鍵）"
                    className="h-6 w-6 rounded-md bg-popover text-muted-foreground shadow-sm hover:text-foreground">
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent data-editor-floating align="end" className="w-48 rounded-lg border p-1.5"
                  onOpenAutoFocus={(event) => event.preventDefault()} onCloseAutoFocus={(event) => event.preventDefault()}
                  onPointerDown={(event) => { if (event.pointerType === "mouse" && event.target instanceof Element && event.target.closest("button")) event.preventDefault(); }}>
                  {[
                    [
                      { label: "上方插入列", action: () => mutateTable((table, cell) => insertEditorRow(table, cell, false)) },
                      { label: "下方插入列", action: () => mutateTable((table, cell) => insertEditorRow(table, cell, true)) },
                      { label: "左方插入欄", action: () => mutateTable((table, cell) => insertEditorColumn(table, cell, false)) },
                      { label: "右方插入欄", action: () => mutateTable((table, cell) => insertEditorColumn(table, cell, true)) },
                    ], [
                      { label: "合併右側儲存格", action: () => mutateTable(mergeEditorCellRight) },
                      { label: "分割儲存格", action: () => mutateTable(splitEditorCell) },
                    ], [
                      { label: "刪除這列", action: () => mutateTable(deleteEditorRow) },
                      { label: "刪除這欄", action: () => mutateTable(deleteEditorColumn) },
                      { label: "刪除表格", action: () => mutateTable((table) => table.remove()) },
                    ],
                  ].map((group, i) => (
                    <div key={group[0].label} className={cn(i > 0 && "mt-1 border-t pt-1")}>
                      {group.map(({ label, action }) => (
                        <Button key={label} variant="ghost" size="sm"
                          className={cn("h-8 w-full justify-start px-2 text-xs", i === 2 && "text-destructive")}
                          onClick={() => { action(); setTableActionsOpen(false); }}>{label}</Button>
                      ))}
                    </div>
                  ))}
                  <div className="mt-1 flex justify-between border-t px-1 pt-1" role="group" aria-label="儲存格對齊">
                    {([
                      ["left", "儲存格靠左", AlignLeft], ["center", "儲存格置中", AlignCenter], ["right", "儲存格靠右", AlignRight],
                    ] as const).map(([align, label, Icon]) => (
                      <Button key={align} variant="ghost" size="icon" aria-label={label} title={label} className={objectButton}
                        onClick={() => { mutateTable((_, cell) => { cell.style.textAlign = align; }); setTableActionsOpen(false); }}>
                        <Icon className="h-4 w-4" />
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            {columnHandle && !tableActionsOpen && (
              <div data-editor-floating onPointerDown={startColumnResize}
                className="fixed z-40 w-2 -translate-x-1/2 cursor-col-resize touch-none hover:bg-orange-500/70 active:bg-orange-500"
                title="拖曳以調整欄寬" style={columnHandle} />
            )}
          </>, document.body
        )}

        <div style={{ minHeight }} className="relative h-auto">
          {isEditorEmpty && (
            <div className="pointer-events-none absolute left-3 top-3 z-10 text-sm text-muted-foreground md:left-4 md:top-4">
              {placeholder || "撰寫教案內容..."}
            </div>
          )}
          <div
            ref={editorRef}
            contentEditable={!readOnly}
            data-rich-text-editor
            onDragStart={(event) => { if (event.target instanceof HTMLImageElement) event.preventDefault(); }}
            onClick={handleEditorClick}
            onContextMenu={(event) => {
              const cell = event.target instanceof Element ? event.target.closest<HTMLTableCellElement>("td,th") : null;
              if (readOnly || !cell || !event.currentTarget.contains(cell)) return;
              event.preventDefault();
              setSelectedImage(null);
              if (getSelectedTableCell() !== cell) selectCell(cell);
              setActiveCell(cell);
              setActiveTable(cell.closest("table"));
              setTableActionsOpen(true);
            }}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            style={{ minHeight }}
            className={cn(
              "relative w-full max-w-full h-auto p-3 md:p-4 bg-transparent text-stone-800 dark:text-slate-100 outline-none prose prose-p:bg-transparent prose-li:bg-transparent prose-sm text-[14px] transition-all duration-300",
              "dark:prose-invert break-words whitespace-pre-wrap [--editor-default-font:var(--font-inter,Inter),sans-serif] [--editor-default-color:#292524] dark:[--editor-default-color:#f1f5f9]",
              readOnly && "cursor-default",
              "focus:ring-0",
              "[&_ul]:list-disc [&_ol]:list-decimal [&_ul]:list-inside [&_ol]:list-inside [&_ul]:!pl-4 [&_ol]:!pl-4 [&_ul]:!ml-0 [&_ol]:!ml-0 [&_ol]:my-3",
              "[&_font[size='1']]:text-[12px] [&_font[size='1']]:leading-[1.5] [&_font[size='2']]:text-[14px] [&_font[size='2']]:leading-[1.6] [&_font[size='3']]:text-[16px] [&_font[size='3']]:leading-[1.7] [&_font[size='4']]:text-[18px] [&_font[size='4']]:leading-[1.7] [&_font[size='5']]:text-[20px] [&_font[size='5']]:leading-[1.6] [&_font[size='6']]:text-[24px] [&_font[size='6']]:leading-[1.5] [&_font[size='7']]:text-[32px] [&_font[size='7']]:leading-[1.4]",
              "[&_p]:leading-[1.5] [&_p]:mb-3 [&_p:last-child]:mb-0 [&_p]:text-inherit",
              "[&_div]:text-inherit [&_span]:text-inherit [&_div]:leading-[1.5]",
              "[&_h1]:text-2xl [&_h1]:font-black [&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:text-stone-900 dark:[&_h1]:text-white [&_h1]:leading-[1.25]",
              "[&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:mt-4 [&_h2]:mb-2.5 [&_h2]:text-stone-800 dark:[&_h2]:text-slate-100 [&_h2]:leading-[1.3]",
              "[&_h3]:text-lg [&_h3]:font-bold [&_h3]:mt-3 [&_h3]:mb-2 [&_h3]:text-stone-700 dark:[&_h3]:text-slate-200 [&_h3]:leading-[1.4]",
              "[&_img]:cursor-pointer [&_img]:shadow-md [&_img:hover]:shadow-lg [&_img]:rounded-xl [&_img]:inline-block [&_img]:max-w-full [&_img]:h-auto [&_img]:object-contain [&_img]:align-top",
              "[&_table]:w-full [&_table]:max-w-full [&_table]:my-4 [&_table]:border-collapse [&_table]:table-fixed [&_table_td]:border [&_table_td]:border-stone-300 dark:[&_table_td]:border-slate-600 [&_table_td]:p-2.5 [&_table_td]:align-top [&_table_td]:break-words [&_table_th]:border [&_table_th]:p-2.5"
            )}
            data-placeholder={placeholder || `撰寫教案內容... (支援貼上與插入圖片、表格與格式)`}
          />

          {selectedImage && imageRect && !readOnly && createPortal(
            <div data-editor-floating className="pointer-events-none fixed z-40 border border-orange-500" style={imageRect}>
              {[
                { x: -1, corner: "left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize" },
                { x: 1, corner: "right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize" },
                { x: -1, corner: "bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize" },
                { x: 1, corner: "bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize" },
              ].map(({ x, corner }) => (
                <div key={corner} onPointerDown={(event) => startImageResize(event, x)}
                  className={cn("pointer-events-auto absolute h-4 w-4 touch-none rounded-sm after:absolute after:inset-[3px] after:rounded-sm after:border after:border-white after:bg-orange-600", corner)}
                  title="拖曳以縮放圖片" />
              ))}
            </div>, document.body
          )}
          {/* Custom color input tags (hidden) */}
          <input type="color" ref={textColorInputRef} className="sr-only" onChange={handleCustomTextColor} />
          <input type="color" ref={highlightColorInputRef} className="sr-only" onChange={handleCustomHighlightColor} />
        </div>
      </div>
    </div>
  );
}
