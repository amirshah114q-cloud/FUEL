import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Fleet-wide analytics are for the office only — drivers never see these.
router.use(requireAuth, requireRole('admin', 'accountant'));

router.get('/summary', asyncHandler(dashboardController.getSummary));
router.get('/monthly', asyncHandler(dashboardController.getMonthly));
router.get('/daily', asyncHandler(dashboardController.getDaily));
router.get('/vehicle-expenses', asyncHandler(dashboardController.getVehicleExpenses));
router.get('/driver-expenses', asyncHandler(dashboardController.getDriverExpenses));

export default router;