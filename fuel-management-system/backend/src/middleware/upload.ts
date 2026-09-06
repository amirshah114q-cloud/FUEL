import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.pdf']);
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']);

export function getUploadsPath(): string {
  return path.resolve(process.cwd(), env.UPLOAD_DIR);
}

export function ensureUploadsDir(): string {
  const dir = getUploadsPath();
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Slip upload configuration:
 *  - Files are buffered in memory (max 10 MB by default) and then persisted by
 *    the StorageService, so storage backends can be swapped without touching
 *    this middleware.
 *  - Both the file extension AND the MIME type must be allowed, which blocks
 *    disguised executables.
 */
const slipUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 1,
    fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname || '').toLowerCase();
    const extensionOk = ALLOWED_EXTENSIONS.has(extension);
    const mimeOk = ALLOWED_MIME_TYPES.has(file.mimetype);

    if (extensionOk && mimeOk) {
      cb(null, true);
      return;
    }
    cb(ApiError.badRequest('Invalid file type. Only JPG, JPEG, PNG and PDF files are allowed.'));
  }
});

export const uploadSlipFile = slipUpload.single('file');