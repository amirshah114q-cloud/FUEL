import { Response } from 'express';
import { AuthRequest } from '../types';
import { storageService } from '../services/storage.service';
import { runOcr } from '../services/ocr/ocr.service';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

/**
 * POST /api/ocr/process
 * multipart/form-data, field name "file" (JPG/JPEG/PNG/PDF, ≤ MAX_FILE_SIZE_MB)
 *
 * 1. Persists the slip file via the storage service (so the original slip is
 *    preserved even if OCR fails — it becomes slipImageUrl on the entry).
 * 2. Runs OCR and returns the parsed fields + raw text + warnings.
 * 3. Does NOT create a fuel entry — the driver must review and confirm on
 *    the mobile review screen first (never auto-save OCR results).
 */
export async function processSlip(req: AuthRequest, res: Response): Promise<void> {
  if (!req.file) {
    throw ApiError.badRequest(
      'No file received. Please attach the fuel slip as form-data with field name "file".'
    );
  }

  const stored = await storageService.saveSlipFile(req.file);

  const outcome = await runOcr({
    buffer: req.file.buffer,
    mimeType: stored.mimeType,
    fileName: stored.originalName
  });

  const host =
    env.PUBLIC_BASE_URL && env.PUBLIC_BASE_URL !== ''
      ? env.PUBLIC_BASE_URL
      : `${req.protocol}://${req.get('host')}`;

  const message =
    outcome.warnings.length > 0
      ? 'Slip saved, but OCR could not read it clearly. Please review the highlighted fields and enter them manually.'
      : 'Slip processed successfully. Please review the extracted details before saving.';

  res.status(200).json({
    success: true,
    message,
    data: {
      filePath: stored.filePath,
      fileUrl: `${host.replace(/\/+$/, '')}${stored.filePath}`,
      originalFileName: stored.originalName,
      mimeType: stored.mimeType,
      size: stored.size,
      ocr: {
        fields: outcome.fields,
        rawText: outcome.rawText,
        confidence: outcome.confidence,
        provider: outcome.provider,
        warnings: outcome.warnings
      }
    }
  });
}