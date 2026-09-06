import PDFDocument from 'pdfkit';
import { MonthlyReport } from '../report.service';

/* ---------------------------------------------------------------------------
 * Professional monthly report PDF (pdfkit).
 * A4 landscape, navy/amber brand palette matching the mobile app.
 * Safe for international text: all strings are sanitized to Latin-1 and
 * truncated with ellipsis to their column widths.
 * ------------------------------------------------------------------------- */

const NAVY = '#1C3F60';
const AMBER = '#E8850C';
const TEXT = '#1F2937';
const MUTED = '#5B6470';
const BORDER = '#DDE3EA';
const ZEBRA = '#F2F5F9';
const SOFT = '#E8EFF6';

const PAGE_MARGIN = 36;
const FOOTER_RESERVE = 34;
const ROW_H = 16;
const FONT = 'Helvetica';
const FONT_BOLD = 'Helvetica-Bold';

interface Column {
  header: string;
  width: number;
  align: 'left' | 'center' | 'right';
}

const ENTRIES_COLUMNS: Column[] = [
  { header: 'Date', width: 46, align: 'left' },
  { header: 'Time', width: 36, align: 'center' },
  { header: 'Driver', width: 100, align: 'left' },
  { header: 'Vehicle', width: 62, align: 'left' },
  { header: 'Petrol Pump', width: 222, align: 'left' },
  { header: 'Fuel', width: 40, align: 'center' },
  { header: 'Liters', width: 48, align: 'right' },
  { header: 'Price/L', width: 54, align: 'right' },
  { header: 'Total (Rs)', width: 64, align: 'right' },
  { header: 'Receipt No', width: 98, align: 'left' }
];

const DRIVER_COLUMNS: Column[] = [
  { header: 'Driver', width: 210, align: 'left' },
  { header: 'Employee ID', width: 120, align: 'left' },
  { header: 'Entries', width: 80, align: 'center' },
  { header: 'Liters', width: 110, align: 'right' },
  { header: 'Expense (Rs)', width: 130, align: 'right' },
  { header: 'Share', width: 120, align: 'right' }
];

const VEHICLE_COLUMNS: Column[] = [
  { header: 'Vehicle', width: 120, align: 'left' },
  { header: 'Type / Model', width: 210, align: 'left' },
  { header: 'Entries', width: 80, align: 'center' },
  { header: 'Liters', width: 110, align: 'right' },
  { header: 'Expense (Rs)', width: 130, align: 'right' },
  { header: 'Share', width: 120, align: 'right' }
];

/* ── helpers ──────────────────────────────────────────────────────────── */

function sanitize(value: unknown): string {
  return String(value ?? '')
    .replace(/[–—]/g, '-')
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/•/g, '*')
    .replace(/[^\x20-\x7E]/g, '')
    .trim();
}

function fit(
  doc: PDFKit.PDFDocument,
  text: string,
  width: number,
  font: string,
  fontSize = 7.5
): string {
  doc.font(font).fontSize(fontSize);
  const value = sanitize(text);
  if (value === '') return '';
  if (doc.widthOfString(value) <= width) return value;
  let truncated = value;
  while (truncated.length > 1 && doc.widthOfString(`${truncated}...`) > width) {
    truncated = truncated.slice(0, -1);
  }
  return `${truncated}...`;
}

function money(value: number): string {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function num(value: number): string {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pct(value: number): string {
  return value.toFixed(1);
}

function dateShort(iso: string): string {
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const [, month, day] = iso.split('-').map(Number);
  return `${day} ${names[month - 1]}`;
}

function contentBottom(doc: PDFKit.PDFDocument): number {
  return doc.page.height - PAGE_MARGIN - FOOTER_RESERVE;
}

function totalWidthOf(columns: Column[]): number {
  return columns.reduce((sum, column) => sum + column.width, 0);
}

function describeFilters(report: MonthlyReport): string {
  const parts: string[] = [];
  if (report.filters.driverName) parts.push(`Driver: ${report.filters.driverName}`);
  if (report.filters.vehicleNumber) parts.push(`Vehicle: ${report.filters.vehicleNumber}`);
  if (report.filters.fuelType) parts.push(`Fuel: ${report.filters.fuelType}`);
  return parts.length > 0 ? `Filters - ${parts.join(' | ')}` : 'All drivers and vehicles';
}

/* ── building blocks ──────────────────────────────────────────────────── */

function drawTableHeader(doc: PDFKit.PDFDocument, columns: Column[], y: number): number {
  const width = totalWidthOf(columns);
  doc.save();
  doc.rect(PAGE_MARGIN, y, width, ROW_H).fill(NAVY);
  doc.font(FONT_BOLD).fontSize(7.5).fillColor('#FFFFFF');
  let x = PAGE_MARGIN;
  for (const column of columns) {
    doc.text(sanitize(column.header), x + 2, y + 5, {
      width: column.width - 4,
      align: column.align,
      lineBreak: false
    });
    x += column.width;
  }
  doc.restore();
  return y + ROW_H;
}

function drawTableRow(
  doc: PDFKit.PDFDocument,
  columns: Column[],
  cells: string[],
  y: number,
  tone: 'normal' | 'zebra' | 'total'
): void {
  const width = totalWidthOf(columns);

  doc.save();
  if (tone === 'zebra') {
    doc.rect(PAGE_MARGIN, y, width, ROW_H).fill(ZEBRA);
  } else if (tone === 'total') {
    doc.rect(PAGE_MARGIN, y, width, ROW_H).fill(SOFT);
    doc.moveTo(PAGE_MARGIN, y).lineTo(PAGE_MARGIN + width, y)
      .lineWidth(1).strokeColor(NAVY).stroke();
  }

  const font = tone === 'total' ? FONT_BOLD : FONT;
  const textColor = tone === 'total' ? NAVY : TEXT;
  const fitted = cells.map((cell, index) => fit(doc, cell, columns[index].width - 6, font));

  let x = PAGE_MARGIN;
  columns.forEach((column, index) => {
    doc.font(font).fontSize(7.5).fillColor(textColor);
    doc.text(fitted[index], x + 2, y + 4.5, {
      width: column.width - 4,
      align: column.align,
      lineBreak: false
    });
    x += column.width;
  });

  doc.moveTo(PAGE_MARGIN, y + ROW_H).lineTo(PAGE_MARGIN + width, y + ROW_H)
    .lineWidth(0.5).strokeColor(BORDER).stroke();
  doc.restore();
}

function drawTable(
  doc: PDFKit.PDFDocument,
  columns: Column[],
  rows: string[][],
  startY: number,
  totals?: string[]
): number {
  let y = drawTableHeader(doc, columns, startY);
  rows.forEach((row, index) => {
    if (y + ROW_H > contentBottom(doc)) {
      doc.addPage();
      y = drawTableHeader(doc, columns, PAGE_MARGIN);
    }
    drawTableRow(doc, columns, row, y, index % 2 === 1 ? 'zebra' : 'normal');
    y += ROW_H;
  });
  if (totals) {
    if (y + ROW_H > contentBottom(doc)) {
      doc.addPage();
      y = drawTableHeader(doc, columns, PAGE_MARGIN);
    }
    drawTableRow(doc, columns, totals, y, 'total');
    y += ROW_H;
  }
  return y + 6;
}

function drawSectionTitle(
  doc: PDFKit.PDFDocument,
  number: string,
  title: string,
  y: number
): number {
  if (y + 40 > contentBottom(doc)) {
    doc.addPage();
    y = PAGE_MARGIN;
  }
  doc.save();
  doc.font(FONT_BOLD).fontSize(11).fillColor(NAVY);
  doc.text(`${number}. ${sanitize(title)}`, PAGE_MARGIN, y, { lineBreak: false });
  doc.moveTo(PAGE_MARGIN, y + 17).lineTo(PAGE_MARGIN + 36, y + 17)
    .lineWidth(2).strokeColor(AMBER).stroke();
  doc.restore();
  return y + 28;
}

function drawSummaryBoxes(
  doc: PDFKit.PDFDocument,
  report: MonthlyReport,
  y: number,
  contentWidth: number
): number {
  const gap = 12;
  const boxWidth = (contentWidth - gap * 3) / 4;
  const boxes = [
    { label: 'TOTAL EXPENSE', value: `Rs ${money(report.totals.amount)}`, color: AMBER },
    { label: 'FUEL USED', value: `${num(report.totals.liters)} L`, color: NAVY },
    { label: 'ENTRIES', value: String(report.totals.entries), color: NAVY },
    { label: 'AVG / ENTRY', value: `Rs ${money(report.totals.averageAmountPerEntry)}`, color: NAVY }
  ];
  boxes.forEach((box, index) => {
    const x = PAGE_MARGIN + index * (boxWidth + gap);
    doc.save();
    doc.roundedRect(x, y, boxWidth, 46, 6).fill(SOFT);
    doc.font(FONT_BOLD).fontSize(6.5).fillColor(MUTED);
    doc.text(box.label, x + 10, y + 9, { width: boxWidth - 20, lineBreak: false });
    doc.font(FONT_BOLD).fontSize(12.5).fillColor(box.color);
    doc.text(fit(doc, box.value, boxWidth - 20, FONT_BOLD, 12.5), x + 10, y + 22, {
      width: boxWidth - 20,
      lineBreak: false
    });
    doc.restore();
  });
  return y + 46 + 18;
}

function drawEmptyNotice(doc: PDFKit.PDFDocument, y: number, message: string, contentWidth: number): number {
  doc.save();
  doc.roundedRect(PAGE_MARGIN, y, contentWidth, 34, 6).fill(ZEBRA);
  doc.font(FONT).fontSize(9).fillColor(MUTED);
  doc.text(sanitize(message), PAGE_MARGIN + 14, y + 12, {
    width: contentWidth - 28,
    align: 'center',
    lineBreak: false
  });
  doc.restore();
  return y + 34 + 14;
}

function drawEntriesTable(doc: PDFKit.PDFDocument, report: MonthlyReport, y: number): number {
  const rows = report.entries.map((entry) => [
    dateShort(entry.date),
    entry.time || '-',
    entry.driverName,
    entry.vehicleNumber,
    entry.petrolPumpName,
    entry.fuelType,
    num(entry.liters),
    num(entry.pricePerLiter),
    money(entry.totalAmount),
    entry.receiptNumber || '-'
  ]);
  const totals = [
    '', '', '', '', 'TOTALS', '',
    num(report.totals.liters), '', money(report.totals.amount), ''
  ];
  return drawTable(doc, ENTRIES_COLUMNS, rows, y, report.totals.entries > 0 ? totals : undefined);
}

function drawDriverTable(doc: PDFKit.PDFDocument, report: MonthlyReport, y: number): number {
  const rows = report.byDriver.map((row) => [
    row.label,
    row.sublabel,
    String(row.entries),
    num(row.liters),
    money(row.amount),
    `${pct(row.sharePercent)}%`
  ]);
  const totals = [
    'TOTAL', '', String(report.totals.entries),
    num(report.totals.liters), money(report.totals.amount), '100.0%'
  ];
  return drawTable(doc, DRIVER_COLUMNS, rows, y, report.byDriver.length > 0 ? totals : undefined);
}

function drawVehicleTable(doc: PDFKit.PDFDocument, report: MonthlyReport, y: number): number {
  const rows = report.byVehicle.map((row) => [
    row.label,
    row.sublabel,
    String(row.entries),
    num(row.liters),
    money(row.amount),
    `${pct(row.sharePercent)}%`
  ]);
  const totals = [
    'TOTAL', '', String(report.totals.entries),
    num(report.totals.liters), money(report.totals.amount), '100.0%'
  ];
  return drawTable(doc, VEHICLE_COLUMNS, rows, y, report.byVehicle.length > 0 ? totals : undefined);
}

function drawSummaryPanel(
  doc: PDFKit.PDFDocument,
  report: MonthlyReport,
  y: number,
  contentWidth: number
): number {
  const rows: Array<{ label: string; value: string; bold?: boolean; color?: string }> = [
    { label: 'Total Entries', value: String(report.totals.entries) },
    { label: 'Total Fuel Used', value: `${num(report.totals.liters)} L` },
    { label: 'Total Expense', value: `Rs ${money(report.totals.amount)}`, bold: true, color: AMBER },
    { label: 'Average Expense per Entry', value: `Rs ${money(report.totals.averageAmountPerEntry)}` }
  ];
  for (const fuel of report.byFuelType) {
    rows.push({
      label: `${fuel.fuelType} (${fuel.entries} ${fuel.entries === 1 ? 'entry' : 'entries'}) - ${pct(fuel.sharePercent)}% of expense`,
      value: `${num(fuel.liters)} L  |  Rs ${money(fuel.amount)}`
    });
  }

  const panelHeight = 14 + rows.length * 15 + 22;
  if (y + panelHeight > contentBottom(doc)) {
    doc.addPage();
    y = PAGE_MARGIN;
  }

  doc.save();
  doc.roundedRect(PAGE_MARGIN, y, contentWidth, panelHeight, 8)
    .lineWidth(1).strokeColor(BORDER).fillColor('#FFFFFF').fillAndStroke();

  let ry = y + 12;
  for (const row of rows) {
    doc.font(FONT).fontSize(8.5).fillColor(MUTED);
    doc.text(fit(doc, row.label, contentWidth - 220, row.bold ? FONT_BOLD : FONT, 8.5), PAGE_MARGIN + 14, ry, {
      lineBreak: false
    });
    doc.font(FONT_BOLD).fontSize(8.5).fillColor(row.color ?? TEXT);
    doc.text(row.value, PAGE_MARGIN + 14, ry, {
      width: contentWidth - 28,
      align: 'right',
      lineBreak: false
    });
    ry += 15;
  }

  doc.font(FONT).fontSize(7).fillColor(MUTED);
  doc.text(
    'Rejected entries are excluded. Figures are derived from driver-verified fuel entries with attached slips.',
    PAGE_MARGIN + 14,
    ry + 2,
    { width: contentWidth - 28, lineBreak: false }
  );
  doc.restore();
  return y + panelHeight + 8;
}

/* ── page rendering ───────────────────────────────────────────────────── */

function renderReport(doc: PDFKit.PDFDocument, report: MonthlyReport): void {
  const pageWidth = doc.page.width;
  const contentWidth = pageWidth - PAGE_MARGIN * 2;

  // Branded header band (first page only)
  doc.save();
  doc.rect(0, 0, pageWidth, 78).fill(NAVY);
  doc.rect(0, 78, pageWidth, 4).fill(AMBER);

  doc.font(FONT_BOLD).fontSize(16).fillColor('#FFFFFF');
  doc.text('FUEL EXPENSE & SLIP MANAGEMENT REPORT', PAGE_MARGIN, 16, { lineBreak: false });
  doc.font(FONT).fontSize(9).fillColor('#C9D4E0');
  doc.text('Medicine Distribution Fleet', PAGE_MARGIN, 40, { lineBreak: false });
  doc.font(FONT).fontSize(8).fillColor('#9FB0C3');
  doc.text('Official monthly record for office use and printing', PAGE_MARGIN, 54, { lineBreak: false });

  doc.font(FONT_BOLD).fontSize(15).fillColor(AMBER);
  doc.text(report.monthLabel, PAGE_MARGIN, 20, { width: contentWidth, align: 'right', lineBreak: false });
  doc.font(FONT).fontSize(8).fillColor('#C9D4E0');
  doc.text(`Generated ${report.generatedAtLabel}`, PAGE_MARGIN, 42, {
    width: contentWidth, align: 'right', lineBreak: false
  });
  doc.font(FONT).fontSize(8).fillColor('#9FB0C3');
  doc.text(fit(doc, describeFilters(report), contentWidth - 300, FONT, 8), PAGE_MARGIN, 56, {
    width: contentWidth, align: 'right', lineBreak: false
  });
  doc.restore();

  let y = 96;

  y = drawSummaryBoxes(doc, report, y, contentWidth);

  y = drawSectionTitle(doc, '1', `Fuel Entries (${report.totals.entries})`, y);
  if (report.entries.length === 0) {
    y = drawEmptyNotice(doc, y, `No fuel entries were recorded for ${report.monthLabel}.`, contentWidth);
  } else {
    y = drawEntriesTable(doc, report, y);
  }

  y = drawSectionTitle(doc, '2', 'Driver-wise Breakdown', y);
  if (report.byDriver.length === 0) {
    y = drawEmptyNotice(doc, y, 'No driver data for this period.', contentWidth);
  } else {
    y = drawDriverTable(doc, report, y);
  }

  y = drawSectionTitle(doc, '3', 'Vehicle-wise Summary', y);
  if (report.byVehicle.length === 0) {
    y = drawEmptyNotice(doc, y, 'No vehicle data for this period.', contentWidth);
  } else {
    y = drawVehicleTable(doc, report, y);
  }

  y = drawSectionTitle(doc, '4', 'Total Expense Summary', y);
  drawSummaryPanel(doc, report, y, contentWidth);
}

/** Stamps the footer (rule + system line + page X of Y) onto every page. */
function stampFooters(doc: PDFKit.PDFDocument, report: MonthlyReport): void {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const height = doc.page.height;
    const width = doc.page.width;

    doc.save();
    doc.moveTo(PAGE_MARGIN, height - 30).lineTo(width - PAGE_MARGIN, height - 30)
      .lineWidth(0.5).strokeColor(BORDER).stroke();
    doc.font(FONT).fontSize(7).fillColor(MUTED);
    doc.text(
      `Fuel Expense & Slip Management System  |  ${report.monthLabel}`,
      PAGE_MARGIN,
      height - 24,
      { lineBreak: false }
    );
    doc.text(`Page ${i - range.start + 1} of ${range.count}`, PAGE_MARGIN, height - 24, {
      width: width - PAGE_MARGIN * 2,
      align: 'right',
      lineBreak: false
    });
    doc.restore();
  }
}

/**
 * Renders the monthly report and resolves with the complete PDF buffer.
 * bufferPages: true is required so pages can be revisited for footers.
 */
export async function generateMonthlyReportPdf(report: MonthlyReport): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: PAGE_MARGIN,
        bufferPages: true,
        info: {
          Title: `Fuel Expense Report - ${report.monthLabel}`,
          Author: 'Fuel Expense & Slip Management System',
          Subject: 'Monthly fuel expense and slip management report',
          Creator: 'Fuel Management API'
        }
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err: Error) => reject(err));

      renderReport(doc, report);
      stampFooters(doc, report);
      doc.end();
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}