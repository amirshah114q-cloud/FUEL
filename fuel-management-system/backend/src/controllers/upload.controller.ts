import { Response } from 'express';
import { AuthRequest } from '../types';
import { storageService } from '../services/storage.service';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

export async function uploadSlip(req: AuthRequest, res: Response): Promise<void> {
  if (!req.file) {
    throw ApiError.badRequest(
      'No file received. Please attach the fuel slip as form-data with field name "file".'
    );
  }

  const stored = await storageService.saveSlipFile(req.file);

  const host =
    env.PUBLIC_BASE_URL && env.PUBLIC_BASE_URL !== ''
      ? env.PUBLIC_BASE_URL
      : `${req.protocol}://${req.get('host')}`;

  res.status(201).json({
    success: true,
    message: 'Slip uploaded successfully.',
    data: {
      fileName: stored.fileName,
      // Relative path — store this in fuel entry slipImageUrl
      filePath: stored.filePath,
      // Absolute URL — convenient for direct viewing/testing
      fileUrl: `${host.replace(/\/+$/, '')}${stored.filePath}`,
      originalFileName: stored.originalName,
      mimeType: stored.mimeType,
      size: stored.size
    }
  });
}