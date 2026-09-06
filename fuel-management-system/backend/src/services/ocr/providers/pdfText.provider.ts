import { OcrInput, OcrProvider, OcrTextResult } from '../ocr.types';

/**
 * Extracts the embedded text layer from PDF slips (most PDF invoices from
 * pumps/apps are digitally generated and have a text layer). Scanned,
 * image-only PDFs return empty text — the caller then tells the user to
 * enter the details manually on the review screen.
 *
 * pdf-parse is imported dynamically: its top-level module only runs its
 * self-test when executed as a main script, and a lazy require inside a
 * service function guarantees that never happens.
 */
export const pdfTextProvider: OcrProvider = {
  name: 'pdf-text',
  async extractText(input: OcrInput): Promise<OcrTextResult> {
    if (input.mimeType !== 'application/pdf') {
      throw new Error('The pdf-text provider only handles PDF files.');
    }
    const pdfParse = (await import('pdf-parse')).default;
    const data = await pdfParse(input.buffer);
    return { text: data.text ?? '', confidence: null };
  }
};