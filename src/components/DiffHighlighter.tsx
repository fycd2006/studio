"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { computeDiff } from "@/lib/text-diff";
import { parseEditorHtml } from "@/lib/editor-html";
import type { PropItem } from "@/types/plan";

const addedStyle = "rounded-sm bg-emerald-100 text-emerald-950 no-underline dark:bg-emerald-500/25 dark:text-emerald-100";
const removedStyle = "rounded-sm bg-rose-50 text-rose-800 line-through dark:bg-rose-500/20 dark:text-rose-200";

function richDiff(before: string, after: string) {
  const oldDocument = parseEditorHtml(before);
  const newDocument = parseEditorHtml(after);
  const oldText = oldDocument.content.textContent ?? "";
  const newText = newDocument.content.textContent ?? "";
  const structuralChange = oldText === newText && oldDocument.innerHTML !== newDocument.innerHTML;
  if (oldText === newText) return { html: newDocument.innerHTML, structuralChange };

  const segments = computeDiff(oldText, newText);
  const walker = document.createTreeWalker(newDocument.content, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text);
  if (textNodes.length === 0) {
    const empty = document.createTextNode("");
    newDocument.content.append(empty);
    textNodes.push(empty);
  }

  let index = 0;
  let offset = 0;
  for (const [nodeIndex, node] of textNodes.entries()) {
    const replacement = document.createDocumentFragment();
    let remaining = node.length;
    while (index < segments.length) {
      const segment = segments[index];
      if (remaining === 0 && !(nodeIndex === textNodes.length - 1 && segment.type === "remove")) break;
      const length = segment.type === "remove" ? segment.text.length : Math.min(remaining, segment.text.length - offset);
      const text = segment.text.slice(offset, offset + length);
      if (segment.type === "same") {
        replacement.append(text);
      } else {
        const mark = document.createElement(segment.type === "add" ? "ins" : "del");
        mark.className = segment.type === "add" ? addedStyle : removedStyle;
        mark.setAttribute("data-version-change", "");
        mark.textContent = text;
        replacement.append(mark);
      }
      if (segment.type !== "remove") remaining -= length;
      offset += length;
      if (offset >= segment.text.length) {
        index++;
        offset = 0;
      }
    }
    node.replaceWith(replacement);
  }

  return { html: newDocument.innerHTML, structuralChange };
}

type DiffHighlighterProps =
  | { type: "text" | "markdown"; oldValue?: string; newValue?: string }
  | { type: "table"; oldValue?: PropItem[]; newValue?: PropItem[] };

function propsText(items: PropItem[] = []) {
  return items.map(({ name, quantity, unit, remarks, isFromClub, isToPurchase }) =>
    [name, [quantity, unit].filter(Boolean).join(" "), remarks, isFromClub && "社團已有", isToPurchase && "待購買"]
      .filter(Boolean).join(" · ")
  ).join("\n");
}

export function DiffHighlighter(props: DiffHighlighterProps) {
  const { type } = props;
  const before = props.type === "table" ? propsText(props.oldValue) : props.oldValue ?? "";
  const after = props.type === "table" ? propsText(props.newValue) : props.newValue ?? "";
  const rich = useMemo(() => type === "markdown" && typeof document !== "undefined"
    ? richDiff(before, after)
    : null, [type, before, after]);

  const markup = useMemo(() => rich ? { __html: rich.html } : undefined, [rich]);

  return (
    <div className="min-w-0 overflow-x-auto rounded-lg border bg-background/60 px-3 py-2 leading-relaxed">
      {rich ? (
        <>
          {rich.structuralChange && (
            <p data-version-change className="mb-2 text-xs font-medium text-orange-700 dark:text-amber-300">
              排版或圖片已變更
            </p>
          )}
          <div className="prose prose-sm max-w-none break-words dark:prose-invert [&_img]:h-auto [&_img]:max-w-full [&_ol]:list-inside [&_ol]:list-decimal [&_ul]:list-inside [&_ul]:list-disc [&_table]:w-full [&_table]:table-fixed [&_td]:border [&_th]:border [&_td]:p-2 [&_th]:p-2"
            dangerouslySetInnerHTML={markup} />
        </>
      ) : (
        <div className="whitespace-pre-wrap break-words">
          {computeDiff(before, after).map((segment, index) => {
            if (segment.type === "same") return <span key={index}>{segment.text}</span>;
            const Tag = segment.type === "add" ? "ins" : "del";
            return <Tag key={index} data-version-change className={cn(segment.type === "add" ? addedStyle : removedStyle)}>{segment.text}</Tag>;
          })}
        </div>
      )}
    </div>
  );
}
