import type { LessonPlan } from "@/types/plan";
import { stripHtml } from "@/lib/utils";

const GENERIC_ASCII_FALLBACKS = new Set([
  "lesson-plan.docx",
  "lesson-plan.pdf",
  "plans-export.zip",
  "export.docx",
  "export.pdf",
  "export.zip",
]);

export interface StructuredTextLine {
  type: "heading" | "bullet" | "numbered" | "paragraph";
  text: string;
}

export const stripInvalidXmlChars = (value?: string | null): string =>
  (value || "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");

export const sanitizeFileName = (value: string): string =>
  stripInvalidXmlChars(value)
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120) || "未命名教案";

export const buildPlanBaseFileName = (
  plan: Pick<LessonPlan, "scheduledName" | "activityName">
): string => {
  const scheduled = stripHtml(stripInvalidXmlChars(plan.scheduledName))
    .replace(/\s+/g, " ")
    .trim();
  const activity = stripHtml(stripInvalidXmlChars(plan.activityName))
    .replace(/\s+/g, " ")
    .trim();

  return sanitizeFileName(`${scheduled || "教案"}_${activity || "未命名"}`);
};

export const safeDecodeFileName = (raw: string): string => {
  let decoded = raw.trim().replace(/^"(.*)"$/, "$1");
  for (let i = 0; i < 2; i++) {
    if (!/%[0-9A-Fa-f]{2}/.test(decoded)) break;
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      break;
    }
  }
  return decoded;
};

export const parseFileNameFromContentDisposition = (
  contentDisposition: string | null
): string | null => {
  if (!contentDisposition) return null;

  const utf8Match = contentDisposition.match(
    /filename\*\s*=\s*(?:UTF-8|utf-8)''([^;\r\n]+)/i
  );
  if (utf8Match?.[1]) {
    const decoded = safeDecodeFileName(utf8Match[1]);
    if (decoded) return decoded;
  }

  const simpleMatch = contentDisposition.match(
    /filename\s*=\s*(?:"([^"]+)"|([^;\r\n]+))/i
  );
  const rawSimple = simpleMatch?.[1] ?? simpleMatch?.[2];
  if (rawSimple) {
    const decoded = safeDecodeFileName(rawSimple);
    if (decoded) return decoded;
  }

  return null;
};

export const isGenericAsciiFallbackName = (fileName: string): boolean =>
  GENERIC_ASCII_FALLBACKS.has(fileName.trim().toLowerCase());

export const buildContentDispositionHeader = (fileName: string): string => {
  const cleanName = sanitizeFileName(safeDecodeFileName(fileName));
  const dotIndex = cleanName.lastIndexOf(".");
  const ext = dotIndex > 0 ? cleanName.slice(dotIndex) : "";
  const stem = dotIndex > 0 ? cleanName.slice(0, dotIndex) : cleanName;

  const asciiStem = stem
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  const defaultStem = ext.toLowerCase() === ".zip" ? "plans-export" : "lesson-plan";
  const asciiFallback = `${asciiStem || defaultStem}${ext}`;

  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(cleanName)}`;
};

export const deduplicateFileName = (
  baseName: string,
  ext: string,
  usedNames: Set<string>
): string => {
  const normalizedExt = ext.startsWith(".") ? ext : `.${ext}`;
  let candidate = `${baseName}${normalizedExt}`;
  let counter = 2;
  while (usedNames.has(candidate.toLowerCase())) {
    candidate = `${baseName} (${counter})${normalizedExt}`;
    counter++;
  }
  usedNames.add(candidate.toLowerCase());
  return candidate;
};

export const resolvePlanMembers = (
  plan: Pick<LessonPlan, "members" | "leadMember" | "assistantMember">
): string => {
  const direct = stripHtml(stripInvalidXmlChars(plan.members)).trim();
  if (direct) return direct;
  const parts = [
    stripHtml(stripInvalidXmlChars(plan.leadMember)).trim(),
    stripHtml(stripInvalidXmlChars(plan.assistantMember)).trim(),
  ].filter(Boolean);
  return parts.join("、") || "無";
};

const decodeHtmlEntities = (input: string): string =>
  input
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : "";
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = parseInt(dec, 10);
      return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : "";
    });

const cleanInlineFragment = (html: string): string =>
  decodeHtmlEntities(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]*>/g, "")
  )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

export const htmlToStructuredLines = (html?: string | null): StructuredTextLine[] => {
  const raw = stripInvalidXmlChars(html)
    .replace(/<(script|style|object|embed|iframe)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .trim();
  if (!raw) return [];

  // Normalize ordered and unordered lists into explicit tagged tokens before block splitting
  let normalized = raw.replace(/<ol\b[^>]*>([\s\S]*?)<\/ol>/gi, (_, inner: string) => {
    let index = 1;
    return inner.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_m, liInner: string) => {
      const marker = `\n__OL_ITEM__${index++}. ${cleanInlineFragment(liInner)}\n`;
      return marker;
    });
  });

  normalized = normalized.replace(/<ul\b[^>]*>([\s\S]*?)<\/ul>/gi, (_, inner: string) =>
    inner.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_m, liInner: string) => {
      return `\n__UL_ITEM__• ${cleanInlineFragment(liInner)}\n`;
    })
  );

  // Stray <li> outside <ul>/<ol>
  normalized = normalized.replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_m, liInner: string) => {
    return `\n__UL_ITEM__• ${cleanInlineFragment(liInner)}\n`;
  });

  // Table rows into readable pipe-separated lines
  normalized = normalized.replace(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi, (_, trInner: string) => {
    const cells: string[] = [];
    trInner.replace(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi, (_m, cellHtml: string) => {
      const cellText = cleanInlineFragment(cellHtml).replace(/\n+/g, " ");
      if (cellText) cells.push(cellText);
      return "";
    });
    return cells.length > 0 ? `\n${cells.join(" | ")}\n` : "\n";
  });

  // Headings
  normalized = normalized.replace(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi, (_, hInner: string) => {
    const text = cleanInlineFragment(hInner);
    return text ? `\n__HEADING__${text}\n` : "\n";
  });

  // Block boundaries
  normalized = normalized
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|blockquote|pre|section|article|table|tbody|thead)>/gi, "\n")
    .replace(/<(p|div|blockquote|pre|section|article)\b[^>]*>/gi, "\n");

  const stripped = decodeHtmlEntities(normalized.replace(/<[^>]*>/g, ""));
  const lines = stripped.split(/\r?\n/);
  const result: StructuredTextLine[] = [];

  for (const rawLine of lines) {
    const line = rawLine.replace(/[ \t]+/g, " ").trim();
    if (!line) continue;

    if (line.startsWith("__HEADING__")) {
      const text = line.slice("__HEADING__".length).trim();
      if (text) result.push({ type: "heading", text });
    } else if (line.startsWith("__OL_ITEM__")) {
      const text = line.slice("__OL_ITEM__".length).trim();
      if (text) result.push({ type: "numbered", text });
    } else if (line.startsWith("__UL_ITEM__")) {
      const text = line.slice("__UL_ITEM__".length).trim();
      if (text) result.push({ type: "bullet", text });
    } else {
      result.push({ type: "paragraph", text: line });
    }
  }

  return result;
};

export const htmlToPlainText = (html?: string | null): string => {
  const blocks = htmlToStructuredLines(html);
  if (blocks.length > 0) {
    return blocks.map((b) => b.text).join("\n");
  }
  return stripHtml(stripInvalidXmlChars(html)).trim();
};
