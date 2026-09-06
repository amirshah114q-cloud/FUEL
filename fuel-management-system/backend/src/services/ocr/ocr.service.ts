import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import {
  EMPTY_SLIP_FIELDS,
  OcrInput,
  OcrOutcome,
  OcrProvider
} from './ocr.types';
import { tesseractProvider } from './providers/tesseract.provider';
import { googleVisionProvider } from './providers/googleVision.provider';
import { pdfTextProvider } from './providers/pdfText.provider';
import { parseFuelSlip } from './slipParser';

function getImageProvider(): OcrProvider {
  if (env.OCR_PROVIDER === 'google-vision' && env.GOOGLE_VISION_API_KEY) {
    return googleVisionProvider;
  }
  if (env.OCR_PROVIDER === 'google-vision') {
    logger.warn('OCR_PROVIDER is "google-vision" but GOOGLE_VISION_API_KEY is missing — using local Tesseract instead.');
  }
  return tesseractProvider;
}

/**
 * Runs OCR on a slip and parses it into structured fields.
 *
 * Design note: OCR failure is a SOFT failure. The slip file has already been
 * saved by the controller, so we always return a usable OcrOutcome — with
 * empty fields and a warning — and the driver fills the review form
 * manually. A crash in the OCR engine must never block a driver from
 * recording a real fuel purchase.
 */
export async function runOcr(input: OcrInput): Promise<OcrOutcome> {
  if (input.mimeType === 'application/pdf') {
    try {
      const result = await pdfTextProvider.extractText(input);
      if (!result.text.trim()) {
        return {
          fields: EMPTY_SLIP_FIELDS,
          rawText: '',
          confidence: null,
          provider: pdfTextProvider.name,
          warnings: [
            'This PDF has no readable text layer (it looks like a scan). Please enter the slip details manually.'
          ]
        };
      }
      return {
        fields: parseFuelSlip(result.text),
        rawText: result.text,
        confidence: null,
        provider: pdfTextProvider.name,
        warnings: []
      };
    } catch (error) {
      logger.warn(`PDF text extraction failed: ${error instanceof Error ? error.message : String(error)}`);
      return {
        fields: EMPTY_SLIP_FIELDS,
        rawText: '',
        confidence: null,
        provider: pdfTextProvider.name,
        warnings: ['This PDF could not be read. Please enter the slip details manually.']
      };
    }
  }

  const provider = getImageProvider();
  try {
    const result = await provider.extractText(input);
    if (!result.text.trim()) {
      return {
        fields: EMPTY_SLIP_FIELDS,
        rawText: '',
        confidence: result.confidence,
        provider: provider.name,
        warnings: ['OCR could not read this slip clearly. Please review the highlighted fields and enter them manually.']
      };
    }
    return {
      fields: parseFuelSlip(result.text),
      rawText: result.text,
      confidence: result.confidence,
      provider: provider.name,
      warnings: []
    };
  } catch (error) {
    logger.error(`OCR provider "${provider.name}" failed: ${error instanceof Error ? error.message : String(error)}`);
    return {
      fields: EMPTY_SLIP_FIELDS,
      rawText: '',
      confidence: null,
      provider: provider.name,
      warnings: ['OCR could not read this slip clearly. Please review the highlighted fields and enter them manually.']
    };
  }
}