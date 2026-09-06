import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as reportController from '../controllers/report.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Reports are office-only — drivers see their own entries in the app.
router.use(requireAuth, requireRole('admin', 'accountant'));

// PDF rendering is CPU + memory heavy: keep a generous but bounded limit.
const pdfLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many report requests. Please wait a few minutes and try again.'
    });
  }
});

router.get('/monthly', asyncHandler(reportController.getMonthlyReport));
router.get('/monthly/pdf', pdfLimiter, asyncHandler(reportController.getMonthlyReportPdf));

export default router;