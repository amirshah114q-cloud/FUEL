import { Router } from 'express';
import * as driverController from '../controllers/driver.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { validateBody, validateObjectId } from '../middleware/validate';
import { createDriverSchema, updateDriverSchema } from '../validators/driver.validator';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(requireAuth);

router.get('/', requireRole('admin', 'accountant'), asyncHandler(driverController.listDrivers));
router.get(
  '/:id',
  requireRole('admin', 'accountant'),
  validateObjectId('id'),
  asyncHandler(driverController.getDriver)
);
router.post('/', requireRole('admin'), validateBody(createDriverSchema), asyncHandler(driverController.createDriver));
router.put(
  '/:id',
  requireRole('admin'),
  validateObjectId('id'),
  validateBody(updateDriverSchema),
  asyncHandler(driverController.updateDriver)
);
router.delete('/:id', requireRole('admin'), validateObjectId('id'), asyncHandler(driverController.deleteDriver));

export default router;