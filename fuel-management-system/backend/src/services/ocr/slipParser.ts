import { FuelType } from '../../models/fuelEntry.model';
import { SlipFields } from './ocr.types';

/* ---------------------------------------------------------------------------
 * Heuristic parser that turns raw OCR text (Tesseract / Vision / PDF text)
 * into structured slip fields. Every extractor returns null when unsure —
 * the mobile review screen then highlights that field for manual entry.
 * Real pump slips vary wildly; this parser is deliberately conservative.
 * ------------------------------------------------------------------------- */

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12
};

const BRANDS = [
  'pso', 'shell', 'total', 'caltex', 'hascol', 'attock', 'petromin',
  'hpcl', 'iocl', 'chevron', 'adnoc', 'eni', 'apco'
];

function isValidDate(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (dt.getUTCFullYear() !== year || dt.getUTCMonth() !== month - 1 || dt.getUTCDate() !== day) {
    return null;
  }
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

function clampNumber(value: number | null, min: number, max: number): number | null {
  if (value === null || Number.isNaN(value) || value < min || value > max) return null;
  return value;
}

function cleanPumpName(raw: string): string {
  return raw
    .replace(/[^\w\s&.,'()\-–]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 100);
}

function extractDate(flat: string, lines: string[]): string | null {
  const candidates: string[] = [];
  const contextIdx = lines.findIndex((l) => /\bdate\b/i.test(l));
  if (contextIdx >= 0) candidates.push(lines[contextIdx]);
  candidates.push(flat);

  for (const source of candidates) {
    // ISO style: 2026-06-15
    let m = source.match(/\b(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})\b/);
    if (m) {
      const iso = isValidDate(Number(m[1]), Number(m[2]), Number(m[3]));
      if (iso) return iso;
    }

    // Numeric: 15/06/2026 or 15-06-26 (day-first is the norm on PK/IN slips)
    m = source.match(/\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b/);
    if (m) {
      let day = Number(m[1]);
      let month = Number(m[2]);
      if (month > 12 && day <= 12) {
        const t = day; day = month; month = t; // clearly month-first
      }
      let year = Number(m[3]);
      if (year < 100) year += year > 70 ? 1900 : 2000;
      const iso = isValidDate(year, month, day);
      if (iso) return iso;
    }

    // Textual: 15 Jun 2026 / 15-Jun-26
    m = source.match(/\b(\d{1,2})\s*[/\-\s]\s*([A-Za-z]{3,9})\s*[/\-\s,]?\s*(\d{2,4})\b/);
    if (m) {
      const month = MONTHS[m[2].slice(0, 3).toLowerCase()];
      if (month) {
        let year = Number(m[3]);
        if (year < 100) year += year > 70 ? 1900 : 2000;
        const iso = isValidDate(year, month, Number(m[1]));
        if (iso) return iso;
      }
    }

    // Textual: Jun 15, 2026
    m = source.match(/\b([A-Za-z]{3,9})\s+(\d{1,2})\s*,?\s*(\d{2,4})\b/);
    if (m) {
      const month = MONTHS[m[1].slice(0, 3).toLowerCase()];
      if (month) {
        let year = Number(m[3]);
        if (year < 100) year += year > 70 ? 1900 : 2000;
        const iso = isValidDate(year, month, Number(m[2]));
        if (iso) return iso;
      }
    }
  }
  return null;
}

function extractTime(flat: string): string | null {
  const m = flat.match(/\b([01]?\d|2[0-3])[:.](\d{2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/i);
  if (!m) return null;
  let hour = parseInt(m[1], 10);
  const minute = m[2];
  const meridiem = (m[4] ?? '').replace(/\./g, '').toLowerCase();
  if (meridiem === 'pm' && hour < 12) hour += 12;
  else if (meridiem === 'am' && hour === 12) hour = 0;
  return `${hour.toString().padStart(2, '0')}:${minute}`;
}

function extractFuelType(flat: string): FuelType | null {
  if (/\b(diesel|dsl|hsd|high\s*speed\s*diesel)\b/i.test(flat)) return 'Diesel';
  if (/\b(petrol|gasoline|pmg|mogas|motor\s*spirit)\b/i.test(flat)) return 'Petrol';
  if (/\bms\b/i.test(flat)) return 'Petrol'; // MS = Motor Spirit, common on PK/IN pumps
  return null;
}

function extractLiters(flatNum: string): number | null {
  let m = flatNum.match(/\b(?:qty|quantity|volume|vol)\s*[:\-]?\s*(\d+(?:\.\d+)?)/i);
  if (m) return clampNumber(parseFloat(m[1]), 0.01, 5000);

  m = flatNum.match(/(\d+(?:\.\d+)?)\s*(?:ltrs?|litres?|liters?|lts?)\b/i);
  if (m) return clampNumber(parseFloat(m[1]), 0.01, 5000);

  m = flatNum.match(/\b(?:litres?|liters?|ltrs?)\s*[:\-]?\s*(\d+(?:\.\d+)?)/i);
  if (m) return clampNumber(parseFloat(m[1]), 0.01, 5000);

  return null;
}

function extractRate(flatNum: string): number | null {
  let m = flatNum.match(
    /\b(?:rate|price|unit\s*price|per\s*lit?r?e?|s\.?rate)\s*[:\-]?\s*(?:rs\.?|pkr|inr)?\s*(\d+(?:\.\d+)?)/i
  );
  if (m) return clampNumber(parseFloat(m[1]), 1, 10000);

  // 285.50 /L  or  285.50 per litre
  m = flatNum.match(/(\d+(?:\.\d+)?)\s*(?:\/|per\s*)\s*(?:ltr?|litre|liter)\b/i);
  if (m) return clampNumber(parseFloat(m[1]), 1, 10000);

  return null;
}

function extractTotal(flatNum: string): number | null {
  const patterns = [
    /\b(?:grand\s*total|net\s*amount|total\s*amount|total\s*payable|amount\s*payable|total)\s*[:\-]?\s*(?:rs\.?|pkr|inr)?\s*(\d+(?:\.\d+)?)/i,
    /\b(?:amount|payable|sale\s*value|bill)\s*[:\-]?\s*(?:rs\.?|pkr|inr)?\s*(\d+(?:\.\d+)?)/i
  ];
  for (const pattern of patterns) {
    const m = flatNum.match(pattern);
    if (m) return clampNumber(parseFloat(m[1]), 1, 10000000);
  }
  return null;
}

function extractReceipt(lines: string[], flat: string): string | null {
  const contextLine = lines.find((l) =>
    /\b(invoice|receipt|bill|slip|sale|ref|trans|inv)\b/i.test(l)
  );
  const sources = contextLine ? [contextLine, flat] : [flat];

  for (const source of sources) {
    let m = source.match(
      /\b(?:invoice|inv|receipt|bill|slip|sale|ref|transaction|trans)\s*(?:no\.?|number|#|id)?\s*[:\-#]?\s*([A-Z0-9][A-Z0-9\-/]{2,24})/i
    );
    if (m) return m[1].toUpperCase();

    m = source.match(/\bno\.?\s*[:#\-]?\s*([A-Z0-9][A-Z0-9\-/]{3,24})\b/i);
    if (m) return m[1].toUpperCase();
  }
  return null;
}

function extractVehicle(lines: string[], flat: string): string | null {
  const contextLine = lines.find((l) => /\b(vehicle|veh|reg(?:istration)?)\b/i.test(l));
  if (contextLine) {
    const m = contextLine.match(
      /(?:no\.?|number|#|:|-)?\s*([A-Z]{1,4}[-\s]?\d{1,4}(?:[-\s][A-Z]{1,3})?)/i
    );
    if (m) return m[1].toUpperCase().replace(/\s+/g, '-');
  }

  const upper = flat.toUpperCase();
  const m = upper.match(/\b([A-Z]{2,3}[-\s]?\d{2,4}(?:[-\s][A-Z]{1,3})?)\b/);
  if (m) {
    const token = m[1];
    // Avoid picking up receipt codes / currency codes as plates
    if (!/^(INV|RCP|RS|PKR|INR|NO|PWD)/.test(token)) {
      return token.replace(/\s+/g, '-');
    }
  }
  return null;
}

function extractPumpName(lines: string[]): string | null {
  let best: { score: number; line: string } | null = null;
  for (const line of lines) {
    const lower = line.toLowerCase();
    let score = 0;
    if (BRANDS.some((b) => new RegExp(`\\b${b}\\b`).test(lower))) score += 2;
    if (/(petrol|pump|station|filling|fllling|fuel|energy|mart)/.test(lower)) score += 1;
    if (score >= 2 && line.replace(/[^A-Za-z]/g, '').length >= 4) {
      if (!best || score > best.score) best = { score, line };
    }
  }
  if (best) return cleanPumpName(best.line);

  const stationLine = lines.find((l) =>
    /(petrol\s*(pump|station)|filling\s*station|fuel\s*(station|point)|cng)/i.test(l)
  );
  if (stationLine) return cleanPumpName(stationLine);

  // Fallback: a header-like line among the first three (mostly letters)
  for (const line of lines.slice(0, 3)) {
    const letters = line.replace(/[^A-Za-z]/g, '').length;
    const digits = line.replace(/[^0-9]/g, '').length;
    if (letters >= 6 && digits <= 3) return cleanPumpName(line);
  }
  return null;
}

/**
 * Parses raw slip text into structured fields.
 * NOTE: commas are removed before numeric matching because PK/IN slips
 * commonly use formats like "1,29,90.25".
 */
export function parseFuelSlip(rawText: string): SlipFields {
  const raw = (rawText ?? '').replace(/\r/g, '');
  const lines = raw
    .split('\n')
    .map((l) => l.replace(/\s{2,}/g, ' ').trim())
    .filter((l) => l.length > 0);
  const flat = lines.join('\n');
  const flatNum = flat.replace(/,/g, '');

  return {
    date: extractDate(flat, lines),
    time: extractTime(flat),
    fuelType: extractFuelType(flat),
    liters: extractLiters(flatNum),
    pricePerLiter: extractRate(flatNum),
    totalAmount: extractTotal(flatNum),
    receiptNumber: extractReceipt(lines, flat),
    petrolPumpName: extractPumpName(lines),
    vehicleNumber: extractVehicle(lines, flat)
  };
}