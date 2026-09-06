import { env } from '../../../config/env';
import { OcrInput, OcrProvider, OcrTextResult } from '../ocr.types';

/**
 * Google Cloud Vision TEXT_DETECTION via the public REST API (no SDK needed).
 * Activated only when OCR_PROVIDER=google-vision AND GOOGLE_VISION_API_KEY
 * is set; otherwise the service falls back to local Tesseract.
 *
 * Note: this implementation handles images. PDF slips always go through the
 * pdf-text provider (Vision's async files:annotate flow is a future upgrade).
 */
export const googleVisionProvider: OcrProvider = {
  name: 'google-vision',
  async extractText(input: OcrInput): Promise<OcrTextResult> {
    if (!env.GOOGLE_VISION_API_KEY) {
      throw new Error('GOOGLE_VISION_API_KEY is not configured.');
    }
    if (input.mimeType === 'application/pdf') {
      throw new Error('The Google Vision provider in this build handles images only.');
    }

    const base64 = input.buffer.toString('base64');
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${env.GOOGLE_VISION_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [
            {
              image: { content: base64 },
              features: [{ type: 'TEXT_DETECTION' }]
            }
          ]
        })
      }
    );

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Google Vision API error ${response.status}: ${body.slice(0, 200)}`);
    }

    const json = (await response.json()) as {
      responses?: Array<{ fullTextAnnotation?: { text?: string } }>;
    };
    const text = json.responses?.[0]?.fullTextAnnotation?.text ?? '';
    return { text: String(text), confidence: null };
  }
};