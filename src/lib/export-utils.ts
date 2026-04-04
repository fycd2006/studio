import { 
  Document, 
  Packer, 
  Paragraph, 
  HeadingLevel, 
  AlignmentType, 
  ImageRun, 
  TextRun,
  Table as DocxTable,
  TableRow as DocxTableRow,
  TableCell as DocxTableCell,
  WidthType,
  LevelFormat,
  BorderStyle,
  VerticalAlign
} from "docx";
import { LessonPlan } from "@/types/plan";

const PRIMARY_COLOR = "E67E22"; // 活力橘風格
const TEXT_COLOR = "1E293B"; // Slate-800
const BORDER_COLOR = "CBD5E1"; // Slate-300
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const PDF_MIME = "application/pdf";
const ZIP_MIME = "application/zip";
const FILE_PICKER_ERROR_ABORT = "AbortError";

const stripInvalidXmlChars = (value?: string) =>
  (value || "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");

const sanitizeFileName = (value: string) =>
  value
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120) || "未命名教案";

const toAscii = (value?: string) => stripInvalidXmlChars(value).replace(/[^\x20-\x7E]/g, "?");

const buildPlanBaseFileName = (plan: LessonPlan) =>
  sanitizeFileName(`${plan.scheduledName || "教案"}_${plan.activityName || "未命名"}`);

const ensureFileExtension = (fileName: string, ext: string) => {
  const normalizedExt = ext.startsWith(".") ? ext.toLowerCase() : `.${ext.toLowerCase()}`;
  if (fileName.toLowerCase().endsWith(normalizedExt)) return fileName;
  return `${fileName}${normalizedExt}`;
};

const parseFileNameFromContentDisposition = (contentDisposition: string | null) => {
  if (!contentDisposition) return null;

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const simpleMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  if (simpleMatch?.[1]) {
    return simpleMatch[1];
  }

  return null;
};

const triggerBlobDownload = async (
  source: Blob | BlobPart,
  fileNameWithExt: string,
  mimeType: string,
  fileExtension: ".docx" | ".pdf" | ".zip",
  options?: { useSaveDialog?: boolean }
) => {
  if (typeof window === "undefined") return;

  const blob =
    source instanceof Blob
      ? new Blob([source], { type: mimeType })
      : new Blob([source], { type: mimeType });

  const fileName = ensureFileExtension(fileNameWithExt, fileExtension);
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

  // Prefer the native save dialog when available to guarantee filename + extension.
  const useSaveDialog = options?.useSaveDialog ?? true;
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
              [mimeType]: [fileExtension],
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

  const downloadFile = new File([blob], fileName, { type: mimeType });
  const url = window.URL.createObjectURL(downloadFile);
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
  }, 1000);
};

const downloadByExportApi = async (
  plan: LessonPlan,
  format: "word" | "pdf",
  options?: { useSaveDialog?: boolean }
) => {
  if (typeof window === "undefined") return false;

  const response = await fetch("/api/export", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ plan, format }),
  });

  if (!response.ok) {
    throw new Error(`Export API failed (${response.status})`);
  }

  const fallbackBase = buildPlanBaseFileName(plan);
  const extension: ".docx" | ".pdf" = format === "word" ? ".docx" : ".pdf";
  const fallbackName = `${fallbackBase}${extension}`;
  const resolvedMime = response.headers.get("content-type") || (format === "word" ? DOCX_MIME : PDF_MIME);
  const serverName = parseFileNameFromContentDisposition(response.headers.get("content-disposition"));
  const blob = await response.blob();

  await triggerBlobDownload(blob, serverName || fallbackName, resolvedMime, extension, options);
  return true;
};

const escapePdfText = (value: string) =>
  value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

const splitPdfLine = (text: string, maxChars = 88) => {
  if (text.length <= maxChars) return [text];
  const parts: string[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    parts.push(text.slice(cursor, cursor + maxChars));
    cursor += maxChars;
  }
  return parts;
};

const buildSimplePdfBytes = (title: string, lines: string[]) => {
  const safeLines = [toAscii(title), ...lines.map((line) => toAscii(line))]
    .flatMap((line) => splitPdfLine(line || " "));

  const drawing: string[] = ["BT", "/F1 11 Tf", "50 790 Td"];
  for (const line of safeLines) {
    drawing.push(`(${escapePdfText(line)}) Tj`);
    drawing.push("0 -15 Td");
  }
  drawing.push("ET");
  const stream = drawing.join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  const encoder = new TextEncoder();
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  let currentLength = encoder.encode(pdf).length;

  objects.forEach((obj, index) => {
    const n = index + 1;
    offsets[n] = currentLength;
    const chunk = `${n} 0 obj\n${obj}\nendobj\n`;
    pdf += chunk;
    currentLength += encoder.encode(chunk).length;
  });

  const xrefStart = currentLength;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return encoder.encode(pdf);
};

const htmlToPlainText = (html?: string) => {
  const raw = stripInvalidXmlChars(html);
  if (!raw) return "";
  if (typeof document === "undefined") {
    return raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }
  const container = document.createElement("div");
  container.innerHTML = raw;
  return (container.textContent || "").replace(/\s+/g, " ").trim();
};

/**
 * 處理富文本內容中的 HTML 標記，將其轉化為 Word 支援的 Paragraphs
 */
function parseHtmlToDocx(html: string) {
  const normalizedHtml = stripInvalidXmlChars(html);
  if (!normalizedHtml) return [new Paragraph({ text: "無內容", spacing: { after: 200 } })];

  const paragraphs: Paragraph[] = [];
  if (typeof document !== 'undefined') {
    const container = document.createElement('div');
    container.innerHTML = normalizedHtml;

    container.childNodes.forEach((node: any) => {
      const text = node.textContent || "";
      if (!text.trim() && node.nodeName !== 'BR' && node.nodeName !== 'UL' && node.nodeName !== 'OL') return;

      let alignment = AlignmentType.LEFT;
      if (node.style?.textAlign === 'center') alignment = AlignmentType.CENTER;
      if (node.style?.textAlign === 'right') alignment = AlignmentType.RIGHT;

      const children: TextRun[] = [];
      
      const processTextNodes = (parent: any) => {
        parent.childNodes.forEach((child: any) => {
          if (child.nodeType === 3) { // Text node
            const fontSizeStr = parent.style?.fontSize || "";
            let size = 24; // Default 12pt
            if (fontSizeStr.includes("px")) {
              size = Math.round(parseInt(fontSizeStr) * 1.5);
            }

            children.push(new TextRun({
              text: stripInvalidXmlChars(child.textContent || ""),
              bold: parent.nodeName === 'B' || parent.nodeName === 'STRONG' || (parent.closest && parent.closest('B, STRONG')),
              italics: parent.nodeName === 'I' || parent.nodeName === 'EM' || (parent.closest && parent.closest('I, EM')),
              underline: (parent.nodeName === 'U' || (parent.closest && parent.closest('U'))) ? {} : undefined,
              color: parent.style?.color?.startsWith('#') ? parent.style.color.substring(1) : TEXT_COLOR,
              size: size
            }));
          } else if (child.nodeName === 'BR') {
            children.push(new TextRun({ break: 1 }));
          } else {
            processTextNodes(child);
          }
        });
      };

      if (node.nodeName === 'UL' || node.nodeName === 'OL') {
        node.childNodes.forEach((li: any) => {
          if (li.nodeName === 'LI') {
            paragraphs.push(new Paragraph({
              text: li.textContent,
              bullet: node.nodeName === 'UL' ? { level: 0 } : undefined,
              numbering: node.nodeName === 'OL' ? { reference: "my-numbering", level: 0 } : undefined,
              spacing: { after: 120 }
            }));
          }
        });
      } else {
        processTextNodes(node);
        paragraphs.push(new Paragraph({
          children: children.length > 0 ? children : [new TextRun({ text, color: TEXT_COLOR, size: 24 })],
          alignment,
          spacing: { after: 200, line: 360 }
        }));
      }
    });
  } else {
    return normalizedHtml.split(/<br\/?>|<\/p>|<\/div>/).map(line => new Paragraph({
      children: [new TextRun({ text: stripInvalidXmlChars(line.replace(/<[^>]*>/g, '')), color: TEXT_COLOR, size: 24 })],
      spacing: { after: 200 }
    }));
  }

  return paragraphs.length > 0 ? paragraphs : [new Paragraph({ text: "無內容", spacing: { after: 200 } })];
}

/**
 * 建立美化過的標題段落
 */
function createStyledHeading(title: string) {
  return new Paragraph({
    children: [
      new TextRun({
        text: title,
        bold: true,
        color: PRIMARY_COLOR,
        size: 32, // 16pt
      })
    ],
    border: {
      bottom: {
        color: BORDER_COLOR,
        space: 1,
        style: BorderStyle.SINGLE,
        size: 6,
      },
    },
    spacing: { before: 400, after: 250 }
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
    const handledByApi = await downloadByExportApi(plan, "word", options);
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
  // 若未明確傳入畫布圖片，從 canvasData JSON 動態渲染 PNG
  let resolvedCanvas = canvasImageData;
  if (!resolvedCanvas && plan.canvasData && typeof plan.canvasData === 'string' && plan.canvasData.trim().startsWith('{')) {
    try {
      resolvedCanvas = await renderCanvasJsonToPng(plan.canvasData, plan.canvasHeight || 500);
    } catch (e) {
      console.warn('Failed to render canvas JSON to PNG for export', e);
    }
  }
  const isScriptMode = plan.scheduledName === '劇本';

  const children: any[] = [
    // 總標題
    new Paragraph({
      children: [
        new TextRun({
          text: stripInvalidXmlChars(`${plan.scheduledName || ""} - ${plan.activityName || "未命名教案"}`),
          bold: true,
          size: 44, // 22pt
          color: PRIMARY_COLOR,
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 }
    }),
    
    ...(isScriptMode ? [] : [
      createStyledHeading("【教案成員】"),
      new Paragraph({ 
        children: [new TextRun({ text: stripInvalidXmlChars(plan.members || "無"), color: TEXT_COLOR, size: 24 })], 
        spacing: { after: 200 } 
      })
    ]),

    createStyledHeading("【教案目的】"),
    ...parseHtmlToDocx(plan.purpose),

    ...(isScriptMode ? [] : [
      new Paragraph({
        children: [
          new TextRun({ text: "【教案時間】", bold: true, color: PRIMARY_COLOR, size: 24 }),
          new TextRun({ text: ` ${stripInvalidXmlChars(plan.time || "無")}`, color: TEXT_COLOR, size: 24 }),
        ],
        spacing: { before: 200, after: 120 }
      }),

      new Paragraph({
        children: [
          new TextRun({ text: "【教案地點】", bold: true, color: PRIMARY_COLOR, size: 24 }),
          new TextRun({ text: ` ${stripInvalidXmlChars(plan.location || "無")}`, color: TEXT_COLOR, size: 24 }),
        ],
        spacing: { before: 120, after: 300 }
      }),
      
      createStyledHeading("【教案流程】"),
      ...parseHtmlToDocx(plan.process),
    ])
  ];

  // 如果有畫布圖片
  if (resolvedCanvas) {
    children.push(createStyledHeading("【教案視覺圖表】"));
    try {
      const base64Data = resolvedCanvas.split(',')[1] || resolvedCanvas;
      children.push(new Paragraph({
        children: [
          new ImageRun({
            data: Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)),
            transformation: {
              width: 580,
              height: 340,
            },
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 400 }
      }));
    } catch (e) {
      console.error("Failed to embed image in docx", e);
    }
  }

  children.push(
    createStyledHeading("【教案內容說明】"),
    ...parseHtmlToDocx(plan.content),

    ...(isScriptMode ? [] : [
      createStyledHeading("【分工】"),
      ...parseHtmlToDocx(plan.divisionOfLabor)
    ])
  );

  // 道具表格匯出
  children.push(createStyledHeading("【道具表】"));
  if (plan.props && plan.props.length > 0) {
    children.push(new DocxTable({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new DocxTableRow({
          children: [
            new DocxTableCell({ 
              children: [new Paragraph({ children: [new TextRun({ text: "項目名稱", bold: true, color: "FFFFFF", size: 20 })], alignment: AlignmentType.CENTER })],
              shading: { fill: PRIMARY_COLOR },
              verticalAlign: VerticalAlign.CENTER,
              margins: { top: 120, bottom: 120, left: 100, right: 100 }
            }),
            new DocxTableCell({ 
              children: [new Paragraph({ children: [new TextRun({ text: "數量", bold: true, color: "FFFFFF", size: 20 })], alignment: AlignmentType.CENTER })],
              shading: { fill: PRIMARY_COLOR },
              verticalAlign: VerticalAlign.CENTER,
              margins: { top: 120, bottom: 120, left: 100, right: 100 }
            }),
            new DocxTableCell({ 
              children: [new Paragraph({ children: [new TextRun({ text: "單位", bold: true, color: "FFFFFF", size: 20 })], alignment: AlignmentType.CENTER })],
              shading: { fill: PRIMARY_COLOR },
              verticalAlign: VerticalAlign.CENTER,
              margins: { top: 120, bottom: 120, left: 100, right: 100 }
            }),
            new DocxTableCell({ 
              children: [new Paragraph({ children: [new TextRun({ text: "備註", bold: true, color: "FFFFFF", size: 20 })], alignment: AlignmentType.CENTER })],
              shading: { fill: PRIMARY_COLOR },
              verticalAlign: VerticalAlign.CENTER,
              margins: { top: 120, bottom: 120, left: 100, right: 100 }
            }),
          ]
        }),
        ...plan.props.map(p => new DocxTableRow({
          children: [
            new DocxTableCell({ 
              children: [new Paragraph({ children: [new TextRun({ text: stripInvalidXmlChars(p.name || ""), color: TEXT_COLOR, size: 22 })] })],
              margins: { top: 100, bottom: 100, left: 120, right: 120 }
            }),
            new DocxTableCell({ 
              children: [new Paragraph({ children: [new TextRun({ text: stripInvalidXmlChars(p.quantity || ""), color: TEXT_COLOR, size: 22 })], alignment: AlignmentType.CENTER })],
              margins: { top: 100, bottom: 100, left: 120, right: 120 }
            }),
            new DocxTableCell({ 
              children: [new Paragraph({ children: [new TextRun({ text: stripInvalidXmlChars(p.unit || ""), color: TEXT_COLOR, size: 22 })], alignment: AlignmentType.CENTER })],
              margins: { top: 100, bottom: 100, left: 120, right: 120 }
            }),
            new DocxTableCell({ 
              children: [new Paragraph({ children: [new TextRun({ text: stripInvalidXmlChars(p.remarks || ""), color: TEXT_COLOR, size: 22 })], alignment: AlignmentType.CENTER })],
              margins: { top: 100, bottom: 100, left: 120, right: 120 }
            }),
          ]
        }))
      ]
    }));
  } else {
    children.push(new Paragraph({ children: [new TextRun({ text: "目前無道具資訊", color: "A0AEC0", italics: true })], spacing: { after: 200 } }));
  }

  children.push(
    createStyledHeading("【備註】"),
    ...parseHtmlToDocx(plan.remarks),

    ...(isScriptMode ? [] : [
      createStyledHeading("【開場結語】"),
      ...parseHtmlToDocx(plan.openingClosingRemarks)
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
        children: children,
      },
    ],
  });

  try {
    return await Packer.toBlob(doc);
  } catch (error) {
    console.error("Primary DOCX export failed, using fallback", error);
    const fallbackDoc = new Document({
      sections: [{
        children: [
          new Paragraph({ text: stripInvalidXmlChars(`${plan.scheduledName || "教案"} - ${plan.activityName || "未命名教案"}`), heading: HeadingLevel.TITLE }),
          new Paragraph({ text: `成員：${stripInvalidXmlChars(plan.members || "無")}` }),
          new Paragraph({ text: `時間：${stripInvalidXmlChars(plan.time || "無")}` }),
          new Paragraph({ text: `地點：${stripInvalidXmlChars(plan.location || "無")}` }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: `教案目的：${htmlToPlainText(plan.purpose) || "無"}` }),
          new Paragraph({ text: `教案流程：${htmlToPlainText(plan.process) || "無"}` }),
          new Paragraph({ text: `教案內容：${htmlToPlainText(plan.content) || "無"}` }),
          new Paragraph({ text: `分工：${htmlToPlainText(plan.divisionOfLabor) || "無"}` }),
          new Paragraph({ text: `備註：${htmlToPlainText(plan.remarks) || "無"}` }),
          new Paragraph({ text: `開場結語：${htmlToPlainText(plan.openingClosingRemarks) || "無"}` }),
        ],
      }],
    });
    return await Packer.toBlob(fallbackDoc);
  }
}

/**
 * 匯出教案為 PDF 檔案
 */
export async function exportToPdf(plan: LessonPlan, options?: { useSaveDialog?: boolean }) {
  try {
    const handledByApi = await downloadByExportApi(plan, "pdf", options);
    if (handledByApi) return;
  } catch (error) {
    console.warn("Export API unavailable, fallback to local PDF generation", error);
  }

  const fileName = buildPlanBaseFileName(plan);
  const isScriptMode = plan.scheduledName === '劇本';
  
  let lines: string[] = [];

  if (isScriptMode) {
    lines = [
      `Purpose: ${toAscii(htmlToPlainText(plan.purpose) || "N/A")}`,
      `Content: ${toAscii(htmlToPlainText(plan.content) || "N/A")}`,
      `Remarks: ${toAscii(htmlToPlainText(plan.remarks) || "N/A")}`,
    ];
  } else {
    lines = [
      `Members: ${toAscii(plan.members || "N/A")}`,
      `Time: ${toAscii(plan.time || "N/A")}`,
      `Location: ${toAscii(plan.location || "N/A")}`,
      "",
      `Purpose: ${toAscii(htmlToPlainText(plan.purpose) || "N/A")}`,
      `Process: ${toAscii(htmlToPlainText(plan.process) || "N/A")}`,
      `Content: ${toAscii(htmlToPlainText(plan.content) || "N/A")}`,
      `Division: ${toAscii(htmlToPlainText(plan.divisionOfLabor) || "N/A")}`,
      `Remarks: ${toAscii(htmlToPlainText(plan.remarks) || "N/A")}`,
      `Opening/Closing: ${toAscii(htmlToPlainText(plan.openingClosingRemarks) || "N/A")}`,
    ];
  }

  const pdfBytes = buildSimplePdfBytes(
    `${toAscii(plan.scheduledName || "Plan")} - ${toAscii(plan.activityName || "Untitled")}`,
    lines
  );

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

  const response = await fetch("/api/export", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ plans, format }),
  });

  if (!response.ok) {
    throw new Error(`Batch export API failed (${response.status})`);
  }

  const fallbackName = options?.zipName || `plans_${format}_${Date.now()}.zip`;
  const serverName = parseFileNameFromContentDisposition(response.headers.get("content-disposition"));
  const blob = await response.blob();
  await triggerBlobDownload(blob, serverName || fallbackName, ZIP_MIME, ".zip", options);
}

/**
 * 將 Fabric.js canvas JSON 渲染為 PNG data:image URL。
 * 使用離屏 canvas，不需要已掛載的畫布元件。
 */
async function renderCanvasJsonToPng(canvasJson: string, height: number): Promise<string> {
  const { fabric } = await import('fabric');
  
  return new Promise((resolve, reject) => {
    // Create offscreen canvas element
    const canvasEl = document.createElement('canvas');
    canvasEl.width = 800;
    canvasEl.height = height || 500;
    canvasEl.style.display = 'none';
    document.body.appendChild(canvasEl);

    try {
      const offscreen = new fabric.Canvas(canvasEl, {
        backgroundColor: '#ffffff',
      });

      offscreen.loadFromJSON(canvasJson, () => {
        offscreen.renderAll();
        const dataUrl = offscreen.toDataURL({ format: 'png', multiplier: 2 });
        // Cleanup
        offscreen.dispose();
        canvasEl.remove();
        resolve(dataUrl);
      });

      // Timeout safety — don't hang forever
      setTimeout(() => {
        try { offscreen.dispose(); } catch {}
        canvasEl.remove();
        reject(new Error('Canvas render timed out'));
      }, 10000);
    } catch (e) {
      canvasEl.remove();
      reject(e);
    }
  });
}