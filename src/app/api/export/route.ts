import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { LessonPlan } from "@/types/plan";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const PDF_MIME = "application/pdf";
const ZIP_MIME = "application/zip";

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

const htmlToPlainText = (html?: string) => {
  const raw = stripInvalidXmlChars(html)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<li>/gi, "\n• ")
    .replace(/<[^>]*>/g, " ");

  return raw
    .replace(/\n\s+/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

const sectionTitle = (label: string) =>
  new Paragraph({
    children: [
      new TextRun({
        text: label,
        bold: true,
        size: 30,
        color: "E67E22",
      }),
    ],
    spacing: { before: 260, after: 120 },
    border: {
      bottom: {
        color: "CBD5E1",
        style: BorderStyle.SINGLE,
        size: 4,
      },
    },
  });

const sectionBody = (value?: string) => {
  const content = htmlToPlainText(value) || "無";
  return content.split("\n").map(
    (line) =>
      new Paragraph({
        children: [new TextRun({ text: line || " ", size: 24, color: "1E293B" })],
        spacing: { after: 80 },
      })
  );
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
  const safeLines = [toAscii(title), ...lines.map((line) => toAscii(line))].flatMap((line) =>
    splitPdfLine(line || " ")
  );

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

const buildDocxBuffer = async (plan: LessonPlan) => {
  const propsRows = (plan.props || []).filter((p) => (p.name || p.quantity || p.unit || p.remarks));

  const propsTable =
    propsRows.length > 0
      ? new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: "名稱", alignment: AlignmentType.CENTER })] }),
                new TableCell({ children: [new Paragraph({ text: "數量", alignment: AlignmentType.CENTER })] }),
                new TableCell({ children: [new Paragraph({ text: "單位", alignment: AlignmentType.CENTER })] }),
                new TableCell({ children: [new Paragraph({ text: "備註", alignment: AlignmentType.CENTER })] }),
              ],
            }),
            ...propsRows.map(
              (item) =>
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph(item.name || "")] }),
                    new TableCell({ children: [new Paragraph({ text: item.quantity || "", alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ text: item.unit || "", alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph(item.remarks || "")] }),
                  ],
                })
            ),
          ],
        })
      : new Paragraph({ text: "目前無道具資訊" });

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: stripInvalidXmlChars(`${plan.scheduledName || "教案"} - ${plan.activityName || "未命名教案"}`),
                bold: true,
                size: 36,
              }),
            ],
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 280 },
          }),
          sectionTitle("【教案成員】"),
          ...sectionBody(plan.members || "無"),
          sectionTitle("【教案時間】"),
          ...sectionBody(plan.time || "無"),
          sectionTitle("【教案地點】"),
          ...sectionBody(plan.location || "無"),
          sectionTitle("【教案目的】"),
          ...sectionBody(plan.purpose),
          sectionTitle("【教案流程】"),
          ...sectionBody(plan.process),
          sectionTitle("【教案內容說明】"),
          ...sectionBody(plan.content),
          sectionTitle("【分工】"),
          ...sectionBody(plan.divisionOfLabor),
          sectionTitle("【道具表】"),
          propsTable,
          sectionTitle("【備註】"),
          ...sectionBody(plan.remarks),
          sectionTitle("【開場結語】"),
          ...sectionBody(plan.openingClosingRemarks),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
};

const buildPdfBuffer = async (plan: LessonPlan): Promise<Uint8Array> => {
  const propsRows = (plan.props || []).filter((p) => p.name || p.quantity || p.unit || p.remarks);
  const propsLines =
    propsRows.length > 0
      ? propsRows.map(
          (item) =>
            `  - ${item.name || "N/A"} | ${item.quantity || ""} ${item.unit || ""} | ${htmlToPlainText(item.remarks) || ""}`
        )
      : ["  - N/A"];

  const lines = [
    "============================================================",
    `Members: ${toAscii(plan.members || "N/A")}`,
    `Time: ${toAscii(plan.time || "N/A")}`,
    `Location: ${toAscii(plan.location || "N/A")}`,
    "============================================================",
    "[Purpose]",
    toAscii(htmlToPlainText(plan.purpose) || "N/A"),
    "",
    "[Process]",
    toAscii(htmlToPlainText(plan.process) || "N/A"),
    "",
    "[Content]",
    toAscii(htmlToPlainText(plan.content) || "N/A"),
    "",
    "[Division Of Labor]",
    toAscii(htmlToPlainText(plan.divisionOfLabor) || "N/A"),
    "",
    "[Props]",
    ...propsLines.map((line) => toAscii(line)),
    "",
    "[Remarks]",
    toAscii(htmlToPlainText(plan.remarks) || "N/A"),
    "",
    "[Opening / Closing]",
    toAscii(htmlToPlainText(plan.openingClosingRemarks) || "N/A"),
  ];

  return buildSimplePdfBytes(
    `${toAscii(plan.scheduledName || "Plan")} - ${toAscii(plan.activityName || "Untitled")}`,
    lines
  );
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const plans = body?.plans as LessonPlan[] | undefined;
    const plan = body?.plan as LessonPlan | undefined;
    const format = body?.format as "word" | "pdf" | undefined;

    if (Array.isArray(plans) && plans.length > 0 && format) {
      const zip = new JSZip();

      for (const item of plans) {
        const baseName = buildPlanBaseFileName(item);
        if (format === "word") {
          const docxBuffer = await buildDocxBuffer(item);
          zip.file(`${baseName}.docx`, docxBuffer);
        } else {
          const pdfBuffer = await buildPdfBuffer(item);
          zip.file(`${baseName}.pdf`, pdfBuffer);
        }
      }

      const zipBytes = await zip.generateAsync({ type: "uint8array" });
      const zipFileName = `plans_${format}_${Date.now()}.zip`;

      return new NextResponse(zipBytes, {
        headers: {
          "Content-Type": ZIP_MIME,
          "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(zipFileName)}`,
          "Cache-Control": "no-store",
        },
      });
    }

    if (!plan || !format) {
      return NextResponse.json({ error: "Missing plan or format" }, { status: 400 });
    }

    const baseName = buildPlanBaseFileName(plan);

    if (format === "word") {
      const docxBuffer = await buildDocxBuffer(plan);
      const fileName = `${baseName}.docx`;
      return new NextResponse(docxBuffer, {
        headers: {
          "Content-Type": DOCX_MIME,
          "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
          "Cache-Control": "no-store",
        },
      });
    }

    const pdfBuffer = await buildPdfBuffer(plan);
    const fileName = `${baseName}.pdf`;
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": PDF_MIME,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Export API failed", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
