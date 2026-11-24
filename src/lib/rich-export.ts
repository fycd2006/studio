import { parseFragment, type DefaultTreeAdapterTypes } from "parse5";
import { stripInvalidXmlChars } from "@/lib/export-filename";

type Node = DefaultTreeAdapterTypes.ChildNode;
type Element = DefaultTreeAdapterTypes.Element;

export type RichAlignment = "left" | "center" | "right" | "justify";
export interface RichStyle {
  font?: string;
  size?: number;
  color?: string;
  background?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
}
export interface RichRun extends RichStyle { text: string }
interface RichParagraph {
  type: "paragraph";
  align: RichAlignment;
  runs: RichRun[];
  list?: { type: "bullet" | "number"; index: number; group: number; level: number };
}
export interface RichImage {
  type: "image";
  src: string;
  alt: string;
  align: RichAlignment;
  width?: string;
  naturalWidth?: number;
  naturalHeight?: number;
}
export interface RichCell {
  blocks: RichBlock[];
  columns: number;
  rows: number;
  header: boolean;
  align: RichAlignment;
}
export interface RichTable {
  type: "table";
  rows: RichCell[][];
  widths: Array<string | undefined>;
}
export type RichBlock = RichParagraph | RichImage | RichTable;

const blockTags = new Set(["div", "p", "blockquote", "pre", "section", "article", "h1", "h2", "h3", "h4", "h5", "h6"]);
const discarded = new Set(["iframe", "math", "noscript", "object", "script", "style", "svg", "template"]);
const legacyFontSizes = [12, 14, 16, 18, 20, 24, 32];
const defaultColor = "1E293B";
const isElement = (node: Node): node is Element => "tagName" in node;
const attribute = (node: Element, name: string) => node.attrs.find((entry) => entry.name === name)?.value;
const isAlignment = (value?: string): value is RichAlignment =>
  value === "left" || value === "center" || value === "right" || value === "justify";

function declarations(node: Element) {
  const map = new Map<string, string>();
  for (const part of (attribute(node, "style") ?? "").split(";")) {
    const separator = part.indexOf(":");
    if (separator > 0) map.set(part.slice(0, separator).trim().toLowerCase(), part.slice(separator + 1).trim());
  }
  return map;
}

function color(value?: string) {
  if (!value) return undefined;
  const hex = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(value)?.[1];
  if (hex) return (hex.length === 3 ? [...hex].map((digit) => digit + digit).join("") : hex).toUpperCase();
  const rgb = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i.exec(value);
  if (rgb && rgb.slice(1).every((channel) => Number(channel) <= 255)) {
    return rgb.slice(1).map((channel) => Number(channel).toString(16).padStart(2, "0")).join("").toUpperCase();
  }
  const names: Record<string, string> = { black: "000000", blue: "0000FF", green: "008000", red: "FF0000", white: "FFFFFF", yellow: "FFFF00" };
  return names[value.toLowerCase()];
}

function length(value?: string) {
  return value && /^\d+(?:\.\d+)?(?:%|px)?$/.test(value) ? value : undefined;
}

function wholeNumber(value?: string) {
  const parsed = value && /^\d{1,5}$/.test(value) ? Number(value) : 0;
  return parsed > 0 ? parsed : undefined;
}

function inlineStyle(node: Element, parent: RichStyle, css: Map<string, string>): RichStyle {
  const attrs = (name: string) => attribute(node, name);
  const style = { ...parent };
  const family = css.get("font-family") || attrs("face");
  if (family) style.font = family.startsWith("var(") ? undefined : family.split(",")[0].replace(/["']/g, "").trim().slice(0, 80);
  const size = /^(\d+(?:\.\d+)?)(px|pt)$/.exec(css.get("font-size") ?? "");
  const legacySize = node.tagName === "font" ? legacyFontSizes[Number(attrs("size")) - 1] : undefined;
  if (size) style.size = Math.min(120, Math.max(6, Number(size[1]) * (size[2] === "pt" ? 4 / 3 : 1)));
  else if (legacySize) style.size = legacySize;
  if (/^h[1-6]$/.test(node.tagName)) {
    style.size ??= [24, 20, 18, 16, 14, 14][Number(node.tagName[1]) - 1];
    style.bold = true;
  }
  const foreground = css.get("color") || attrs("color");
  if (foreground) style.color = foreground.startsWith("var(") ? defaultColor : color(foreground) ?? style.color;
  const background = css.get("background-color") || css.get("background");
  if (background) style.background = color(background);
  if (node.tagName === "mark") style.background ??= "FFFF00";
  const weight = css.get("font-weight");
  if (weight) style.bold = weight === "bold" || Number(weight) >= 600;
  else if (["b", "strong", "th"].includes(node.tagName)) style.bold = true;
  if (css.has("font-style")) style.italic = /italic|oblique/.test(css.get("font-style") ?? "");
  else if (node.tagName === "i" || node.tagName === "em") style.italic = true;
  if (node.tagName === "u") style.underline = true;
  if (["s", "strike"].includes(node.tagName)) style.strike = true;
  const decoration = css.get("text-decoration") || css.get("text-decoration-line");
  if (decoration) {
    style.underline = decoration.includes("underline");
    style.strike = decoration.includes("line-through");
  }
  return style;
}

export function parseRichBlocks(html?: string | null): RichBlock[] {
  let listGroup = 0;
  function collect(nodes: Node[], inherited: RichStyle = {}, alignment: RichAlignment = "left"): RichBlock[] {
    const blocks: RichBlock[] = [];
    let runs: RichRun[] = [];
    const emit = () => {
      if (runs.some(({ text }) => text.trim() || text.includes("\n"))) blocks.push({ type: "paragraph", align: alignment, runs });
      runs = [];
    };
    const walk = (node: Node, style: RichStyle) => {
      if (node.nodeName === "#text" && "value" in node) {
        const text = stripInvalidXmlChars(node.value).replace(/\u200b/g, "").replace(/[\t\r\n]+/g, " ");
        if (text) runs.push({ ...style, text });
        return;
      }
      if (!isElement(node) || discarded.has(node.tagName) || node.namespaceURI !== "http://www.w3.org/1999/xhtml") return;
      const css = declarations(node);
      const nextStyle = inlineStyle(node, style, css);
      const rawAlign = css.get("text-align") || attribute(node, "align");
      const align = isAlignment(rawAlign) ? rawAlign : alignment;
      const tag = node.tagName;

      if (tag === "br") {
        runs.push({ ...style, text: "\n" });
      } else if (tag === "img") {
        emit();
        const src = attribute(node, "src") || "";
        if (!src) return;
        const margins = (css.get("margin") ?? "").split(/\s+/);
        const left = css.get("margin-left") ?? (margins[3] ?? margins[1]);
        const right = css.get("margin-right") ?? margins[1];
        const imageAlign = left === "auto" ? (right === "auto" ? "center" : "right") : right === "auto" ? "left" : align;
        blocks.push({ type: "image", src, align: imageAlign, alt: stripInvalidXmlChars(attribute(node, "alt")) || "圖片",
          width: length(css.get("width")) || length(attribute(node, "width")),
          naturalWidth: wholeNumber(attribute(node, "width")), naturalHeight: wholeNumber(attribute(node, "height")) });
      } else if (tag === "table") {
        emit();
        const children = node.childNodes.filter(isElement);
        const rawRows = children.flatMap((child) => child.tagName === "tr" ? [child] :
          ["tbody", "thead", "tfoot"].includes(child.tagName) ? child.childNodes.filter(isElement).filter((row) => row.tagName === "tr") : []);
        const widths = children.filter((child) => child.tagName === "colgroup")
          .flatMap((group) => group.childNodes.filter(isElement).flatMap((column) =>
            Array<string | undefined>(Math.min(40, wholeNumber(attribute(column, "span")) ?? 1))
              .fill(length(declarations(column).get("width")) || length(attribute(column, "width")))));
        const rows = rawRows.map((row, rowIndex) => row.childNodes.filter(isElement)
          .filter((cell) => cell.tagName === "td" || cell.tagName === "th")
          .map((cell): RichCell => {
            const cellCss = declarations(cell);
            const cellAlign = cellCss.get("text-align") || attribute(cell, "align");
            const alignment = isAlignment(cellAlign) ? cellAlign : cell.tagName === "th" ? "center" : align;
            return {
              align: alignment, header: cell.tagName === "th",
              columns: Math.min(40, wholeNumber(attribute(cell, "colspan")) ?? 1),
              rows: Math.min(rawRows.length - rowIndex, wholeNumber(attribute(cell, "rowspan")) ?? 1),
              blocks: collect(cell.childNodes, inlineStyle(cell, nextStyle, cellCss), alignment),
            };
          }));
        if (rows.length) blocks.push({ type: "table", rows, widths });
      } else if (tag === "ol" || tag === "ul") {
        emit();
        const group = ++listGroup;
        let index = wholeNumber(attribute(node, "start")) ?? 1;
        for (const item of node.childNodes.filter(isElement).filter((child) => child.tagName === "li")) {
          const itemCss = declarations(item);
          const itemAlign = itemCss.get("text-align");
          const nested = collect(item.childNodes, inlineStyle(item, nextStyle, itemCss), isAlignment(itemAlign) ? itemAlign : align);
          const first = nested.find((block): block is RichParagraph => block.type === "paragraph" && !block.list);
          if (first) first.list = { type: tag === "ol" ? "number" : "bullet", index, group, level: 0 };
          for (const block of nested) if (block.type === "paragraph" && block.list?.group !== group && block.list) block.list.level++;
          blocks.push(...nested);
          index++;
        }
      } else if (blockTags.has(tag) || align !== alignment) {
        emit();
        blocks.push(...collect(node.childNodes, nextStyle, align));
      } else {
        node.childNodes.forEach((child) => walk(child, nextStyle));
      }
    };
    nodes.forEach((node) => walk(node, inherited));
    emit();
    return blocks;
  }
  return collect(parseFragment(html ?? "").childNodes);
}

export function imageDisplayWidth(width: string | undefined, available: number, naturalWidth = available) {
  const raw = width ? parseFloat(width) : naturalWidth;
  return Math.min(available, Math.max(1, width?.endsWith("%") ? available * raw / 100 : raw));
}

export function richBlockText(block: RichBlock): string {
  if (block.type === "paragraph") return block.runs.map(({ text }) => text).join("");
  if (block.type === "image") return "[" + block.alt + "]";
  return block.rows.map((row) => row.map((cell) => cell.blocks.map(richBlockText).join("\n")).join(" | ")).join("\n");
}

export function decodeRichImage(source: string) {
  const data = /^data:image\/(png|jpeg|jpg);base64,([A-Za-z0-9+/=]+)$/i.exec(source);
  if (!data || data[2].length > 1_400_000) return null;
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(atob(data[2]), (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length >= 24 && view.getUint32(0) === 0x89504e47 && view.getUint32(12) === 0x49484452) {
    const width = view.getUint32(16);
    const height = view.getUint32(20);
    return width && height ? { bytes, type: "png" as const, width, height } : null;
  }
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  const frameMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  let offset = 2;
  while (offset + 8 < bytes.length && bytes[offset] === 0xff) {
    const marker = bytes[offset + 1];
    if (marker === 0xff) {
      offset++;
      continue;
    }
    const length = view.getUint16(offset + 2);
    if (length < 2 || offset + 2 + length > bytes.length || marker === 0xda) break;
    if (frameMarkers.has(marker) && length >= 8) {
      const height = view.getUint16(offset + 5);
      const width = view.getUint16(offset + 7);
      return width && height ? { bytes, type: "jpg" as const, width, height } : null;
    }
    offset += 2 + length;
  }
  return null;
}
