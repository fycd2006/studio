import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import { LessonPlan } from "@/types/plan";
import { stripHtml } from "@/lib/utils";
import {
  htmlToStructuredLines,
  resolvePlanMembers,
  stripInvalidXmlChars,
} from "@/lib/export-filename";

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const MARGIN_LEFT = 48;
const MARGIN_RIGHT = 48;
const MARGIN_TOP = 48;
const MARGIN_BOTTOM = 54;
const CONTENT_WIDTH = A4_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
const PAGE_BOTTOM = A4_HEIGHT - MARGIN_BOTTOM;

const PRIMARY_COLOR = "#E67E22";
const TEXT_COLOR = "#1E293B";
const HEADING_DARK = "#0F172A";
const MUTED_COLOR = "#64748B";
const BORDER_COLOR = "#CBD5E1";
const LIGHT_BG = "#FAF8F5";
const ALT_ROW_BG = "#FFFDF9";

const FONT_REGULAR = "TC-Regular";
const FONT_BOLD = "TC-Bold";

let cachedFontsPromise: Promise<{ regular: Buffer; bold: Buffer }> | null = null;

async function loadTraditionalChineseFonts(): Promise<{ regular: Buffer; bold: Buffer }> {
  if (cachedFontsPromise) return cachedFontsPromise;

  cachedFontsPromise = (async () => {
    const candidateDirs = [
      path.join(process.cwd(), "node_modules/@junejs/pdf-font-noto-sans-tc/fonts"),
    ];

    for (const dir of candidateDirs) {
      const regPath = path.join(dir, "NotoSansTC-Regular.otf");
      const boldPath = path.join(dir, "NotoSansTC-Bold.otf");
      if (fs.existsSync(regPath) && fs.existsSync(boldPath)) {
        return {
          regular: fs.readFileSync(regPath),
          bold: fs.readFileSync(boldPath),
        };
      }
    }

    const { notoSansTC } = await import("@junejs/pdf-font-noto-sans-tc");
    const provider = notoSansTC({ weights: [400, 700] }) as {
      persistent?: () => Promise<Uint8Array[]>;
    };
    if (!provider?.persistent) {
      throw new Error("Noto Sans TC font files are unavailable");
    }
    const [regularBytes, boldBytes] = await provider.persistent();
    return {
      regular: Buffer.from(regularBytes),
      bold: Buffer.from(boldBytes),
    };
  })();

  return cachedFontsPromise;
}

const cleanPlainText = (value?: string | null, fallback = "無"): string => {
  const cleaned = stripHtml(stripInvalidXmlChars(value)).replace(/\s+/g, " ").trim();
  return cleaned || fallback;
};

const parseDataUrlImage = (
  dataUrl?: string | null
): { buffer: Buffer; width?: number; height?: number } | null => {
  if (!dataUrl || typeof dataUrl !== "string") return null;
  const match = dataUrl.match(/^data:image\/(?:png|jpeg|jpg);base64,(.+)$/i);
  if (!match?.[1]) return null;

  try {
    const buffer = Buffer.from(match[1], "base64");
    if (buffer.length < 24) return null;

    // Read PNG IHDR dimensions when available (bytes 16..23)
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      if (width > 0 && height > 0) {
        return { buffer, width, height };
      }
    }
    return { buffer };
  } catch {
    return null;
  }
};

export async function generatePlanPdfBuffer(plan: LessonPlan): Promise<Buffer> {
  const { regular, bold } = await loadTraditionalChineseFonts();

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: {
        top: MARGIN_TOP,
        bottom: MARGIN_BOTTOM,
        left: MARGIN_LEFT,
        right: MARGIN_RIGHT,
      },
      bufferPages: true,
      autoFirstPage: false,
      info: {
        Title: `${cleanPlainText(plan.scheduledName, "教案")} - ${cleanPlainText(plan.activityName, "未命名教案")}`,
        Author: "NTUT CD Camp Studio",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.registerFont(FONT_REGULAR, regular);
    doc.registerFont(FONT_BOLD, bold);
    doc.font(FONT_REGULAR);
    doc.addPage();

    const ensureSpace = (neededHeight: number) => {
      if (doc.y + neededHeight > PAGE_BOTTOM) {
        doc.addPage();
      }
    };

    const scheduledTitle = cleanPlainText(plan.scheduledName, "教案");
    const activityTitle = cleanPlainText(plan.activityName, "未命名教案");
    const fullTitle = `${scheduledTitle} - ${activityTitle}`;
    const isScriptMode = scheduledTitle === "劇本";

    // ── Header Banner ──
    doc.save();
    doc.rect(MARGIN_LEFT, doc.y, 44, 4).fill(PRIMARY_COLOR);
    doc.restore();
    doc.y += 10;

    doc
      .font(FONT_BOLD)
      .fontSize(8.5)
      .fillColor(PRIMARY_COLOR)
      .text("NTUT CD CAMP // 營隊教案文件", MARGIN_LEFT, doc.y, {
        width: CONTENT_WIDTH,
      });
    doc.y += 4;

    doc
      .font(FONT_BOLD)
      .fontSize(19)
      .fillColor(HEADING_DARK)
      .text(fullTitle, MARGIN_LEFT, doc.y, {
        width: CONTENT_WIDTH,
        lineGap: 3,
      });
    doc.y += 8;

    doc.save();
    doc
      .moveTo(MARGIN_LEFT, doc.y)
      .lineTo(A4_WIDTH - MARGIN_RIGHT, doc.y)
      .lineWidth(1)
      .strokeColor(BORDER_COLOR)
      .stroke();
    doc.restore();
    doc.y += 14;

    // ── Metadata Summary Card (non-script mode) ──
    if (!isScriptMode) {
      const metaItems = [
        { label: "教案成員", value: resolvePlanMembers(plan) },
        { label: "教案時間", value: cleanPlainText(plan.time, "無") },
        { label: "教案地點", value: cleanPlainText(plan.location, "無") },
      ];

      const labelWidth = 68;
      const valueWidth = CONTENT_WIDTH - 24 - labelWidth;
      doc.font(FONT_REGULAR).fontSize(10);

      let cardHeight = 16;
      const rowHeights = metaItems.map((item) => {
        const h = doc.heightOfString(item.value, { width: valueWidth, lineGap: 2 });
        return Math.max(16, h + 4);
      });
      cardHeight += rowHeights.reduce((a, b) => a + b, 0);

      ensureSpace(cardHeight + 10);
      const cardTop = doc.y;

      doc.save();
      doc
        .roundedRect(MARGIN_LEFT, cardTop, CONTENT_WIDTH, cardHeight, 6)
        .fillAndStroke(LIGHT_BG, BORDER_COLOR);
      doc.restore();

      let rowY = cardTop + 10;
      metaItems.forEach((item, idx) => {
        doc
          .font(FONT_BOLD)
          .fontSize(10)
          .fillColor(PRIMARY_COLOR)
          .text(item.label, MARGIN_LEFT + 12, rowY, { width: labelWidth });
        doc
          .font(FONT_REGULAR)
          .fontSize(10)
          .fillColor(TEXT_COLOR)
          .text(item.value, MARGIN_LEFT + 12 + labelWidth, rowY, {
            width: valueWidth,
            lineGap: 2,
          });
        rowY += rowHeights[idx];
      });

      doc.y = cardTop + cardHeight + 16;
    }

    // ── Section Renderer ──
    const renderRichSection = (title: string, html?: string | null) => {
      ensureSpace(64);
      const headingY = doc.y;

      doc.save();
      doc.rect(MARGIN_LEFT, headingY + 2, 3, 14).fill(PRIMARY_COLOR);
      doc.restore();

      doc
        .font(FONT_BOLD)
        .fontSize(12.5)
        .fillColor(HEADING_DARK)
        .text(title, MARGIN_LEFT + 10, headingY, { width: CONTENT_WIDTH - 10 });

      doc.y += 3;
      doc.save();
      doc
        .moveTo(MARGIN_LEFT, doc.y)
        .lineTo(A4_WIDTH - MARGIN_RIGHT, doc.y)
        .lineWidth(0.6)
        .strokeColor(BORDER_COLOR)
        .stroke();
      doc.restore();
      doc.y += 8;

      const blocks = htmlToStructuredLines(html);
      if (blocks.length === 0) {
        doc
          .font(FONT_REGULAR)
          .fontSize(10)
          .fillColor(MUTED_COLOR)
          .text("無內容", MARGIN_LEFT, doc.y, { width: CONTENT_WIDTH });
        doc.y += 12;
        return;
      }

      for (const block of blocks) {
        if (block.type === "heading") {
          ensureSpace(28);
          doc
            .font(FONT_BOLD)
            .fontSize(11)
            .fillColor(HEADING_DARK)
            .text(block.text, MARGIN_LEFT, doc.y, {
              width: CONTENT_WIDTH,
              lineGap: 3,
            });
          doc.y += 4;
        } else if (block.type === "bullet" || block.type === "numbered") {
          ensureSpace(20);
          doc
            .font(FONT_REGULAR)
            .fontSize(10.5)
            .fillColor(TEXT_COLOR)
            .text(block.text, MARGIN_LEFT + 10, doc.y, {
              width: CONTENT_WIDTH - 10,
              lineGap: 3.5,
            });
          doc.y += 3;
        } else {
          ensureSpace(20);
          doc
            .font(FONT_REGULAR)
            .fontSize(10.5)
            .fillColor(TEXT_COLOR)
            .text(block.text, MARGIN_LEFT, doc.y, {
              width: CONTENT_WIDTH,
              lineGap: 3.5,
            });
          doc.y += 4;
        }
      }

      doc.y += 10;
    };

    const renderSectionHeader = (title: string) => {
      ensureSpace(64);
      const headingY = doc.y;
      doc.save();
      doc.rect(MARGIN_LEFT, headingY + 2, 3, 14).fill(PRIMARY_COLOR);
      doc.restore();
      doc
        .font(FONT_BOLD)
        .fontSize(12.5)
        .fillColor(HEADING_DARK)
        .text(title, MARGIN_LEFT + 10, headingY, { width: CONTENT_WIDTH - 10 });
      doc.y += 3;
      doc.save();
      doc
        .moveTo(MARGIN_LEFT, doc.y)
        .lineTo(A4_WIDTH - MARGIN_RIGHT, doc.y)
        .lineWidth(0.6)
        .strokeColor(BORDER_COLOR)
        .stroke();
      doc.restore();
      doc.y += 8;
    };

    // ── Content Sections ──
    renderRichSection("【教案目的】", plan.purpose);

    if (!isScriptMode) {
      renderRichSection("【教案流程】", plan.process);
    }

    // ── Visual Blueprint Image ──
    const parsedImage = parseDataUrlImage(plan.canvasImage);
    if (parsedImage) {
      const maxImgHeight = 320;
      let drawWidth = CONTENT_WIDTH;
      let drawHeight = 240;

      if (parsedImage.width && parsedImage.height) {
        const scale = Math.min(CONTENT_WIDTH / parsedImage.width, maxImgHeight / parsedImage.height);
        drawWidth = parsedImage.width * scale;
        drawHeight = parsedImage.height * scale;
      }

      if (doc.y + 42 + drawHeight > PAGE_BOTTOM) {
        doc.addPage();
      }
      renderSectionHeader("【教案視覺圖表】");

      try {
        const imgX = MARGIN_LEFT + (CONTENT_WIDTH - drawWidth) / 2;
        doc.image(parsedImage.buffer, imgX, doc.y, {
          width: drawWidth,
          height: drawHeight,
        });
        doc.y += drawHeight + 14;
      } catch {
        doc
          .font(FONT_REGULAR)
          .fontSize(10)
          .fillColor(MUTED_COLOR)
          .text("（視覺圖表載入失敗）", MARGIN_LEFT, doc.y);
        doc.y += 12;
      }
    }

    renderRichSection("【教案內容說明】", plan.content);

    if (!isScriptMode && htmlToStructuredLines(plan.divisionOfLabor).length > 0) {
      renderRichSection("【分工】", plan.divisionOfLabor);
    }

    // ── Props Table (auto-paginated) ──
    const propsRows = (plan.props || []).filter(
      (p) => p.name || p.quantity || p.unit || p.remarks
    );

    renderSectionHeader("【道具表】");

    if (propsRows.length === 0) {
      doc
        .font(FONT_REGULAR)
        .fontSize(10)
        .fillColor(MUTED_COLOR)
        .text("目前無道具資訊", MARGIN_LEFT, doc.y, { width: CONTENT_WIDTH });
      doc.y += 14;
    } else {
      const colWidths = [180, 56, 62, CONTENT_WIDTH - 180 - 56 - 62];
      const headers = ["項目名稱", "數量", "單位", "備註"];
      const cellPadX = 7;
      const cellPadY = 6;
      const headerHeight = 26;

      const drawTableHeader = () => {
        if (doc.y + headerHeight + 24 > PAGE_BOTTOM) {
          doc.addPage();
        }
        const startY = doc.y;
        let x = MARGIN_LEFT;
        headers.forEach((headerText, idx) => {
          const w = colWidths[idx];
          doc.save();
          doc.rect(x, startY, w, headerHeight).fillAndStroke(PRIMARY_COLOR, PRIMARY_COLOR);
          doc.restore();
          doc
            .font(FONT_BOLD)
            .fontSize(9.5)
            .fillColor("#FFFFFF")
            .text(headerText, x + cellPadX, startY + 7, {
              width: w - cellPadX * 2,
              align: "center",
              lineBreak: false,
            });
          x += w;
        });
        doc.y = startY + headerHeight;
      };

      drawTableHeader();

      propsRows.forEach((prop, rowIdx) => {
        const values = [
          cleanPlainText(prop.name, "—"),
          cleanPlainText(prop.quantity, "—"),
          cleanPlainText(prop.unit === "custom" ? "" : prop.unit, "—"),
          cleanPlainText(prop.remarks, "—"),
        ];

        doc.font(FONT_REGULAR).fontSize(9.5);
        const heights = values.map((val, colIdx) =>
          doc.heightOfString(val, {
            width: colWidths[colIdx] - cellPadX * 2,
            lineGap: 2,
          })
        );
        const rowHeight = Math.max(24, Math.max(...heights) + cellPadY * 2);

        if (doc.y + rowHeight > PAGE_BOTTOM) {
          doc.addPage();
          drawTableHeader();
        }

        const rowY = doc.y;
        const rowBg = rowIdx % 2 === 1 ? ALT_ROW_BG : "#FFFFFF";
        let x = MARGIN_LEFT;

        values.forEach((val, colIdx) => {
          const w = colWidths[colIdx];
          doc.save();
          doc.rect(x, rowY, w, rowHeight).fillAndStroke(rowBg, BORDER_COLOR);
          doc.restore();

          doc
            .font(FONT_REGULAR)
            .fontSize(9.5)
            .fillColor(TEXT_COLOR)
            .text(val, x + cellPadX, rowY + cellPadY, {
              width: w - cellPadX * 2,
              align: colIdx === 1 || colIdx === 2 ? "center" : "left",
              lineGap: 2,
            });
          x += w;
        });

        doc.y = rowY + rowHeight;
      });

      doc.y += 14;
    }

    if (!isScriptMode) {
      renderRichSection("【開場與結語】", plan.openingClosingRemarks);
    }
    renderRichSection("【備註】", plan.remarks);

    // ── Page Footers ──
    const pageRange = doc.bufferedPageRange();
    for (let i = 0; i < pageRange.count; i++) {
      doc.switchToPage(pageRange.start + i);
      const savedBottomMargin = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;

      const footerY = A4_HEIGHT - 34;
      doc.save();
      doc
        .moveTo(MARGIN_LEFT, footerY - 6)
        .lineTo(A4_WIDTH - MARGIN_RIGHT, footerY - 6)
        .lineWidth(0.5)
        .strokeColor(BORDER_COLOR)
        .stroke();
      doc.restore();

      doc
        .font(FONT_REGULAR)
        .fontSize(8.5)
        .fillColor(MUTED_COLOR)
        .text(fullTitle, MARGIN_LEFT, footerY, {
          width: CONTENT_WIDTH - 90,
          lineBreak: false,
          ellipsis: true,
        });

      doc
        .font(FONT_REGULAR)
        .fontSize(8.5)
        .fillColor(MUTED_COLOR)
        .text(`第 ${i + 1} 頁 / 共 ${pageRange.count} 頁`, MARGIN_LEFT, footerY, {
          width: CONTENT_WIDTH,
          align: "right",
          lineBreak: false,
        });

      doc.page.margins.bottom = savedBottomMargin;
    }

    doc.end();
  });
}
