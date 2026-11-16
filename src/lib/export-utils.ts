import { LessonPlan } from "@/types/plan";
import { stripHtml } from "@/lib/utils";
import {
  buildPlanBaseFileName,
  htmlToPlainText,
  htmlToStructuredLines,
  isGenericAsciiFallbackName,
  parseFileNameFromContentDisposition,
  resolvePlanMembers,
  safeDecodeFileName,
  sanitizeFileName,
  stripInvalidXmlChars,
} from "@/lib/export-filename";

type DocxModule = typeof import("docx");

const PRIMARY_COLOR = "E67E22"; // 活力橘風格
const TEXT_COLOR = "1E293B"; // Slate-800
const BORDER_COLOR = "CBD5E1"; // Slate-300
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const PDF_MIME = "application/pdf";
const ZIP_MIME = "application/zip";
const FILE_PICKER_ERROR_ABORT = "AbortError";

const ensureFileExtension = (fileName: string, ext: string) => {
  const normalizedExt = ext.startsWith(".") ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
  if (fileName.toLowerCase().endsWith(normalizedExt)) return fileName;
  return `${fileName}${normalizedExt}`;
};

const normalizeDownloadFileName = (rawName: string, ext: ".docx" | ".pdf" | ".zip") => {
  const decoded = safeDecodeFileName(rawName);
  const withoutExt = decoded.toLowerCase().endsWith(ext)
    ? decoded.slice(0, -ext.length)
    : decoded;
  const cleanStem = sanitizeFileName(withoutExt);
  return ensureFileExtension(cleanStem, ext);
};

const triggerBlobDownload = async (
  source: Blob | BlobPart,
  fileNameWithExt: string,
  mimeType: string,
  fileExtension: ".docx" | ".pdf" | ".zip",
  options?: { useSaveDialog?: boolean }
) => {
  if (typeof window === "undefined") return;

  const cleanMime = mimeType.split(";")[0].trim() || PDF_MIME;
  const blob =
    source instanceof Blob
      ? source.type === cleanMime
        ? source
        : new Blob([source], { type: cleanMime })
      : new Blob([source], { type: cleanMime });

  const fileName = normalizeDownloadFileName(fileNameWithExt, fileExtension);
  const windowAny = window as Window & {
    showSaveFilePicker?: (options: {
      suggestedName?: string;
      types?: Array<{
        description?: string;
        accept: Record<string, string[]>;
      }>;
    }) => Promise<{
      createWritable: () => Promise<{
        write: (data: Blob) => Promise<void>;
        close: () => Promise<void>;
      }>;
    }>;
  };

  // Default to direct anchor download so async generation never fails on expired user activation.
  const useSaveDialog = options?.useSaveDialog ?? false;
  if (useSaveDialog && window.isSecureContext && typeof windowAny.showSaveFilePicker === "function") {
    try {
      const fileHandle = await windowAny.showSaveFilePicker({
        suggestedName: fileName,
        types: [
          {
            description:
              fileExtension === ".docx"
                ? "Word Document"
                : fileExtension === ".pdf"
                  ? "PDF Document"
                  : "ZIP Archive",
            accept: {
              [cleanMime]: [fileExtension],
            },
          },
        ],
      });

      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (error) {
      const domError = error as DOMException;
      if (domError?.name === FILE_PICKER_ERROR_ABORT) {
        return;
      }
      console.warn("showSaveFilePicker failed, fallback to anchor download", error);
    }
  }

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();

  window.setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 10000);
};

async function preparePlanForApi(plan: LessonPlan, canvasImageData?: string): Promise<LessonPlan> {
  let resolvedCanvas = canvasImageData || plan.canvasImage || undefined;
  if (
    !resolvedCanvas &&
    plan.canvasData &&
    typeof plan.canvasData === "string" &&
    plan.canvasData.trim().startsWith("{") &&
    typeof document !== "undefined"
  ) {
    try {
      resolvedCanvas = await renderCanvasJsonToPng(plan.canvasData, plan.canvasHeight || 500);
    } catch (e) {
      console.warn("Failed to render canvas JSON to PNG for export", e);
    }
  }

  // Strip raw canvasData JSON from HTTP payload so large drawings never exceed body limits
  const { canvasData: _omitCanvasData, ...rest } = plan;
  return {
    ...rest,
    canvasData: null,
    canvasImage: resolvedCanvas || null,
  };
}

const downloadByExportApi = async (
  plan: LessonPlan,
  format: "word" | "pdf",
  options?: { useSaveDialog?: boolean },
  canvasImageData?: string
) => {
  if (typeof window === "undefined") return false;

  const payloadPlan = await preparePlanForApi(plan, canvasImageData);
  const response = await fetch("/api/export", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ plan: payloadPlan, format }),
  });

  if (!response.ok) {
    throw new Error(`Export API failed (${response.status})`);
  }

  const fallbackBase = buildPlanBaseFileName(plan);
  const extension: ".docx" | ".pdf" = format === "word" ? ".docx" : ".pdf";
  const fallbackName = `${fallbackBase}${extension}`;
  const resolvedMime =
    response.headers.get("content-type") || (format === "word" ? DOCX_MIME : PDF_MIME);
  const serverName = parseFileNameFromContentDisposition(
    response.headers.get("content-disposition")
  );
  const resolvedFileName =
    serverName && !isGenericAsciiFallbackName(serverName) ? serverName : fallbackName;
  const blob = await response.blob();

  await triggerBlobDownload(blob, resolvedFileName, resolvedMime, extension, options);
  return true;
};

/**
 * Fallback multi-page Traditional Chinese PDF generator using offscreen browser canvas.
 * Ensures Chinese text, props tables, and long plans paginate cleanly even if /api/export is offline.
 */
async function buildFallbackChinesePdfBytes(
  plan: LessonPlan,
  canvasImageData?: string
): Promise<Uint8Array> {
  const PAGE_W = 1190;
  const PAGE_H = 1684;
  const MARGIN_X = 96;
  const MARGIN_TOP = 96;
  const MARGIN_BOTTOM = 104;
  const CONTENT_W = PAGE_W - MARGIN_X * 2;
  const PAGE_BOTTOM = PAGE_H - MARGIN_BOTTOM;
  const FONT_FAMILY =
    '"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", "Heiti TC", sans-serif';

  const pages: Array<{ bytes: Uint8Array; width: number; height: number }> = [];

  const createPageCanvas = () => {
    const canvas = document.createElement("canvas");
    canvas.width = PAGE_W;
    canvas.height = PAGE_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, PAGE_W, PAGE_H);
    return { canvas, ctx };
  };

  let { canvas, ctx } = createPageCanvas();
  let y = MARGIN_TOP;

  const pushPage = () => {
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    const base64 = dataUrl.split(",")[1] || "";
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    pages.push({ bytes, width: PAGE_W, height: PAGE_H });
  };

  const newPage = () => {
    pushPage();
    ({ canvas, ctx } = createPageCanvas());
    y = MARGIN_TOP;
  };

  const ensureSpace = (needed: number) => {
    if (y + needed > PAGE_BOTTOM) {
      newPage();
    }
  };

  const wrapLines = (text: string, maxWidth: number, font: string): string[] => {
    ctx.font = font;
    const lines: string[] = [];
    for (const rawLine of text.split(/\r?\n/)) {
      if (!rawLine) {
        lines.push("");
        continue;
      }
      let current = "";
      for (const ch of Array.from(rawLine)) {
        const next = current + ch;
        if (ctx.measureText(next).width > maxWidth && current) {
          lines.push(current);
          current = ch;
        } else {
          current = next;
        }
      }
      if (current) lines.push(current);
    }
    return lines.length > 0 ? lines : [""];
  };

  const drawWrappedText = (
    text: string,
    x: number,
    maxWidth: number,
    font: string,
    color: string,
    lineHeight: number
  ) => {
    const lines = wrapLines(text, maxWidth, font);
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textBaseline = "top";
    for (const line of lines) {
      ensureSpace(lineHeight);
      ctx.font = font;
      ctx.fillStyle = color;
      ctx.textBaseline = "top";
      ctx.fillText(line, x, y);
      y += lineHeight;
    }
  };

  const scheduledTitle = stripHtml(stripInvalidXmlChars(plan.scheduledName)).trim() || "教案";
  const activityTitle = stripHtml(stripInvalidXmlChars(plan.activityName)).trim() || "未命名教案";
  const fullTitle = `${scheduledTitle} - ${activityTitle}`;
  const isScriptMode = scheduledTitle === "劇本";

  // Title header
  ctx.fillStyle = "#E67E22";
  ctx.fillRect(MARGIN_X, y, 88, 8);
  y += 22;

  drawWrappedText(
    "NTUT CD CAMP // 營隊教案文件",
    MARGIN_X,
    CONTENT_W,
    `bold 18px ${FONT_FAMILY}`,
    "#E67E22",
    28
  );
  y += 4;
  drawWrappedText(fullTitle, MARGIN_X, CONTENT_W, `bold 36px ${FONT_FAMILY}`, "#0F172A", 48);
  y += 12;
  ctx.strokeStyle = "#CBD5E1";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(MARGIN_X, y);
  ctx.lineTo(PAGE_W - MARGIN_X, y);
  ctx.stroke();
  y += 24;

  if (!isScriptMode) {
    const metaLines = [
      `教案成員：${resolvePlanMembers(plan)}`,
      `教案時間：${stripHtml(stripInvalidXmlChars(plan.time)).trim() || "無"}`,
      `教案地點：${stripHtml(stripInvalidXmlChars(plan.location)).trim() || "無"}`,
    ];
    for (const line of metaLines) {
      drawWrappedText(line, MARGIN_X, CONTENT_W, `21px ${FONT_FAMILY}`, "#1E293B", 32);
    }
    y += 18;
  }

  const drawSection = (title: string, html?: string | null) => {
    ensureSpace(90);
    ctx.fillStyle = "#E67E22";
    ctx.fillRect(MARGIN_X, y + 4, 6, 26);
    ctx.font = `bold 25px ${FONT_FAMILY}`;
    ctx.fillStyle = "#0F172A";
    ctx.textBaseline = "top";
    ctx.fillText(title, MARGIN_X + 18, y);
    y += 38;

    ctx.strokeStyle = "#CBD5E1";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(MARGIN_X, y);
    ctx.lineTo(PAGE_W - MARGIN_X, y);
    ctx.stroke();
    y += 16;

    const blocks = htmlToStructuredLines(html);
    if (blocks.length === 0) {
      drawWrappedText("無內容", MARGIN_X, CONTENT_W, `21px ${FONT_FAMILY}`, "#64748B", 32);
      y += 16;
      return;
    }

    for (const block of blocks) {
      if (block.type === "heading") {
        drawWrappedText(block.text, MARGIN_X, CONTENT_W, `bold 22px ${FONT_FAMILY}`, "#0F172A", 34);
        y += 6;
      } else if (block.type === "bullet" || block.type === "numbered") {
        drawWrappedText(
          block.text,
          MARGIN_X + 20,
          CONTENT_W - 20,
          `21px ${FONT_FAMILY}`,
          "#1E293B",
          32
        );
        y += 4;
      } else {
        drawWrappedText(block.text, MARGIN_X, CONTENT_W, `21px ${FONT_FAMILY}`, "#1E293B", 32);
        y += 6;
      }
    }
    y += 18;
  };

  drawSection("【教案目的】", plan.purpose);
  if (!isScriptMode) {
    drawSection("【教案流程】", plan.process);
  }

  const resolvedCanvas = canvasImageData || plan.canvasImage;
  if (resolvedCanvas && typeof resolvedCanvas === "string" && resolvedCanvas.startsWith("data:image/")) {
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = resolvedCanvas;
      });
      const maxImgH = 600;
      const scale = Math.min(CONTENT_W / img.width, maxImgH / img.height);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      ensureSpace(drawH + 80);

      ctx.fillStyle = "#E67E22";
      ctx.fillRect(MARGIN_X, y + 4, 6, 26);
      ctx.font = `bold 25px ${FONT_FAMILY}`;
      ctx.fillStyle = "#0F172A";
      ctx.textBaseline = "top";
      ctx.fillText("【教案視覺圖表】", MARGIN_X + 18, y);
      y += 44;

      ctx.drawImage(img, MARGIN_X + (CONTENT_W - drawW) / 2, y, drawW, drawH);
      y += drawH + 24;
    } catch {
      // ignore invalid canvas image in fallback
    }
  }

  drawSection("【教案內容說明】", plan.content);
  if (!isScriptMode && htmlToStructuredLines(plan.divisionOfLabor).length > 0) {
    drawSection("【分工】", plan.divisionOfLabor);
  }

  // Props table
  const propsRows = (plan.props || []).filter((p) => p.name || p.quantity || p.unit || p.remarks);
  ensureSpace(100);
  ctx.fillStyle = "#E67E22";
  ctx.fillRect(MARGIN_X, y + 4, 6, 26);
  ctx.font = `bold 25px ${FONT_FAMILY}`;
  ctx.fillStyle = "#0F172A";
  ctx.textBaseline = "top";
  ctx.fillText("【道具表】", MARGIN_X + 18, y);
  y += 42;

  if (propsRows.length === 0) {
    drawWrappedText("目前無道具資訊", MARGIN_X, CONTENT_W, `21px ${FONT_FAMILY}`, "#64748B", 32);
    y += 18;
  } else {
    const colWidths = [350, 110, 120, CONTENT_W - 350 - 110 - 120];
    const headers = ["項目名稱", "數量", "單位", "備註"];
    const rowPad = 14;
    const lineH = 28;

    const drawHeader = () => {
      ensureSpace(80);
      let x = MARGIN_X;
      headers.forEach((h, idx) => {
        ctx.fillStyle = "#E67E22";
        ctx.fillRect(x, y, colWidths[idx], 44);
        ctx.font = `bold 20px ${FONT_FAMILY}`;
        ctx.fillStyle = "#FFFFFF";
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        ctx.fillText(h, x + colWidths[idx] / 2, y + 22);
        x += colWidths[idx];
      });
      ctx.textAlign = "left";
      y += 44;
    };

    drawHeader();

    for (let r = 0; r < propsRows.length; r++) {
      const prop = propsRows[r];
      const vals = [
        stripHtml(stripInvalidXmlChars(prop.name)).trim() || "—",
        stripHtml(stripInvalidXmlChars(prop.quantity)).trim() || "—",
        prop.unit === "custom" ? "—" : stripHtml(stripInvalidXmlChars(prop.unit)).trim() || "—",
        stripHtml(stripInvalidXmlChars(prop.remarks)).trim() || "—",
      ];
      const wrappedCols = vals.map((val, idx) =>
        wrapLines(val, colWidths[idx] - rowPad * 2, `19px ${FONT_FAMILY}`)
      );
      const maxLines = Math.max(...wrappedCols.map((l) => l.length));
      const rowH = Math.max(44, maxLines * lineH + rowPad * 2);

      if (y + rowH > PAGE_BOTTOM) {
        newPage();
        drawHeader();
      }

      let x = MARGIN_X;
      wrappedCols.forEach((lines, idx) => {
        ctx.fillStyle = r % 2 === 1 ? "#FFFDF9" : "#FFFFFF";
        ctx.fillRect(x, y, colWidths[idx], rowH);
        ctx.strokeStyle = "#CBD5E1";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, colWidths[idx], rowH);

        ctx.font = `19px ${FONT_FAMILY}`;
        ctx.fillStyle = "#1E293B";
        ctx.textBaseline = "top";
        lines.forEach((line, lineIdx) => {
          if (idx === 1 || idx === 2) {
            ctx.textAlign = "center";
            ctx.fillText(line, x + colWidths[idx] / 2, y + rowPad + lineIdx * lineH);
          } else {
            ctx.textAlign = "left";
            ctx.fillText(line, x + rowPad, y + rowPad + lineIdx * lineH);
          }
        });
        ctx.textAlign = "left";
        x += colWidths[idx];
      });
      y += rowH;
    }
    y += 24;
  }

  if (!isScriptMode) {
    drawSection("【開場與結語】", plan.openingClosingRemarks);
  }
  drawSection("【備註】", plan.remarks);

  pushPage();

  // Assemble multi-page PDF with JPEG page streams
  return buildMultiPageJpegPdf(pages);
}

function buildMultiPageJpegPdf(
  pages: Array<{ bytes: Uint8Array; width: number; height: number }>
): Uint8Array {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [0];
  let cursor = 0;

  const writeAscii = (text: string) => {
    const bytes = encoder.encode(text);
    chunks.push(bytes);
    cursor += bytes.length;
  };

  const writeBytes = (bytes: Uint8Array) => {
    chunks.push(bytes);
    cursor += bytes.length;
  };

  writeAscii("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");

  const pageObjNums: number[] = [];
  // Obj 1: Catalog, Obj 2: Pages. Each page uses 3 objects: Page, Content, Image.
  let nextObj = 3;
  const pageRecords = pages.map((page) => {
    const pageObj = nextObj++;
    const contentObj = nextObj++;
    const imageObj = nextObj++;
    pageObjNums.push(pageObj);
    return { page, pageObj, contentObj, imageObj };
  });

  const totalObjects = nextObj - 1;

  // 1: Catalog
  offsets[1] = cursor;
  writeAscii("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  // 2: Pages
  offsets[2] = cursor;
  writeAscii(
    `2 0 obj\n<< /Type /Pages /Kids [${pageObjNums.map((n) => `${n} 0 R`).join(" ")}] /Count ${pageObjNums.length} >>\nendobj\n`
  );

  // Page triples (A4 = 595.28 x 841.89 pt)
  const PT_W = 595.28;
  const PT_H = 841.89;

  for (const rec of pageRecords) {
    const { page, pageObj, contentObj, imageObj } = rec;
    const contentStream = `q\n${PT_W} 0 0 ${PT_H} 0 0 cm\n/Im0 Do\nQ\n`;

    offsets[pageObj] = cursor;
    writeAscii(
      `${pageObj} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PT_W} ${PT_H}] /Contents ${contentObj} 0 R /Resources << /XObject << /Im0 ${imageObj} 0 R >> >> >>\nendobj\n`
    );

    offsets[contentObj] = cursor;
    writeAscii(
      `${contentObj} 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream\nendobj\n`
    );

    offsets[imageObj] = cursor;
    writeAscii(
      `${imageObj} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.bytes.length} >>\nstream\n`
    );
    writeBytes(page.bytes);
    writeAscii("\nendstream\nendobj\n");
  }

  const xrefStart = cursor;
  writeAscii(`xref\n0 ${totalObjects + 1}\n`);
  writeAscii("0000000000 65535 f \n");
  for (let i = 1; i <= totalObjects; i++) {
    writeAscii(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
  }
  writeAscii(
    `trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`
  );

  const output = new Uint8Array(cursor);
  let pos = 0;
  for (const chunk of chunks) {
    output.set(chunk, pos);
    pos += chunk.length;
  }
  return output;
}

/**
 * 處理富文本內容中的 HTML 標記，將其轉化為 Word 支援的 Paragraphs
 */
function parseHtmlToDocx(docx: DocxModule, html: string) {
  const { Paragraph, TextRun, AlignmentType } = docx;
  const normalizedHtml = stripInvalidXmlChars(html);
  if (!normalizedHtml) return [new Paragraph({ text: "無內容", spacing: { after: 200 } })];

  const paragraphs: InstanceType<typeof Paragraph>[] = [];
  if (typeof document !== "undefined") {
    const container = document.createElement("div");
    container.innerHTML = normalizedHtml;

    container.childNodes.forEach((node: any) => {
      const text = node.textContent || "";
      if (!text.trim() && node.nodeName !== "BR" && node.nodeName !== "UL" && node.nodeName !== "OL")
        return;

      let alignment: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT;
      if (node.style?.textAlign === "center") alignment = AlignmentType.CENTER;
      if (node.style?.textAlign === "right") alignment = AlignmentType.RIGHT;

      const children: InstanceType<typeof TextRun>[] = [];

      const processTextNodes = (parent: any) => {
        parent.childNodes.forEach((child: any) => {
          if (child.nodeType === 3) {
            const fontSizeStr = parent.style?.fontSize || "";
            let size = 24;
            if (fontSizeStr.includes("px")) {
              const parsed = parseInt(fontSizeStr, 10);
              if (Number.isFinite(parsed) && parsed > 0) {
                size = Math.round(parsed * 1.5);
              }
            }

            children.push(
              new TextRun({
                text: stripInvalidXmlChars(child.textContent || ""),
                bold:
                  parent.nodeName === "B" ||
                  parent.nodeName === "STRONG" ||
                  Boolean(parent.closest && parent.closest("B, STRONG")),
                italics:
                  parent.nodeName === "I" ||
                  parent.nodeName === "EM" ||
                  Boolean(parent.closest && parent.closest("I, EM")),
                underline:
                  parent.nodeName === "U" || Boolean(parent.closest && parent.closest("U"))
                    ? {}
                    : undefined,
                color: parent.style?.color?.startsWith("#")
                  ? parent.style.color.substring(1)
                  : TEXT_COLOR,
                size,
              })
            );
          } else if (child.nodeName === "BR") {
            children.push(new TextRun({ break: 1 }));
          } else {
            processTextNodes(child);
          }
        });
      };

      if (node.nodeName === "UL" || node.nodeName === "OL") {
        node.childNodes.forEach((li: any) => {
          if (li.nodeName === "LI") {
            paragraphs.push(
              new Paragraph({
                text: stripInvalidXmlChars(li.textContent || ""),
                bullet: node.nodeName === "UL" ? { level: 0 } : undefined,
                numbering:
                  node.nodeName === "OL" ? { reference: "my-numbering", level: 0 } : undefined,
                spacing: { after: 120 },
              })
            );
          }
        });
      } else {
        processTextNodes(node);
        paragraphs.push(
          new Paragraph({
            children:
              children.length > 0
                ? children
                : [new TextRun({ text: stripInvalidXmlChars(text), color: TEXT_COLOR, size: 24 })],
            alignment,
            spacing: { after: 200, line: 360 },
          })
        );
      }
    });
  } else {
    return (htmlToPlainText(normalizedHtml) || "無內容").split("\n").map(
      (line) =>
        new Paragraph({
          children: [new TextRun({ text: stripInvalidXmlChars(line), color: TEXT_COLOR, size: 24 })],
          spacing: { after: 200 },
        })
    );
  }

  return paragraphs.length > 0
    ? paragraphs
    : [new Paragraph({ text: "無內容", spacing: { after: 200 } })];
}

/**
 * 建立美化過的標題段落
 */
function createStyledHeading(docx: DocxModule, title: string) {
  const { Paragraph, TextRun, BorderStyle } = docx;
  return new Paragraph({
    children: [
      new TextRun({
        text: title,
        bold: true,
        color: PRIMARY_COLOR,
        size: 32,
      }),
    ],
    border: {
      bottom: {
        color: BORDER_COLOR,
        space: 1,
        style: BorderStyle.SINGLE,
        size: 6,
      },
    },
    spacing: { before: 400, after: 250 },
  });
}

/**
 * 匯出教案為 Word (.docx) 檔案
 */
export async function exportToDocx(
  plan: LessonPlan,
  canvasImageData?: string,
  options?: { useSaveDialog?: boolean }
) {
  try {
    const handledByApi = await downloadByExportApi(plan, "word", options, canvasImageData);
    if (handledByApi) return;
  } catch (error) {
    console.warn("Export API unavailable, fallback to local DOCX generation", error);
  }

  const blob = await buildRichDocxBlob(plan, canvasImageData);
  const fileName = buildPlanBaseFileName(plan);
  await triggerBlobDownload(blob, `${fileName}.docx`, DOCX_MIME, ".docx", options);
}

/**
 * 產生與 exportToDocx 完全相同的渲染 Word Blob，但不觸發下載。
 * 供打包 ZIP 備份使用。
 */
export async function exportToDocxBlob(plan: LessonPlan, canvasImageData?: string): Promise<Blob> {
  return buildRichDocxBlob(plan, canvasImageData);
}

/** Internal: build the rich docx blob (shared by exportToDocx and exportToDocxBlob) */
async function buildRichDocxBlob(plan: LessonPlan, canvasImageData?: string): Promise<Blob> {
  const docx = await import("docx");
  const {
    Document,
    Packer,
    Paragraph,
    HeadingLevel,
    AlignmentType,
    ImageRun,
    TextRun,
    Table: DocxTable,
    TableRow: DocxTableRow,
    TableCell: DocxTableCell,
    WidthType,
    LevelFormat,
    VerticalAlign,
  } = docx;

  let resolvedCanvas = canvasImageData || plan.canvasImage || undefined;
  if (
    !resolvedCanvas &&
    plan.canvasData &&
    typeof plan.canvasData === "string" &&
    plan.canvasData.trim().startsWith("{")
  ) {
    try {
      resolvedCanvas = await renderCanvasJsonToPng(plan.canvasData, plan.canvasHeight || 500);
    } catch (e) {
      console.warn("Failed to render canvas JSON to PNG for export", e);
    }
  }

  const scheduledTitle = stripHtml(stripInvalidXmlChars(plan.scheduledName)).trim() || "教案";
  const activityTitle = stripHtml(stripInvalidXmlChars(plan.activityName)).trim() || "未命名教案";
  const isScriptMode = scheduledTitle === "劇本";
  const membersText = resolvePlanMembers(plan);
  const timeText = stripHtml(stripInvalidXmlChars(plan.time)).trim() || "無";
  const locationText = stripHtml(stripInvalidXmlChars(plan.location)).trim() || "無";

  const children: any[] = [
    new Paragraph({
      children: [
        new TextRun({
          text: `${scheduledTitle} - ${activityTitle}`,
          bold: true,
          size: 44,
          color: PRIMARY_COLOR,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
    }),

    ...(isScriptMode
      ? []
      : [
          createStyledHeading(docx, "【教案成員】"),
          new Paragraph({
            children: [new TextRun({ text: membersText, color: TEXT_COLOR, size: 24 })],
            spacing: { after: 200 },
          }),
        ]),

    createStyledHeading(docx, "【教案目的】"),
    ...parseHtmlToDocx(docx, plan.purpose),

    ...(isScriptMode
      ? []
      : [
          new Paragraph({
            children: [
              new TextRun({ text: "【教案時間】", bold: true, color: PRIMARY_COLOR, size: 24 }),
              new TextRun({ text: ` ${timeText}`, color: TEXT_COLOR, size: 24 }),
            ],
            spacing: { before: 200, after: 120 },
          }),

          new Paragraph({
            children: [
              new TextRun({ text: "【教案地點】", bold: true, color: PRIMARY_COLOR, size: 24 }),
              new TextRun({ text: ` ${locationText}`, color: TEXT_COLOR, size: 24 }),
            ],
            spacing: { before: 120, after: 300 },
          }),

          createStyledHeading(docx, "【教案流程】"),
          ...parseHtmlToDocx(docx, plan.process),
        ]),
  ];

  if (resolvedCanvas) {
    children.push(createStyledHeading(docx, "【教案視覺圖表】"));
    try {
      const base64Data = resolvedCanvas.split(",")[1] || resolvedCanvas;
      children.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0)),
              type: "png",
              transformation: {
                width: 580,
                height: 340,
              },
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 400 },
        })
      );
    } catch (e) {
      console.error("Failed to embed image in docx", e);
    }
  }

  children.push(
    createStyledHeading(docx, "【教案內容說明】"),
    ...parseHtmlToDocx(docx, plan.content),

    ...(isScriptMode
      ? []
      : [createStyledHeading(docx, "【分工】"), ...parseHtmlToDocx(docx, plan.divisionOfLabor)])
  );

  children.push(createStyledHeading(docx, "【道具表】"));
  if (plan.props && plan.props.length > 0) {
    children.push(
      new DocxTable({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new DocxTableRow({
            children: [
              new DocxTableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: "項目名稱", bold: true, color: "FFFFFF", size: 20 }),
                    ],
                    alignment: AlignmentType.CENTER,
                  }),
                ],
                shading: { fill: PRIMARY_COLOR },
                verticalAlign: VerticalAlign.CENTER,
                margins: { top: 120, bottom: 120, left: 100, right: 100 },
              }),
              new DocxTableCell({
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: "數量", bold: true, color: "FFFFFF", size: 20 })],
                    alignment: AlignmentType.CENTER,
                  }),
                ],
                shading: { fill: PRIMARY_COLOR },
                verticalAlign: VerticalAlign.CENTER,
                margins: { top: 120, bottom: 120, left: 100, right: 100 },
              }),
              new DocxTableCell({
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: "單位", bold: true, color: "FFFFFF", size: 20 })],
                    alignment: AlignmentType.CENTER,
                  }),
                ],
                shading: { fill: PRIMARY_COLOR },
                verticalAlign: VerticalAlign.CENTER,
                margins: { top: 120, bottom: 120, left: 100, right: 100 },
              }),
              new DocxTableCell({
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: "備註", bold: true, color: "FFFFFF", size: 20 })],
                    alignment: AlignmentType.CENTER,
                  }),
                ],
                shading: { fill: PRIMARY_COLOR },
                verticalAlign: VerticalAlign.CENTER,
                margins: { top: 120, bottom: 120, left: 100, right: 100 },
              }),
            ],
          }),
          ...plan.props.map(
            (p) =>
              new DocxTableRow({
                children: [
                  new DocxTableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: stripHtml(stripInvalidXmlChars(p.name)),
                            color: TEXT_COLOR,
                            size: 22,
                          }),
                        ],
                      }),
                    ],
                    margins: { top: 100, bottom: 100, left: 120, right: 120 },
                  }),
                  new DocxTableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: stripHtml(stripInvalidXmlChars(p.quantity)),
                            color: TEXT_COLOR,
                            size: 22,
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                      }),
                    ],
                    margins: { top: 100, bottom: 100, left: 120, right: 120 },
                  }),
                  new DocxTableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text:
                              p.unit === "custom" ? "" : stripHtml(stripInvalidXmlChars(p.unit)),
                            color: TEXT_COLOR,
                            size: 22,
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                      }),
                    ],
                    margins: { top: 100, bottom: 100, left: 120, right: 120 },
                  }),
                  new DocxTableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: stripHtml(stripInvalidXmlChars(p.remarks)),
                            color: TEXT_COLOR,
                            size: 22,
                          }),
                        ],
                        alignment: AlignmentType.CENTER,
                      }),
                    ],
                    margins: { top: 100, bottom: 100, left: 120, right: 120 },
                  }),
                ],
              })
          ),
        ],
      })
    );
  } else {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: "目前無道具資訊", color: "A0AEC0", italics: true })],
        spacing: { after: 200 },
      })
    );
  }

  children.push(
    createStyledHeading(docx, "【備註】"),
    ...parseHtmlToDocx(docx, plan.remarks),

    ...(isScriptMode
      ? []
      : [
          createStyledHeading(docx, "【開場結語】"),
          ...parseHtmlToDocx(docx, plan.openingClosingRemarks),
        ])
  );

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "my-numbering",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.START,
              style: {
                paragraph: {
                  indent: { left: 720, hanging: 360 },
                },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
          },
        },
        children,
      },
    ],
  });

  try {
    return await Packer.toBlob(doc);
  } catch (error) {
    console.error("Primary DOCX export failed, using fallback", error);
    const fallbackDoc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              text: `${scheduledTitle} - ${activityTitle}`,
              heading: HeadingLevel.TITLE,
            }),
            new Paragraph({ text: `成員：${membersText}` }),
            new Paragraph({ text: `時間：${timeText}` }),
            new Paragraph({ text: `地點：${locationText}` }),
            new Paragraph({ text: "" }),
            new Paragraph({ text: `教案目的：${htmlToPlainText(plan.purpose) || "無"}` }),
            new Paragraph({ text: `教案流程：${htmlToPlainText(plan.process) || "無"}` }),
            new Paragraph({ text: `教案內容：${htmlToPlainText(plan.content) || "無"}` }),
            new Paragraph({ text: `分工：${htmlToPlainText(plan.divisionOfLabor) || "無"}` }),
            new Paragraph({ text: `備註：${htmlToPlainText(plan.remarks) || "無"}` }),
            new Paragraph({
              text: `開場結語：${htmlToPlainText(plan.openingClosingRemarks) || "無"}`,
            }),
          ],
        },
      ],
    });
    return await Packer.toBlob(fallbackDoc);
  }
}

/**
 * 匯出教案為 PDF 檔案
 */
export async function exportToPdf(
  plan: LessonPlan,
  options?: { useSaveDialog?: boolean },
  canvasImageData?: string
) {
  try {
    const handledByApi = await downloadByExportApi(plan, "pdf", options, canvasImageData);
    if (handledByApi) return;
  } catch (error) {
    console.warn("Export API unavailable, fallback to local PDF generation", error);
  }

  const fileName = buildPlanBaseFileName(plan);
  let resolvedCanvas = canvasImageData || plan.canvasImage || undefined;
  if (
    !resolvedCanvas &&
    plan.canvasData &&
    typeof plan.canvasData === "string" &&
    plan.canvasData.trim().startsWith("{")
  ) {
    try {
      resolvedCanvas = await renderCanvasJsonToPng(plan.canvasData, plan.canvasHeight || 500);
    } catch {
      // ignore
    }
  }

  const pdfBytes = await buildFallbackChinesePdfBytes(plan, resolvedCanvas);
  await triggerBlobDownload(pdfBytes, `${fileName}.pdf`, PDF_MIME, ".pdf", options);
}

export async function exportPlansAsZip(
  plans: LessonPlan[],
  format: "word" | "pdf",
  options?: { useSaveDialog?: boolean; zipName?: string }
) {
  if (!plans.length) {
    throw new Error("No plans to export");
  }

  const sanitizedPlans = plans.map((item) => {
    const { canvasData: _omitCanvasData, ...rest } = item;
    return { ...rest, canvasData: null };
  });

  const response = await fetch("/api/export", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ plans: sanitizedPlans, format }),
  });

  if (!response.ok) {
    throw new Error(`Batch export API failed (${response.status})`);
  }

  const fallbackName = `plans_${format}_${Date.now()}.zip`;
  const serverName = parseFileNameFromContentDisposition(
    response.headers.get("content-disposition")
  );
  const resolvedName =
    options?.zipName ||
    (serverName && !isGenericAsciiFallbackName(serverName) ? serverName : fallbackName);
  const blob = await response.blob();
  await triggerBlobDownload(blob, resolvedName, ZIP_MIME, ".zip", options);
}

/**
 * 將 Fabric.js canvas JSON 渲染為 PNG data:image URL。
 * 使用離屏 canvas，不需要已掛載的畫布元件。
 */
async function renderCanvasJsonToPng(canvasJson: string, height: number): Promise<string> {
  const { fabric } = await import("fabric");

  return new Promise((resolve, reject) => {
    const canvasEl = document.createElement("canvas");
    canvasEl.width = 800;
    canvasEl.height = height || 500;
    canvasEl.style.display = "none";
    document.body.appendChild(canvasEl);

    try {
      const offscreen = new fabric.Canvas(canvasEl, {
        backgroundColor: "#ffffff",
      });

      offscreen.loadFromJSON(canvasJson, () => {
        offscreen.renderAll();
        const dataUrl = offscreen.toDataURL({ format: "png", multiplier: 2 });
        offscreen.dispose();
        canvasEl.remove();
        resolve(dataUrl);
      });

      setTimeout(() => {
        try {
          offscreen.dispose();
        } catch {}
        canvasEl.remove();
        reject(new Error("Canvas render timed out"));
      }, 10000);
    } catch (e) {
      canvasEl.remove();
      reject(e);
    }
  });
}
