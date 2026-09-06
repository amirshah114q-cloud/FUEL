import { Router } from 'express';
import * as fuelController from '../controllers/fuel.controller';
import * as uploadController from '../controllers/upload.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { validateBody, validateObjectId } from '../middleware/validate';
import { uploadSlipFile } from '../middleware/upload';
import { createFuelEntrySchema, updateFuelEntrySchema } from '../validators/fuel.validator';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(requireAuth);

router.get('/', asyncHandler(fuelController.listFuelEntries));
router.post(
  '/upload-slip',
  requireRole('driver', 'admin'),
  uploadSlipFile,
  asyncHandler(uploadController.uploadSlip)
);
router.get('/:id', validateObjectId('id'), asyncHandler(fuelController.getFuelEntry));
router.post(
  '/',
  requireRole('driver', 'admin'),
  validateBody(createFuelEntrySchema),
  asyncHandler(fuelController.createFuelEntry)
);
router.put(
  '/:id',
  requireRole('admin'),
  validateObjectId('id'),
  validateBody(updateFuelEntrySchema),
  asyncHandler(fuelController.updateFuelEntry)
);
router.delete('/:id', requireRole('admin'), validateObjectId('id'), asyncHandler(fuelController.deleteFuelEntry));

export default router;