import { createWorker } from 'tesseract.js';
import { OcrInput, OcrProvider, OcrTextResult } from '../ocr.types';
import { logger } from '../../../utils/logger';

type TesseractWorker = Awaited<ReturnType<typeof createWorker>>;

/**
 * Reused singleton worker — creating a worker loads the English language
 * model, so we keep it alive across requests instead of paying that cost
 * per slip. The first recognize() call downloads `eng.traineddata` once
 * (requires internet on the very first run only; it is cached afterwards).
 */
let workerPromise: Promise<TesseractWorker> | null = null;

function getWorker(): Promise<TesseractWorker> {
  if (!workerPromise) {
    logger.info('OCR: starting Tesseract worker (first use may download the English language model)...');
    workerPromise = createWorker('eng');
  }
  return workerPromise;
}

export const tesseractProvider: OcrProvider = {
  name: 'tesseract',
  async extractText(input: OcrInput): Promise<OcrTextResult> {
    if (input.mimeType === 'application/pdf') {
      throw new Error('Tesseract provider cannot read PDFs directly; PDFs are handled by the pdf-text provider.');
    }
    const worker = await getWorker();
    // Buffers are valid Tesseract image sources; cast for the type union.
    const image = input.buffer as unknown as Parameters<TesseractWorker['recognize']>[0];
    const { data } = await worker.recognize(image);
    return {
      text: data.text ?? '',
      confidence: typeof data.confidence === 'number' ? data.confidence : null
    };
  }
};