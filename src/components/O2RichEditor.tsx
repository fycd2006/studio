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
  Circle as CircleIcon,
  Layers,
  RectangleHorizontal,
  RotateCcw,
  Type as FontIcon,
  ALargeSmall,
  CaseSensitive,
  Layout,
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
  TableProperties,
  ArrowDownToLine,
  ArrowUpToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  Grid,
  Undo2,
  Redo2,
  Merge,
  Split
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

// Safe HTML sanitizer utilizing browser DOMParser (#15)
const sanitizeHtml = (html: string): string => {
  if (typeof window === 'undefined') return html;
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  const cleanNode = (node: Node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tagName = el.tagName.toUpperCase();
      
      // Remove script/style/embed/link/iframe elements
      if (['SCRIPT', 'OBJECT', 'EMBED', 'APPLET', 'LINK', 'STYLE', 'IFRAME', 'META', 'BASE'].includes(tagName)) {
        el.remove();
        return;
      }

      // Remove inline event attributes & javascript: links
      const attribs = Array.from(el.attributes);
      for (const attr of attribs) {
        const name = attr.name.toLowerCase();
        if (name.startsWith('on')) {
          el.removeAttribute(attr.name);
        } else if ((name === 'href' || name === 'src') && 
                   (attr.value.trim().toLowerCase().startsWith('javascript:') || 
                    attr.value.trim().toLowerCase().startsWith('data:text/html'))) {
          el.removeAttribute(attr.name);
        }
      }
    }
    
    const children = Array.from(node.childNodes);
    for (const child of children) {
      cleanNode(child);
    }
  };

  cleanNode(doc.body);
  return doc.body.innerHTML;
};

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
  hideToolbar = true
}: O2RichEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);
  const savedRangeRef = useRef<Range | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
  const [imageMenuPos, setImageMenuPos] = useState({ top: 0, left: 0 });
  const [activeTable, setActiveTable] = useState<HTMLTableElement | null>(null);
  const [tableMenuPos, setTableMenuPos] = useState({ top: 0, left: 0 });

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

  const isEditorEmpty = !value || value.replace(/<(img|table|iframe|video)[^>]*>/gi, 'HAS_MEDIA').replace(/<[^>]*>|&nbsp;|\s/gi, '').length === 0;

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
  }, [value]);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleInput = useCallback(() => {
    if (readOnly) return;
    setIsSaving(true);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      if (editorRef.current) {
        isInternalChange.current = true;
        onChange(editorRef.current.innerHTML);
        setIsSaving(false);
      }
    }, 350);
  }, [onChange, readOnly]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, []);

  // Listen to native input events (crucial for detached toolbars that dispatch native events)
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    el.addEventListener('input', handleInput);
    return () => el.removeEventListener('input', handleInput);
  }, [handleInput]);

  // Helper: check selection parent element type
  const getSelectedTableCell = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    let node = selection.getRangeAt(0).startContainer as HTMLElement | null;
    while (node && node.nodeName !== 'TD' && node.nodeName !== 'TH' && node.nodeName !== 'BODY') {
      node = node.parentNode as HTMLElement | null;
    }
    return (node && (node.nodeName === 'TD' || node.nodeName === 'TH')) ? (node as HTMLTableCellElement) : null;
  };

  const getSelectedTable = () => {
    let node: HTMLElement | null = getSelectedTableCell();
    while (node && node.nodeName !== 'TABLE' && node.nodeName !== 'BODY') {
      node = node.parentNode as HTMLElement | null;
    }
    return (node && node.nodeName === 'TABLE') ? (node as HTMLTableElement) : null;
  };

  // Update floating positions (use viewport coords only — menus are position:fixed)
  const updateMenuPosition = useCallback(() => {
    if (selectedImage) {
      const rect = selectedImage.getBoundingClientRect();
      const rawTop = rect.top - 60;
      const rawLeft = rect.left + (rect.width / 2);
      setImageMenuPos({
        top: Math.max(8, rawTop),
        left: Math.max(120, Math.min(window.innerWidth - 120, rawLeft))
      });
      const containerRect = editorRef.current?.parentElement?.getBoundingClientRect();
      if (containerRect) {
        setImageRect({
          top: rect.top - containerRect.top,
          left: rect.left - containerRect.left,
          width: rect.width,
          height: rect.height
        });
      }
    } else {
      setImageRect(null);
    }
    if (activeTable) {
      const rect = activeTable.getBoundingClientRect();
      const rawTop = rect.top - 55;
      const rawLeft = rect.left + (rect.width / 2);
      setTableMenuPos({
        top: Math.max(8, rawTop),
        left: Math.max(120, Math.min(window.innerWidth - 120, rawLeft))
      });
    }
  }, [selectedImage, activeTable]);

  // Handle document click/selection change to detect active elements
  // Scoped: only react when selection is inside this editor instance (#8 multi-instance perf)
  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const anchor = sel.anchorNode;
      if (!editorRef.current || !anchor || !editorRef.current.contains(anchor)) {
        setActiveTable(null);
        return;
      }
      const table = getSelectedTable();
      setActiveTable(table);
      updateActiveFormats();
      // Save the current selection range so toolbar actions can restore it
      if (sel.rangeCount > 0) {
        savedRangeRef.current = sel.getRangeAt(0).cloneRange();
      }
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [updateActiveFormats]);

  useEffect(() => {
    if (!selectedImage && !activeTable) return;

    const update = () => updateMenuPosition();
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
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
      if (observer) {
        observer.disconnect();
      }
    };
  }, [selectedImage, activeTable, updateMenuPosition]);

  // Drag resize handler for images (#11) — supports both mouse and touch
  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedImage) return;

    const isTouch = 'touches' in e;
    const startX = isTouch ? (e as React.TouchEvent).touches[0].clientX : (e as React.MouseEvent).clientX;
    const startWidth = selectedImage.getBoundingClientRect().width;
    const editorWidth = editorRef.current?.getBoundingClientRect().width || 800;

    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : (moveEvent as MouseEvent).clientX;
      const deltaX = clientX - startX;
      const newWidth = Math.max(50, startWidth + deltaX);
      selectedImage.style.maxWidth = 'none';
      selectedImage.style.width = `${newWidth}px`;
      selectedImage.style.height = 'auto';
      updateMenuPosition();
    };

    const handleEnd = () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
      handleInput();
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
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
      setActiveTable(null); // hide table menu when image clicked
      setTimeout(updateMenuPosition, 10);
    } else {
      setSelectedImage(null);
    }
  };

  const execCommand = (command: string, val: string | undefined = undefined) => {
    if (readOnly) return;
    
    // Save selection range before executing command
    const selection = window.getSelection();
    let savedRange: Range | null = null;
    if (selection && selection.rangeCount > 0) {
      savedRange = selection.getRangeAt(0).cloneRange();
    }

    document.execCommand(command, false, val);

    // Restore selection range
    if (savedRange && selection) {
      selection.removeAllRanges();
      selection.addRange(savedRange);
    }

    handleInput();
    updateActiveFormats();
  };

  // Keyboard shortcuts (#9)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (readOnly) return;
    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;
    switch (e.key.toLowerCase()) {
      case 'b': e.preventDefault(); execCommand('bold'); break;
      case 'i': e.preventDefault(); execCommand('italic'); break;
      case 'u': e.preventDefault(); execCommand('underline'); break;
      case 'z':
        e.preventDefault();
        if (e.shiftKey) execCommand('redo');
        else execCommand('undo');
        break;
      case 'y': e.preventDefault(); execCommand('redo'); break;
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
    const imgHtml = `<img src="${imageUrl}" loading="lazy" style="width: 100%; max-width: 500px; height: auto; display: block; margin: 12px auto; border-radius: 12px; cursor: pointer; transition: all 0.3s; vertical-align: top;" />`;
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

  // Clipboard Paste event handler (Sanitized Rich Text & Local image pasting) (#15, #17)
  const handlePaste = (e: React.ClipboardEvent) => {
    if (readOnly) {
      e.preventDefault();
      return;
    }
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
            const imgHtml = `<img src="${dataUri}" loading="lazy" style="width: 75%; height: auto; display: block; margin: 12px auto; border-radius: 12px; cursor: pointer; transition: all 0.3s; vertical-align: top;" />`;
            execCommand("insertHTML", imgHtml);
          };
          reader.readAsDataURL(file);
        }
        break;
      }
    }

    if (!imageFound) {
      const html = e.clipboardData.getData("text/html");
      if (html) {
        e.preventDefault();
        const cleanHtml = sanitizeHtml(html);
        execCommand("insertHTML", cleanHtml);
      } else {
        setTimeout(handleInput, 50);
      }
    }
  };

  // Table manipulation helper functions
  const insertTable = (rows: number, cols: number) => {
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

  const getCellIndex = (cell: HTMLTableCellElement) => {
    return cell.cellIndex;
  };

  const getRowIndex = (cell: HTMLTableCellElement) => {
    const row = cell.parentNode as HTMLTableRowElement;
    return row.rowIndex;
  };

  const addRowAbove = () => {
    const cell = getSelectedTableCell();
    const table = getSelectedTable();
    if (!cell || !table) return;
    const rowIndex = getRowIndex(cell);
    const newRow = table.insertRow(rowIndex);
    const colCount = table.rows[rowIndex + 1].cells.length;
    for (let i = 0; i < colCount; i++) {
      const newCell = newRow.insertCell(i);
      newCell.innerHTML = "&nbsp;";
      newCell.style.border = "1px solid currentColor";
      newCell.style.padding = "10px";
      newCell.style.verticalAlign = "top";
      newCell.style.opacity = "0.85";
    }
    handleInput();
    setTimeout(updateMenuPosition, 50);
  };

  const addRowBelow = () => {
    const cell = getSelectedTableCell();
    const table = getSelectedTable();
    if (!cell || !table) return;
    const rowIndex = getRowIndex(cell);
    const newRow = table.insertRow(rowIndex + 1);
    const colCount = table.rows[rowIndex].cells.length;
    for (let i = 0; i < colCount; i++) {
      const newCell = newRow.insertCell(i);
      newCell.innerHTML = "&nbsp;";
      newCell.style.border = "1px solid currentColor";
      newCell.style.padding = "10px";
      newCell.style.verticalAlign = "top";
      newCell.style.opacity = "0.85";
    }
    handleInput();
    setTimeout(updateMenuPosition, 50);
  };

  const addColumnLeft = () => {
    const cell = getSelectedTableCell();
    const table = getSelectedTable();
    if (!cell || !table) return;
    const colIndex = getCellIndex(cell);
    for (let i = 0; i < table.rows.length; i++) {
      const row = table.rows[i];
      const newCell = row.insertCell(colIndex);
      newCell.innerHTML = "&nbsp;";
      newCell.style.border = "1px solid currentColor";
      newCell.style.padding = "10px";
      newCell.style.verticalAlign = "top";
      newCell.style.opacity = "0.85";
    }
    handleInput();
    setTimeout(updateMenuPosition, 50);
  };

  const addColumnRight = () => {
    const cell = getSelectedTableCell();
    const table = getSelectedTable();
    if (!cell || !table) return;
    const colIndex = getCellIndex(cell);
    for (let i = 0; i < table.rows.length; i++) {
      const row = table.rows[i];
      const newCell = row.insertCell(colIndex + 1);
      newCell.innerHTML = "&nbsp;";
      newCell.style.border = "1px solid currentColor";
      newCell.style.padding = "10px";
      newCell.style.verticalAlign = "top";
      newCell.style.opacity = "0.85";
    }
    handleInput();
    setTimeout(updateMenuPosition, 50);
  };

  const deleteRow = () => {
    const cell = getSelectedTableCell();
    const table = getSelectedTable();
    if (!cell || !table) return;
    const rowIndex = getRowIndex(cell);
    table.deleteRow(rowIndex);
    if (table.rows.length === 0) {
      table.remove();
      setActiveTable(null);
    }
    handleInput();
    setTimeout(updateMenuPosition, 50);
  };

  const deleteColumn = () => {
    const cell = getSelectedTableCell();
    const table = getSelectedTable();
    if (!cell || !table) return;
    const colIndex = getCellIndex(cell);
    for (let i = 0; i < table.rows.length; i++) {
      table.rows[i].deleteCell(colIndex);
    }
    if (table.rows[0]?.cells.length === 0) {
      table.remove();
      setActiveTable(null);
    }
    handleInput();
    setTimeout(updateMenuPosition, 50);
  };

  const deleteTable = () => {
    const table = getSelectedTable();
    if (table) {
      table.remove();
      setActiveTable(null);
      handleInput();
    }
  };

  // Table cell merge & split helpers (#12)
  const mergeCellRight = () => {
    const cell = getSelectedTableCell();
    if (!cell) return;
    const row = cell.parentNode as HTMLTableRowElement;
    if (!row) return;
    const nextCell = row.cells[cell.cellIndex + 1];
    if (!nextCell) return;

    cell.innerHTML = cell.innerHTML + (nextCell.innerHTML === "&nbsp;" ? "" : nextCell.innerHTML);
    cell.colSpan = (cell.colSpan || 1) + (nextCell.colSpan || 1);
    nextCell.remove();
    handleInput();
    setTimeout(updateMenuPosition, 50);
  };

  const splitCell = () => {
    const cell = getSelectedTableCell();
    if (!cell) return;
    const row = cell.parentNode as HTMLTableRowElement;
    if (!row) return;

    const colSpan = cell.colSpan || 1;
    const rowSpan = cell.rowSpan || 1;

    if (colSpan > 1) {
      for (let i = 1; i < colSpan; i++) {
        const newCell = row.insertCell(cell.cellIndex + 1);
        newCell.innerHTML = "&nbsp;";
        newCell.style.border = "1px solid currentColor";
        newCell.style.padding = "10px";
        newCell.style.verticalAlign = "top";
        newCell.style.opacity = "0.85";
      }
      cell.colSpan = 1;
    }

    if (rowSpan > 1) {
      const table = row.parentNode as HTMLTableSectionElement | HTMLTableElement;
      const rowIndex = row.rowIndex;
      for (let r = 1; r < rowSpan; r++) {
        const targetRow = (table as HTMLTableElement).rows[rowIndex + r];
        if (targetRow) {
          const newCell = targetRow.insertCell(Math.min(cell.cellIndex, targetRow.cells.length));
          newCell.innerHTML = "&nbsp;";
          newCell.style.border = "1px solid currentColor";
          newCell.style.padding = "10px";
          newCell.style.verticalAlign = "top";
          newCell.style.opacity = "0.85";
        }
      }
      cell.rowSpan = 1;
    }

    handleInput();
    setTimeout(updateMenuPosition, 50);
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
          "bg-white/50 dark:bg-slate-800/50 border border-stone-200 dark:border-slate-700/50 shadow-sm transition-all duration-300 relative group overflow-visible",
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

                {/* Font Family Selector */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-9 gap-1 text-[11px] font-bold text-stone-700 dark:text-slate-200 rounded-lg hover:bg-stone-200/50 dark:hover:bg-slate-800 shrink-0">
                      <CaseSensitive className="h-4 w-4" />
                      <span className="hidden sm:inline">字型</span>
                      <ChevronDown className="h-3 w-3 opacity-60" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-40 p-1.5 rounded-xl border border-stone-200 dark:border-slate-700 z-[99]" align="start">
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
                  <PopoverContent className="w-40 p-1.5 rounded-xl border border-stone-200 dark:border-slate-700 z-[99]" align="start">
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
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-stone-700 dark:text-slate-300 hover:bg-stone-200/50 dark:hover:bg-slate-800">
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
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-stone-700 dark:text-slate-300 hover:bg-stone-200/50 dark:hover:bg-slate-800">
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

        {/* Selected Image Floating Menu */}
        {selectedImage && !readOnly && (
          <div
            className="fixed z-[9999] flex flex-col gap-2 p-2 bg-slate-900/95 backdrop-blur-md shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            style={{
              top: `${imageMenuPos.top}px`,
              left: `${imageMenuPos.left}px`,
              transform: 'translate(-50%, -100%)'
            }}
          >
            <div className="flex items-center gap-1.5">
              <TooltipProvider>
                <div className="flex items-center gap-1 pr-1 border-r border-slate-700/60">
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
                            "h-7 px-1 min-w-[28px] text-[9px] font-black text-white hover:bg-white/20 transition-all rounded-lg",
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

                <div className="flex items-center gap-1 px-1.5 border-r border-slate-700/60">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/20 rounded-lg border-none" onClick={() => toggleImageStyle('borderRadius', '24px')}><CircleIcon className="h-3.5 w-3.5" /></Button>
                    </TooltipTrigger>
                    <TooltipContent className="text-[10px] font-bold">圓角 / Round</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/20 rounded-lg border-none" onClick={() => toggleImageStyle('boxShadow', '0 20px 25px -5px rgba(0,0,0,0.25)')}><Layers className="h-3.5 w-3.5" /></Button>
                    </TooltipTrigger>
                    <TooltipContent className="text-[10px] font-bold">陰影 / Shadow</TooltipContent>
                  </Tooltip>
                </div>

                <div className="flex items-center gap-1 px-1.5 border-r border-slate-700/60">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/20 rounded-lg border-none" onClick={() => toggleImageStyle('aspectRatio', '16/9')}><RectangleHorizontal className="h-3.5 w-3.5" /></Button>
                    </TooltipTrigger>
                    <TooltipContent className="text-[10px] font-bold">16:9 比例</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className={cn("h-7 w-7 text-white hover:bg-white/20 rounded-lg", selectedImage.style.display === 'inline-block' && "bg-orange-600")} onClick={() => toggleImageStyle('display', 'inline-block')}><Layout className="h-3.5 w-3.5" /></Button>
                    </TooltipTrigger>
                    <TooltipContent className="text-[10px] font-bold">行內 / Inline</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className={cn("h-7 w-7 text-white hover:bg-white/20 rounded-lg", selectedImage.style.display === 'block' && "bg-orange-600")} onClick={() => toggleImageStyle('display', 'block')}><AlignCenter className="h-3.5 w-3.5" /></Button>
                    </TooltipTrigger>
                    <TooltipContent className="text-[10px] font-bold">置中 / Center</TooltipContent>
                  </Tooltip>
                </div>

                <div className="flex items-center gap-1 pl-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/20 rounded-lg border-none" onClick={clearImageFormat}><RotateCcw className="h-3.5 w-3.5" /></Button>
                    </TooltipTrigger>
                    <TooltipContent className="text-[10px] font-bold">重設 / Reset</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-400 hover:bg-rose-500 hover:text-white rounded-lg border-none" onClick={deleteImage}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </TooltipTrigger>
                    <TooltipContent className="text-[10px] font-bold">刪除 / Delete</TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
            </div>
          </div>
        )}

        {/* Selected Table Floating Menu */}
        {activeTable && !readOnly && (
          <div
            className="fixed z-[9999] flex items-center gap-1.5 p-1.5 bg-slate-900/95 backdrop-blur-md shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            style={{
              top: `${tableMenuPos.top}px`,
              left: `${tableMenuPos.left}px`,
              transform: 'translate(-50%, -100%)'
            }}
          >
            <TooltipProvider>
              <div className="flex items-center gap-1 pr-1 border-r border-slate-700/60">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/20 rounded-lg border-none" onClick={addRowAbove}><ArrowUpToLine className="h-3.5 w-3.5" /></Button>
                  </TooltipTrigger>
                  <TooltipContent className="text-[10px] font-bold">上方插入列 / Insert Row Above</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/20 rounded-lg border-none" onClick={addRowBelow}><ArrowDownToLine className="h-3.5 w-3.5" /></Button>
                  </TooltipTrigger>
                  <TooltipContent className="text-[10px] font-bold">下方插入列 / Insert Row Below</TooltipContent>
                </Tooltip>
              </div>

              <div className="flex items-center gap-1 px-1 border-r border-slate-700/60">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/20 rounded-lg border-none" onClick={addColumnLeft}><ArrowLeftToLine className="h-3.5 w-3.5" /></Button>
                  </TooltipTrigger>
                  <TooltipContent className="text-[10px] font-bold">左方插入欄 / Insert Column Left</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/20 rounded-lg border-none" onClick={addColumnRight}><ArrowRightToLine className="h-3.5 w-3.5" /></Button>
                  </TooltipTrigger>
                  <TooltipContent className="text-[10px] font-bold">右方插入欄 / Insert Column Right</TooltipContent>
                </Tooltip>
              </div>

              {/* Table cell merge / split options (#12) */}
              <div className="flex items-center gap-1 px-1 border-r border-slate-700/60">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/20 rounded-lg border-none" onClick={mergeCellRight}><Merge className="h-3.5 w-3.5" /></Button>
                  </TooltipTrigger>
                  <TooltipContent className="text-[10px] font-bold">合併右側儲存格 / Merge Right</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/20 rounded-lg border-none" onClick={splitCell}><Split className="h-3.5 w-3.5" /></Button>
                  </TooltipTrigger>
                  <TooltipContent className="text-[10px] font-bold">拆分儲存格 / Split Cell</TooltipContent>
                </Tooltip>
              </div>

              <div className="flex items-center gap-1 px-1 border-r border-slate-700/60">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" className="h-7 w-auto px-2 text-rose-300 hover:bg-rose-500/30 hover:text-white rounded-lg border-none flex items-center gap-1" onClick={deleteRow}>
                      <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                      <span className="text-[10px] font-bold">列</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="text-[10px] font-bold">刪除列 / Delete Row</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" className="h-7 w-auto px-2 text-rose-300 hover:bg-rose-500/30 hover:text-white rounded-lg border-none flex items-center gap-1" onClick={deleteColumn}>
                      <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                      <span className="text-[10px] font-bold">欄</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="text-[10px] font-bold">刪除欄 / Delete Column</TooltipContent>
                </Tooltip>
              </div>

              <div className="flex items-center gap-1 pl-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-400 hover:bg-rose-500 hover:text-white rounded-lg border-none" onClick={deleteTable}><TableProperties className="h-3.5 w-3.5" /></Button>
                  </TooltipTrigger>
                  <TooltipContent className="text-[10px] font-bold">刪除整張表 / Delete Table</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>
        )}

        {/* Editor Body */}
        <div style={{ minHeight }} className="h-auto relative">
          {isEditorEmpty && (
            <div className="absolute top-3 left-3 md:top-4 md:left-4 p-0 m-0 pointer-events-none text-stone-400 dark:text-slate-500 font-medium text-[14px] select-none z-10 w-full whitespace-pre-wrap break-words transition-colors">
              {placeholder || `撰寫教案內容... (支援貼上與插入圖片、表格與格式)`}
            </div>
          )}
          <div
            ref={editorRef}
            contentEditable={!readOnly}
            onInput={handleInput}
            onClick={handleEditorClick}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            style={{ minHeight }}
            className={cn(
              "relative w-full max-w-full h-auto p-3 md:p-4 bg-transparent text-stone-800 dark:text-slate-100 outline-none prose prose-p:bg-transparent prose-li:bg-transparent prose-sm text-[14px] transition-all duration-[300ms]",
              "dark:prose-invert break-words whitespace-pre-wrap",
              readOnly && "cursor-default",
              "focus:ring-0",
              "[&_ul]:list-disc [&_ol]:list-decimal [&_ul]:list-inside [&_ol]:list-inside [&_ul]:!pl-4 [&_ol]:!pl-4 [&_ul]:!ml-0 [&_ol]:!ml-0 [&_ol]:my-3",
              "[&_font[size='1']]:text-[12px] [&_font[size='1']]:leading-[1.5] [&_font[size='2']]:text-[14px] [&_font[size='2']]:leading-[1.6] [&_font[size='3']]:text-[16px] [&_font[size='3']]:leading-[1.7] [&_font[size='4']]:text-[18px] [&_font[size='4']]:leading-[1.7] [&_font[size='5']]:text-[20px] [&_font[size='5']]:leading-[1.6] [&_font[size='6']]:text-[24px] [&_font[size='6']]:leading-[1.5] [&_font[size='7']]:text-[32px] [&_font[size='7']]:leading-[1.4]",
              "[&_font[size='5']]:block [&_font[size='6']]:block [&_font[size='7']]:block [&_font[size='5']]:my-1 [&_font[size='6']]:my-1.5 [&_font[size='7']]:my-2",
              "[&_p]:leading-[1.5] [&_p]:mb-3 [&_p:last-child]:mb-0 [&_p]:text-inherit",
              "[&_div]:text-inherit [&_span]:text-inherit [&_div]:leading-[1.5]",
              "[&_h1]:text-2xl [&_h1]:font-black [&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:text-stone-900 dark:[&_h1]:text-white [&_h1]:leading-[1.25]",
              "[&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:mt-4 [&_h2]:mb-2.5 [&_h2]:text-stone-800 dark:[&_h2]:text-slate-100 [&_h2]:leading-[1.3]",
              "[&_h3]:text-lg [&_h3]:font-bold [&_h3]:mt-3 [&_h3]:mb-2 [&_h3]:text-stone-700 dark:[&_h3]:text-slate-200 [&_h3]:leading-[1.4]",
              "[&_img]:cursor-pointer [&_img]:transition-all [&_img]:duration-300 [&_img]:shadow-md [&_img:hover]:shadow-lg [&_img]:rounded-xl [&_img]:inline-block [&_img]:max-w-full [&_img]:h-auto [&_img]:object-contain [&_img]:align-top",
              "[&_table]:w-full [&_table]:max-w-full [&_table]:my-4 [&_table]:border-collapse [&_table]:table-fixed [&_table_td]:border [&_table_td]:border-stone-300 dark:[&_table_td]:border-slate-600 [&_table_td]:p-2.5 [&_table_td]:min-w-[65px]"
            )}
            data-placeholder={placeholder || `撰寫教案內容... (支援貼上與插入圖片、表格與格式)`}
          />

          {/* Image Resize Overlay Box (#11) */}
          {selectedImage && imageRect && !readOnly && (
            <div
              className="absolute border border-dashed border-orange-500 pointer-events-none z-[80]"
              style={{
                top: `${imageRect.top}px`,
                left: `${imageRect.left}px`,
                width: `${imageRect.width}px`,
                height: `${imageRect.height}px`
              }}
            >
              {/* Bottom-right resize handle */}
              <div
                onMouseDown={handleResizeStart}
                onTouchStart={handleResizeStart}
                className="absolute bottom-0 right-0 w-3 h-3 bg-orange-600 border border-white pointer-events-auto cursor-se-resize translate-x-1/2 translate-y-1/2 shadow-md hover:scale-110 active:scale-95 transition-transform"
                title="拖曳以縮放圖片"
              />
            </div>
          )}
          {/* Custom color input tags (hidden) */}
          <input type="color" ref={textColorInputRef} className="sr-only" onChange={handleCustomTextColor} />
          <input type="color" ref={highlightColorInputRef} className="sr-only" onChange={handleCustomHighlightColor} />
        </div>
      </div>
    </div>
  );
}
