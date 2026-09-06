import { z } from 'zod';

const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Must be a valid MongoDB ObjectId.');

export const createVehicleSchema = z.object({
  vehicleNumber: z
    .string({ required_error: 'Vehicle number is required.' })
    .trim()
    .min(2, 'Vehicle number must be at least 2 characters.')
    .max(20)
    .regex(/^[A-Za-z0-9\- ]+$/, 'Vehicle number may only contain letters, numbers, spaces and hyphens.'),
  vehicleType: z
    .string({ required_error: 'Vehicle type is required.' })
    .trim()
    .min(2, 'Vehicle type must be at least 2 characters.')
    .max(50),
  model: z
    .string({ required_error: 'Vehicle model is required.' })
    .trim()
    .min(2, 'Model must be at least 2 characters.')
    .max(100),
  assignedDriverId: objectId.nullish(),
  isActive: z.boolean().optional()
});

export const updateVehicleSchema = createVehicleSchema.partial();