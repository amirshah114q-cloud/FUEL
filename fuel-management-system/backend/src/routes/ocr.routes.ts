import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as ocrController from '../controllers/ocr.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { uploadSlipFile } from '../middleware/upload';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// OCR is CPU-heavy: 60 requests per hour per IP is generous for real drivers
const ocrLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many OCR requests. Please wait a few minutes and try again.'
    });
  }
});

router.post(
  '/process',
  requireAuth,
  requireRole('driver', 'admin'),
  ocrLimiter,
  uploadSlipFile,
  asyncHandler(ocrController.processSlip)
);

export default router;