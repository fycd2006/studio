import { mergeAttributes, Node } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import { ReactNodeViewRenderer, type Editor } from "@tiptap/react";
import { CellSelection, TableMap, cellAround } from "@tiptap/pm/tables";
import { ImageNodeView } from "./ImageNodeView";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      toggleCallout: (attrs?: { tone?: "tip" | "info" | "warning" }) => ReturnType;
    };
  }
}

export const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: "75%",
        parseHTML: (element) => {
          const el = element as HTMLElement;
          return el.style.width || el.getAttribute("width") || "75%";
        },
        renderHTML: () => ({}),
      },
      align: {
        default: "center",
        parseHTML: (element) => {
          const el = element as HTMLElement;
          if (el.style.marginLeft === "0px" && el.style.marginRight === "auto") return "left";
          if (el.style.marginLeft === "auto" && el.style.marginRight === "0px") return "right";
          return el.getAttribute("data-align") || "center";
        },
        renderHTML: (attributes) => ({
          "data-align": attributes.align || "center",
        }),
      },
      rounded: {
        default: true,
        parseHTML: (element) => {
          const el = element as HTMLElement;
          return el.style.borderRadius !== "0px";
        },
        renderHTML: () => ({}),
      },
      shadow: {
        default: false,
        parseHTML: (element) => {
          const el = element as HTMLElement;
          return Boolean(el.style.boxShadow && el.style.boxShadow !== "none");
        },
        renderHTML: () => ({}),
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    const align = (HTMLAttributes["data-align"] as string) || "center";
    const width = (HTMLAttributes.width as string) || "75%";
    const rounded = HTMLAttributes.rounded !== false;
    const shadow = Boolean(HTMLAttributes.shadow);
    const margin =
      align === "left"
        ? "12px auto 12px 0px"
        : align === "right"
          ? "12px 0px 12px auto"
          : "12px auto";

    const styleParts = [
      `width: ${width}`,
      "max-width: 100%",
      "height: auto",
      "display: block",
      `margin: ${margin}`,
      `border-radius: ${rounded ? "8px" : "0px"}`,
    ];
    if (shadow) {
      styleParts.push("box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.16)");
    }

    return [
      "img",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        style: styleParts.join("; "),
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },
});

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      tone: {
        default: "tip",
        parseHTML: (element) => element.getAttribute("data-callout") || "tip",
        renderHTML: (attributes) => ({
          "data-callout": attributes.tone || "tip",
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-callout]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { class: "editor-callout" }),
      0,
    ];
  },

  addCommands() {
    return {
      toggleCallout:
        (attrs) =>
        ({ commands }) => {
          return commands.toggleWrap(this.name, attrs);
        },
    };
  },
});

/**
 * Convert legacy `<font color="..." face="...">` tags produced by `execCommand`
 * into `<span style="...">` so Tiptap TextStyle marks preserve them seamlessly.
 */
export function normalizeLegacyHtml(html: string): string {
  if (!html || typeof document === "undefined") return html;
  if (!/<font\b/i.test(html)) return html;

  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  for (const font of Array.from(tpl.content.querySelectorAll("font"))) {
    const span = document.createElement("span");
    const color = font.getAttribute("color");
    const face = font.getAttribute("face");
    const existingStyle = font.getAttribute("style");
    if (existingStyle) span.setAttribute("style", existingStyle);
    if (color) span.style.color = color;
    if (face) span.style.fontFamily = face;
    while (font.firstChild) {
      span.appendChild(font.firstChild);
    }
    font.replaceWith(span);
  }
  return tpl.innerHTML;
}

/**
 * Select the current table cell and its immediate right neighbor, then merge them.
 */
export function mergeCellRight(editor: Editor): boolean {
  const { state, view } = editor;
  const $cell = cellAround(state.selection.$anchor);
  if (!$cell) return false;

  const table = $cell.node(-1);
  const tableStart = $cell.start(-1);
  const map = TableMap.get(table);
  const rect = map.findCell($cell.pos - tableStart);

  if (rect.right >= map.width) return false;

  const rightCellRelPos = map.positionAt(rect.top, rect.right, table);
  const rightCellPos = tableStart + rightCellRelPos;
  const selection = CellSelection.create(state.doc, $cell.pos, rightCellPos);
  view.dispatch(state.tr.setSelection(selection));
  return editor.chain().focus().mergeCells().run();
}
