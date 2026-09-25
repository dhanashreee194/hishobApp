import {PDFDocument, rgb} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type {BuiltReport} from './reports';

export function reportToCsv(report: BuiltReport): string {
  const header = ['काळ', ...report.headers].map(csvCell).join(',');
  const lines = report.rows.map(row => [row.label, ...row.cells].map(csvCell).join(','));
  return `\uFEFF${[report.periodLabel, header, ...lines].join('\n')}\n`;
}

export async function reportToPdf(report: BuiltReport, fontBytes: Uint8Array): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(fontBytes, {subset: true});
  const headers = ['काळ', ...report.headers];
  const pageWidth = headers.length > 4 ? 842 : 595;
  const pageHeight = headers.length > 4 ? 595 : 842;
  const margin = 36;
  const fontSize = headers.length > 5 ? 9 : 11;
  const rowHeight = fontSize + 10;
  const colWidth = (pageWidth - margin * 2) / headers.length;
  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const drawLine = (cells: string[], bold: boolean) => {
    if (y < margin + rowHeight) {
      page = pdf.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
    cells.forEach((cell, index) => {
      const text = fit(cell, font, fontSize, colWidth - 6);
      page.drawText(text, {
        x: margin + index * colWidth,
        y,
        size: bold ? fontSize : fontSize - 1,
        font,
        color: rgb(0.1, 0.1, 0.1),
      });
    });
    y -= rowHeight;
  };

  page.drawText(fit(report.periodLabel, font, 14, pageWidth - margin * 2), {
    x: margin,
    y,
    size: 14,
    font,
    color: rgb(0.12, 0.3, 0.23),
  });
  y -= rowHeight + 6;
  drawLine(headers, true);
  for (const row of report.rows) {
    drawLine([row.label, ...row.cells], false);
  }
  return pdf.save();
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function fit(
  value: string,
  font: {widthOfTextAtSize: (text: string, size: number) => number},
  size: number,
  maxWidth: number,
): string {
  if (font.widthOfTextAtSize(value, size) <= maxWidth) {
    return value;
  }
  let text = value;
  while (text.length > 1 && font.widthOfTextAtSize(`${text}...`, size) > maxWidth) {
    text = text.slice(0, -1);
  }
  return `${text}...`;
}
