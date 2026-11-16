import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { LessonPlan } from "@/types/plan";
import { stripHtml } from "@/lib/utils";
import {
  buildContentDispositionHeader,
  buildPlanBaseFileName,
  deduplicateFileName,
  htmlToPlainText,
  resolvePlanMembers,
  stripInvalidXmlChars,
} from "@/lib/export-filename";
import { generatePlanPdfBuffer } from "@/lib/pdf-generator";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const PDF_MIME = "application/pdf";
const ZIP_MIME = "application/zip";

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

const buildDocxBuffer = async (plan: LessonPlan) => {
  const scheduledName = stripHtml(stripInvalidXmlChars(plan.scheduledName)).trim() || "教案";
  const activityName = stripHtml(stripInvalidXmlChars(plan.activityName)).trim() || "未命名教案";
  const isScriptMode = scheduledName === "劇本";
  const membersText = resolvePlanMembers(plan);

  const propsRows = (plan.props || []).filter((p) => p.name || p.quantity || p.unit || p.remarks);

  const propsTable =
    propsRows.length > 0
      ? new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: "項目名稱", alignment: AlignmentType.CENTER })] }),
                new TableCell({ children: [new Paragraph({ text: "數量", alignment: AlignmentType.CENTER })] }),
                new TableCell({ children: [new Paragraph({ text: "單位", alignment: AlignmentType.CENTER })] }),
                new TableCell({ children: [new Paragraph({ text: "備註", alignment: AlignmentType.CENTER })] }),
              ],
            }),
            ...propsRows.map(
              (item) =>
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph(stripHtml(stripInvalidXmlChars(item.name)))] }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          text: stripHtml(stripInvalidXmlChars(item.quantity)),
                          alignment: AlignmentType.CENTER,
                        }),
                      ],
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          text: item.unit === "custom" ? "" : stripHtml(stripInvalidXmlChars(item.unit)),
                          alignment: AlignmentType.CENTER,
                        }),
                      ],
                    }),
                    new TableCell({ children: [new Paragraph(stripHtml(stripInvalidXmlChars(item.remarks)))] }),
                  ],
                })
            ),
          ],
        })
      : new Paragraph({ text: "目前無道具資訊" });

  const children: Array<Paragraph | Table> = [
    new Paragraph({
      children: [
        new TextRun({
          text: `${scheduledName} - ${activityName}`,
          bold: true,
          size: 36,
        }),
      ],
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 280 },
    }),
  ];

  if (!isScriptMode) {
    children.push(
      sectionTitle("【教案成員】"),
      ...sectionBody(membersText),
      sectionTitle("【教案時間】"),
      ...sectionBody(plan.time || "無"),
      sectionTitle("【教案地點】"),
      ...sectionBody(plan.location || "無")
    );
  }

  children.push(sectionTitle("【教案目的】"), ...sectionBody(plan.purpose));

  if (!isScriptMode) {
    children.push(sectionTitle("【教案流程】"), ...sectionBody(plan.process));
  }

  if (plan.canvasImage && typeof plan.canvasImage === "string") {
    const imgMatch = plan.canvasImage.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/i);
    if (imgMatch?.[2]) {
      try {
        const imgBuffer = Buffer.from(imgMatch[2], "base64");
        const imgType = imgMatch[1].toLowerCase() === "png" ? "png" : "jpg";
        children.push(
          sectionTitle("【教案視覺圖表】"),
          new Paragraph({
            children: [
              new ImageRun({
                data: imgBuffer,
                type: imgType,
                transformation: { width: 580, height: 340 },
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 120, after: 240 },
          })
        );
      } catch (e) {
        console.warn("Failed to embed canvasImage in server docx", e);
      }
    }
  }

  children.push(sectionTitle("【教案內容說明】"), ...sectionBody(plan.content));

  if (!isScriptMode && htmlToPlainText(plan.divisionOfLabor)) {
    children.push(sectionTitle("【分工】"), ...sectionBody(plan.divisionOfLabor));
  }

  children.push(sectionTitle("【道具表】"), propsTable, sectionTitle("【備註】"), ...sectionBody(plan.remarks));

  if (!isScriptMode) {
    children.push(sectionTitle("【開場結語】"), ...sectionBody(plan.openingClosingRemarks));
  }

  const doc = new Document({
    sections: [
      {
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const plans = body?.plans as LessonPlan[] | undefined;
    const plan = body?.plan as LessonPlan | undefined;
    const format = body?.format as "word" | "pdf" | undefined;

    if (Array.isArray(plans) && plans.length > 0 && (format === "word" || format === "pdf")) {
      const zip = new JSZip();
      const usedNames = new Set<string>();

      for (const item of plans) {
        const baseName = buildPlanBaseFileName(item);
        if (format === "word") {
          const docxBuffer = await buildDocxBuffer(item);
          const entryName = deduplicateFileName(baseName, ".docx", usedNames);
          zip.file(entryName, docxBuffer);
        } else {
          const pdfBuffer = await generatePlanPdfBuffer(item);
          const entryName = deduplicateFileName(baseName, ".pdf", usedNames);
          zip.file(entryName, pdfBuffer);
        }
      }

      const zipBytes = await zip.generateAsync({ type: "uint8array" });
      const zipFileName = `plans_${format}_${Date.now()}.zip`;

      return new NextResponse(new Uint8Array(zipBytes), {
        headers: {
          "Content-Type": ZIP_MIME,
          "Content-Disposition": buildContentDispositionHeader(zipFileName),
          "Cache-Control": "no-store",
        },
      });
    }

    if (!plan || (format !== "word" && format !== "pdf")) {
      return NextResponse.json({ error: "Missing plan or format" }, { status: 400 });
    }

    const baseName = buildPlanBaseFileName(plan);

    if (format === "word") {
      const docxBuffer = await buildDocxBuffer(plan);
      const fileName = `${baseName}.docx`;
      return new NextResponse(new Uint8Array(docxBuffer), {
        headers: {
          "Content-Type": DOCX_MIME,
          "Content-Disposition": buildContentDispositionHeader(fileName),
          "Cache-Control": "no-store",
        },
      });
    }

    const pdfBuffer = await generatePlanPdfBuffer(plan);
    const fileName = `${baseName}.pdf`;
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": PDF_MIME,
        "Content-Disposition": buildContentDispositionHeader(fileName),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Export API failed", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
