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
import { saveAs } from "file-saver";
import { LessonPlan } from "@/types/plan";

const PRIMARY_COLOR = "E67E22"; // 活力橘風格
const TEXT_COLOR = "1E293B"; // Slate-800
const BORDER_COLOR = "CBD5E1"; // Slate-300

/**
 * 處理富文本內容中的 HTML 標記，將其轉化為 Word 支援的 Paragraphs
 */
function parseHtmlToDocx(html: string) {
  if (!html) return [new Paragraph({ text: "無內容", spacing: { after: 200 } })];

  const paragraphs: Paragraph[] = [];
  if (typeof document !== 'undefined') {
    const container = document.createElement('div');
    container.innerHTML = html;

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
              text: child.textContent,
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
    return html.split(/<br\/?>|<\/p>|<\/div>/).map(line => new Paragraph({
      children: [new TextRun({ text: line.replace(/<[^>]*>/g, ''), color: TEXT_COLOR, size: 24 })],
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
export async function exportToDocx(plan: LessonPlan, canvasImageData?: string) {
  const children: any[] = [
    // 總標題
    new Paragraph({
      children: [
        new TextRun({
          text: `${plan.scheduledName || ""} - ${plan.activityName || "未命名教案"}`,
          bold: true,
          size: 44, // 22pt
          color: PRIMARY_COLOR,
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 }
    }),
    
    createStyledHeading("【教案成員】"),
    new Paragraph({ 
      children: [new TextRun({ text: plan.members || "無", color: TEXT_COLOR, size: 24 })], 
      spacing: { after: 200 } 
    }),

    createStyledHeading("【教案目的】"),
    ...parseHtmlToDocx(plan.purpose),

    new Paragraph({
      children: [
        new TextRun({ text: "【教案時間】", bold: true, color: PRIMARY_COLOR, size: 24 }),
        new TextRun({ text: ` ${plan.time || "無"}`, color: TEXT_COLOR, size: 24 }),
      ],
      spacing: { before: 200, after: 120 }
    }),

    new Paragraph({
      children: [
        new TextRun({ text: "【教案地點】", bold: true, color: PRIMARY_COLOR, size: 24 }),
        new TextRun({ text: ` ${plan.location || "無"}`, color: TEXT_COLOR, size: 24 }),
      ],
      spacing: { before: 120, after: 300 }
    }),
    
    createStyledHeading("【教案流程】"),
    ...parseHtmlToDocx(plan.process),
  ];

  // 如果有畫布圖片
  if (canvasImageData) {
    children.push(createStyledHeading("【教案視覺圖表】"));
    try {
      const base64Data = canvasImageData.split(',')[1];
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

    createStyledHeading("【分工】"),
    ...parseHtmlToDocx(plan.divisionOfLabor)
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
              children: [new Paragraph({ children: [new TextRun({ text: p.name || "", color: TEXT_COLOR, size: 22 })] })],
              margins: { top: 100, bottom: 100, left: 120, right: 120 }
            }),
            new DocxTableCell({ 
              children: [new Paragraph({ children: [new TextRun({ text: p.quantity || "", color: TEXT_COLOR, size: 22 })], alignment: AlignmentType.CENTER })],
              margins: { top: 100, bottom: 100, left: 120, right: 120 }
            }),
            new DocxTableCell({ 
              children: [new Paragraph({ children: [new TextRun({ text: p.unit || "", color: TEXT_COLOR, size: 22 })], alignment: AlignmentType.CENTER })],
              margins: { top: 100, bottom: 100, left: 120, right: 120 }
            }),
            new DocxTableCell({ 
              children: [new Paragraph({ children: [new TextRun({ text: p.remarks || "", color: TEXT_COLOR, size: 22 })], alignment: AlignmentType.CENTER })],
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

    createStyledHeading("【開場結語】"),
    ...parseHtmlToDocx(plan.openingClosingRemarks)
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

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${plan.scheduledName || "教案"}_${plan.activityName || "未命名"}.docx`);
}

/**
 * 觸發瀏覽器列印功能
 */
export function exportToPdf() {
  window.print();
}