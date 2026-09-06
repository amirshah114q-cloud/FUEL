import { Response } from 'express';
import { AuthRequest } from '../types';
import { buildMonthlyReport } from '../services/report.service';
import { generateMonthlyReportPdf } from '../services/pdf/reportPdf';
import { getQueryParams } from '../utils/query';

/** GET /api/reports/monthly — JSON report (totals, breakdowns, full rows). */
export async function getMonthlyReport(req: AuthRequest, res: Response): Promise<void> {
  const report = await buildMonthlyReport(getQueryParams(req));
  res.status(200).json({ success: true, data: report });
}

/**
 * GET /api/reports/monthly/pdf — streamed PDF.
 * ?download=1 switches Content-Disposition from inline to attachment.
 */
export async function getMonthlyReportPdf(req: AuthRequest, res: Response): Promise<void> {
  const queryParams = getQueryParams(req);
  const report = await buildMonthlyReport(queryParams);
  const pdfBuffer = await generateMonthlyReportPdf(report);

  const fileName = `fuel-expense-report-${report.month}.pdf`;
  const disposition = queryParams.download === '1' ? 'attachment' : 'inline';

  res.status(200);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `${disposition}; filename="${fileName}"`);
  res.setHeader('Cache-Control', 'no-store');
  res.send(pdfBuffer);
}