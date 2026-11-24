import type { Paragraph, Table } from "docx";
import { decodeRichImage, imageDisplayWidth, parseRichBlocks, type RichBlock } from "@/lib/rich-export";

export function createRichDocxRenderer(docx: typeof import("docx")) {
  let listInstance = 0;
  const alignment = {
    left: docx.AlignmentType.LEFT,
    center: docx.AlignmentType.CENTER,
    right: docx.AlignmentType.RIGHT,
    justify: docx.AlignmentType.JUSTIFIED,
  };
  const numbering = {
    config: [{
      reference: "rich-numbering",
      levels: Array.from({ length: 9 }, (_, level) => ({
        level,
        format: docx.LevelFormat.DECIMAL,
        text: "%" + (level + 1) + ".",
        alignment: docx.AlignmentType.LEFT,
        style: { paragraph: { indent: { left: (level + 1) * 360, hanging: 260 } } },
      })),
    }],
  };

  function section(html?: string | null) {
    const listInstances = new Map<number, number>();
    function render(blocks: RichBlock[], availableWidth: number): Array<Paragraph | Table> {
      return blocks.map((block) => {
        if (block.type === "table") {
          const columnCount = Math.max(block.widths.length, ...block.rows.map((row) => row.reduce((sum, cell) => sum + cell.columns, 0)));
          const sizes = Array.from({ length: columnCount }, (_, index) =>
            imageDisplayWidth(block.widths[index], availableWidth, availableWidth / columnCount));
          const total = sizes.reduce((sum, width) => sum + width, 0);
          return new docx.Table({
            layout: docx.TableLayoutType.FIXED,
            width: { size: 100, type: docx.WidthType.PERCENTAGE },
            columnWidths: sizes.map((size) => Math.round(availableWidth * 15 * size / total)),
            rows: block.rows.map((row) => new docx.TableRow({
              children: row.map((cell) => new docx.TableCell({
                columnSpan: cell.columns,
                rowSpan: cell.rows,
                margins: { left: 90, right: 90, top: 70, bottom: 70 },
                shading: cell.header ? { fill: "F5F5F4" } : undefined,
                children: cell.blocks.length ? render(cell.blocks, availableWidth * cell.columns / columnCount)
                  : [new docx.Paragraph({})],
              })),
            })),
          });
        }
        if (block.type === "image") {
          const image = decodeRichImage(block.src);
          if (!image) {
            const children = /^https?:\/\//i.test(block.src)
              ? [new docx.ExternalHyperlink({ link: block.src, children: [new docx.TextRun({ text: block.alt, style: "Hyperlink" })] })]
              : [new docx.TextRun({ text: "[" + block.alt + "]" })];
            return new docx.Paragraph({ children, alignment: alignment[block.align] });
          }
          const width = Math.min(imageDisplayWidth(block.width, availableWidth, image.width), 660 * image.width / image.height);
          return new docx.Paragraph({
            children: [new docx.ImageRun({
              data: image.bytes,
              type: image.type,
              transformation: { width: Math.max(1, Math.round(width)), height: Math.max(1, Math.round(width * image.height / image.width)) },
              altText: { title: block.alt, description: block.alt, name: block.alt },
            })],
            alignment: alignment[block.align],
            spacing: { after: 120 },
          });
        }
        const children = block.runs.flatMap(({ text, font, size, color, background, bold, italic, underline, strike }) =>
          text.split("\n").map((line, index) => new docx.TextRun({
            text: line,
            break: index ? 1 : undefined,
            font: font ? { ascii: font, hAnsi: font, eastAsia: font } : undefined,
            size: Math.round((size ?? 16) * 1.5),
            color: color ?? "1E293B",
            shading: background ? { fill: background } : undefined,
            bold, italics: italic, underline: underline ? {} : undefined, strike,
          }))
        );
        const list = block.list;
        const level = Math.min(8, list?.level ?? 0);
        if (list?.type === "number" && !listInstances.has(list.group)) listInstances.set(list.group, ++listInstance);
        return new docx.Paragraph({
          children,
          alignment: alignment[block.align],
          bullet: list?.type === "bullet" ? { level } : undefined,
          numbering: list?.type === "number" ? { reference: "rich-numbering", level, instance: listInstances.get(list.group) } : undefined,
          spacing: { after: 90 },
        });
      });
    }
    const blocks = parseRichBlocks(html);
    return blocks.length ? render(blocks, 600) : [new docx.Paragraph({ text: "無內容" })];
  }
  return { section, numbering };
}
