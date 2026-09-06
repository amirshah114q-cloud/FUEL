import { FuelType } from '../../models/fuelEntry.model';

/** Structured fields extracted from a fuel slip (null = not found → manual entry). */
export interface SlipFields {
  date: string | null;             // YYYY-MM-DD
  time: string | null;             // HH:MM
  petrolPumpName: string | null;
  vehicleNumber: string | null;
  fuelType: FuelType | null;
  liters: number | null;
  pricePerLiter: number | null;
  totalAmount: number | null;
  receiptNumber: string | null;
}

export interface OcrInput {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}

export interface OcrTextResult {
  text: string;
  /** Mean OCR confidence 0–100 when the provider reports it. */
  confidence: number | null;
}

/**
 * OCR provider contract. Tesseract (local) and Google Vision both implement
 * this — swap or add providers without touching controllers/routes.
 */
export interface OcrProvider {
  readonly name: string;
  extractText(input: OcrInput): Promise<OcrTextResult>;
}

export interface OcrOutcome {
  fields: SlipFields;
  rawText: string;
  confidence: number | null;
  provider: string;
  /** Human-readable issues, e.g. scanned PDF with no text layer. */
  warnings: string[];
}

export const EMPTY_SLIP_FIELDS: SlipFields = {
  date: null,
  time: null,
  petrolPumpName: null,
  vehicleNumber: null,
  fuelType: null,
  liters: null,
  pricePerLiter: null,
  totalAmount: null,
  receiptNumber: null
};