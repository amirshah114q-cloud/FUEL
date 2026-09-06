import { Router } from 'express';
import * as vehicleController from '../controllers/vehicle.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { validateBody, validateObjectId } from '../middleware/validate';
import { createVehicleSchema, updateVehicleSchema } from '../validators/vehicle.validator';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.use(requireAuth);

router.get('/', requireRole('admin', 'accountant'), asyncHandler(vehicleController.listVehicles));
router.get(
  '/:id',
  requireRole('admin', 'accountant'),
  validateObjectId('id'),
  asyncHandler(vehicleController.getVehicle)
);
router.post('/', requireRole('admin'), validateBody(createVehicleSchema), asyncHandler(vehicleController.createVehicle));
router.put(
  '/:id',
  requireRole('admin'),
  validateObjectId('id'),
  validateBody(updateVehicleSchema),
  asyncHandler(vehicleController.updateVehicle)
);
router.delete('/:id', requireRole('admin'), validateObjectId('id'), asyncHandler(vehicleController.deleteVehicle));

export default router;