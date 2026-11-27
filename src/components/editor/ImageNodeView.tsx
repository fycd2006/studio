"use client";

import React, { useRef } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { AlignCenter, AlignLeft, AlignRight, Sparkles, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const WIDTH_PRESETS = ["25%", "50%", "75%", "100%"] as const;

export function ImageNodeView({
  node,
  selected,
  editor,
  getPos,
  updateAttributes,
  deleteNode,
}: NodeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isEditable = editor.isEditable;

  const src = String(node.attrs.src || "");
  const alt = String(node.attrs.alt || "");
  const title = node.attrs.title ? String(node.attrs.title) : undefined;
  const width = node.attrs.width ? String(node.attrs.width) : "75%";
  const align = (node.attrs.align as "left" | "center" | "right") || "center";
  const rounded = node.attrs.rounded !== false;
  const shadow = Boolean(node.attrs.shadow ?? false);

  const wrapperAlignClass =
    align === "left"
      ? "mr-auto ml-0"
      : align === "right"
        ? "ml-auto mr-0"
        : "mx-auto";

  const selectThisImage = () => {
    if (!isEditable) return;
    if (typeof getPos === "function") {
      const pos = getPos();
      if (typeof pos === "number") {
        editor.chain().focus().setNodeSelection(pos).run();
      }
    }
  };

  const startResize = (event: React.PointerEvent<HTMLDivElement>, direction: -1 | 1) => {
    if (!isEditable) return;
    event.preventDefault();
    event.stopPropagation();

    const el = containerRef.current;
    const proseRoot = editor.view.dom;
    if (!el || !proseRoot) return;

    const handle = event.currentTarget;
    const startX = event.clientX;
    const startWidth = el.getBoundingClientRect().width;
    const rootStyle = getComputedStyle(proseRoot);
    const maxPx =
      proseRoot.clientWidth -
      parseFloat(rootStyle.paddingLeft || "0") -
      parseFloat(rootStyle.paddingRight || "0");

    handle.setPointerCapture(event.pointerId);

    const onMove = (moveEvent: PointerEvent) => {
      const delta = (moveEvent.clientX - startX) * direction;
      const nextPx = Math.round(Math.min(Math.max(64, startWidth + delta), Math.max(120, maxPx)));
      updateAttributes({ width: `${nextPx}px` });
    };

    const onEnd = () => {
      handle.removeEventListener("pointermove", onMove);
    };

    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("lostpointercapture", onEnd, { once: true });
  };

  return (
    <NodeViewWrapper className="my-3 select-none" data-drag-handle>
      <div
        ref={containerRef}
        style={{ width, maxWidth: "100%" }}
        onClick={selectThisImage}
        className={cn(
          "group/img relative block transition-shadow",
          wrapperAlignClass,
          selected && isEditable && "rounded-lg ring-2 ring-orange-500/60 ring-offset-2 ring-offset-background",
        )}
      >
        <img
          src={src}
          alt={alt}
          title={title}
          draggable={false}
          className={cn(
            "block h-auto w-full object-contain",
            rounded ? "rounded-lg" : "rounded-none",
            shadow && "shadow-lg",
            isEditable && "cursor-pointer",
          )}
        />

        {isEditable && selected && (
          <>
            {/* Left & Right resize pills */}
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="向左調整圖片寬度"
              onPointerDown={(e) => startResize(e, -1)}
              className="absolute left-1.5 top-1/2 z-20 h-10 w-1.5 -translate-y-1/2 cursor-ew-resize rounded-full bg-orange-500/90 shadow-md ring-1 ring-white/80 transition-transform hover:scale-110"
            />
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="向右調整圖片寬度"
              onPointerDown={(e) => startResize(e, 1)}
              className="absolute right-1.5 top-1/2 z-20 h-10 w-1.5 -translate-y-1/2 cursor-ew-resize rounded-full bg-orange-500/90 shadow-md ring-1 ring-white/80 transition-transform hover:scale-110"
            />

            {/* Floating Image Toolbar anchored cleanly inside bottom edge so sticky header never clips it */}
            <div
              data-editor-floating
              contentEditable={false}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-2.5 left-1/2 z-30 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-0.5 overflow-x-auto whitespace-nowrap rounded-xl border border-stone-200/80 bg-white/95 p-1 text-foreground shadow-lg backdrop-blur-xl no-scrollbar dark:border-white/15 dark:bg-[#14191C]/95"
            >
              {WIDTH_PRESETS.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => updateAttributes({ width: preset })}
                  className={cn(
                    "h-7 rounded-lg px-2 font-mono text-[11px]",
                    width === preset && "bg-orange-500/15 text-orange-700 dark:text-orange-300",
                  )}
                >
                  {preset}
                </Button>
              ))}
              <div className="mx-0.5 h-4 w-px bg-border" />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="圖片靠左"
                onClick={() => updateAttributes({ align: "left" })}
                className={cn(
                  "h-7 w-7 rounded-lg",
                  align === "left" && "bg-orange-500/15 text-orange-700 dark:text-orange-300",
                )}
              >
                <AlignLeft className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="圖片置中"
                onClick={() => updateAttributes({ align: "center" })}
                className={cn(
                  "h-7 w-7 rounded-lg",
                  align === "center" && "bg-orange-500/15 text-orange-700 dark:text-orange-300",
                )}
              >
                <AlignCenter className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="圖片靠右"
                onClick={() => updateAttributes({ align: "right" })}
                className={cn(
                  "h-7 w-7 rounded-lg",
                  align === "right" && "bg-orange-500/15 text-orange-700 dark:text-orange-300",
                )}
              >
                <AlignRight className="size-3.5" />
              </Button>
              <div className="mx-0.5 h-4 w-px bg-border" />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="切換圓角"
                title="切換圓角"
                onClick={() => updateAttributes({ rounded: !rounded })}
                className={cn(
                  "h-7 w-7 rounded-lg",
                  rounded && "bg-orange-500/15 text-orange-700 dark:text-orange-300",
                )}
              >
                <Square className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="切換陰影"
                title="切換陰影"
                onClick={() => updateAttributes({ shadow: !shadow })}
                className={cn(
                  "h-7 w-7 rounded-lg",
                  shadow && "bg-orange-500/15 text-orange-700 dark:text-orange-300",
                )}
              >
                <Sparkles className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="刪除圖片"
                title="刪除圖片"
                onClick={() => deleteNode()}
                className="h-7 w-7 rounded-lg text-rose-600 hover:bg-rose-500/10 hover:text-rose-700"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </>
        )}
      </div>
    </NodeViewWrapper>
  );
}
