"use client";

import React, { useState } from "react";
import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import {
  Bold,
  Code,
  Eraser,
  Highlighter,
  Italic,
  Link as LinkIcon,
  Strikethrough,
  Underline,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const bubbleBtnClass = "h-7 w-7 rounded-md";
const bubbleActiveClass = "bg-orange-500/15 text-orange-700 dark:text-orange-300";

export function EditorBubbleMenu({ editor }: { editor: Editor | null }) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  if (!editor) return null;

  const applyLink = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = linkUrl.trim();
    if (!trimmed) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      setLinkOpen(false);
      return;
    }
    try {
      const resolved = new URL(trimmed, window.location.href);
      if (!["https:", "http:", "mailto:"].includes(resolved.protocol)) return;
      editor.chain().focus().extendMarkRange("link").setLink({ href: resolved.href }).run();
      setLinkOpen(false);
    } catch {
      // Ignore invalid URLs
    }
  };

  return (
    <BubbleMenu
      editor={editor}
      appendTo={() => document.body}
      shouldShow={({ editor: currentEditor, state }) => {
        if (!currentEditor.isEditable) return false;
        const { from, to } = state.selection;
        if (from === to) return false;
        if (currentEditor.isActive("image") || currentEditor.isActive("codeBlock")) return false;
        const selectedText = state.doc.textBetween(from, to, "").trim();
        return selectedText.length > 0;
      }}
      options={{ strategy: "fixed", placement: "top", offset: 8 }}
    >
      <div
        data-editor-floating
        data-editor-format-control=""
        onMouseDown={(e) => {
          if (!(e.target instanceof Element && e.target.closest("input"))) {
            e.preventDefault();
          }
        }}
        className="z-[120] flex items-center gap-0.5 rounded-xl border border-stone-200/80 bg-white/95 p-1 text-foreground shadow-xl backdrop-blur-xl dark:border-white/15 dark:bg-[#14191C]/95"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="浮動粗體"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn(bubbleBtnClass, editor.isActive("bold") && bubbleActiveClass)}
        >
          <Bold className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="浮動斜體"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn(bubbleBtnClass, editor.isActive("italic") && bubbleActiveClass)}
        >
          <Italic className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="浮動底線"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={cn(bubbleBtnClass, editor.isActive("underline") && bubbleActiveClass)}
        >
          <Underline className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="浮動刪除線"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={cn(bubbleBtnClass, editor.isActive("strike") && bubbleActiveClass)}
        >
          <Strikethrough className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="浮動醒目提示"
          onClick={() => editor.chain().focus().toggleHighlight({ color: "#fef08a" }).run()}
          className={cn(bubbleBtnClass, editor.isActive("highlight") && bubbleActiveClass)}
        >
          <Highlighter className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="浮動程式碼"
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={cn(bubbleBtnClass, editor.isActive("code") && bubbleActiveClass)}
        >
          <Code className="size-3.5" />
        </Button>

        <Popover
          open={linkOpen}
          onOpenChange={(open) => {
            setLinkOpen(open);
            if (open) {
              setLinkUrl(String(editor.getAttributes("link").href || ""));
            }
          }}
        >
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="浮動連結"
              className={cn(bubbleBtnClass, editor.isActive("link") && bubbleActiveClass)}
            >
              <LinkIcon className="size-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            data-editor-format-control=""
            align="center"
            className="z-[130] w-60 rounded-xl border border-stone-200/80 bg-white/95 p-2.5 shadow-xl backdrop-blur-xl dark:border-white/15 dark:bg-[#14191C]/95"
          >
            <form onSubmit={applyLink} className="flex gap-1.5">
              <Input
                type="url"
                placeholder="https://..."
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className="h-8 text-xs"
              />
              <Button type="submit" size="sm" className="h-8 shrink-0 px-2.5 text-xs">
                套用
              </Button>
            </form>
          </PopoverContent>
        </Popover>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="浮動清除格式"
          onClick={() => editor.chain().focus().unsetAllMarks().run()}
          className={bubbleBtnClass}
        >
          <Eraser className="size-3.5" />
        </Button>
      </div>
    </BubbleMenu>
  );
}
