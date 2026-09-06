import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { ensureUploadsDir, getUploadsPath } from '../middleware/upload';

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'application/pdf': '.pdf'
};

export interface StoredFileInfo {
  fileName: string;
  /** Relative path stored in the DB, e.g. "/uploads/slip-123.png". The client prepends its API base URL. */
  filePath: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface UploadFilePayload {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

export interface StorageService {
  saveSlipFile(file: UploadFilePayload): Promise<StoredFileInfo>;
  deleteSlipFile(filePath: string): Promise<void>;
}

/**
 * Local disk implementation. To move to AWS S3 or Cloudinary later,
 * implement this interface with the cloud provider and swap the export
 * below — no controller or route changes are needed.
 */
class LocalDiskStorageService implements StorageService {
  public async saveSlipFile(file: UploadFilePayload): Promise<StoredFileInfo> {
    ensureUploadsDir();
    const extension = EXTENSION_BY_MIME[file.mimetype] ?? '.bin';
    const fileName = `slip-${Date.now()}-${randomUUID()}${extension}`;
    await fs.promises.writeFile(path.join(getUploadsPath(), fileName), file.buffer);

    return {
      fileName,
      filePath: `/uploads/${fileName}`,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size
    };
  }

  public async deleteSlipFile(filePath: string): Promise<void> {
    // path.basename() protects against path traversal in stored URLs
    const fileName = path.basename(filePath);
    const fullPath = path.join(getUploadsPath(), fileName);
    try {
      await fs.promises.unlink(fullPath);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT') throw error;
    }
  }
}

export const storageService: StorageService = new LocalDiskStorageService();