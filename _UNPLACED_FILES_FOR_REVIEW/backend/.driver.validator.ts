import { z } from 'zod';

const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Must be a valid MongoDB ObjectId.');

export const createDriverSchema = z.object({
  name: z
    .string({ required_error: 'Driver name is required.' })
    .trim()
    .min(2, 'Name must be at least 2 characters.')
    .max(100),
  phone: z
    .string({ required_error: 'Phone is required.' })
    .trim()
    .min(7, 'Phone must be at least 7 characters.')
    .max(20),
  employeeId: z
    .string({ required_error: 'Employee ID is required.' })
    .trim()
    .min(2, 'Employee ID must be at least 2 characters.')
    .max(30),
  assignedVehicleId: objectId.nullish(),
  isActive: z.boolean().optional()
});

export const updateDriverSchema = createDriverSchema.partial();