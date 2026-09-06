import { z } from 'zod';
import { USER_ROLES } from '../models/user.model';

const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Must be a valid MongoDB ObjectId.');

export const createUserSchema = z
  .object({
    name: z
      .string({ required_error: 'Name is required.' })
      .trim()
      .min(2, 'Name must be at least 2 characters.')
      .max(100),
    email: z
      .string({ required_error: 'Email is required.' })
      .trim()
      .email('Please enter a valid email address.')
      .max(150),
    phone: z.string().trim().min(7, 'Phone must be at least 7 characters.').max(20).optional(),
    password: z
      .string({ required_error: 'Password is required.' })
      .min(8, 'Password must be at least 8 characters.')
      .max(100),
    role: z.enum(USER_ROLES, {
      errorMap: () => ({ message: 'Role must be one of: admin, accountant, driver.' })
    }),
    driverId: objectId.nullish(),
    isActive: z.boolean().optional()
  })
  .refine((data) => data.role !== 'driver' || !!data.driverId, {
    message: 'driverId is required when the role is "driver".',
    path: ['driverId']
  });

export const updateUserSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(100).optional(),
  email: z.string().trim().email('Please enter a valid email address.').max(150).optional(),
  phone: z.string().trim().min(7, 'Phone must be at least 7 characters.').max(20).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters.').max(100).optional(),
  role: z.enum(USER_ROLES, {
    errorMap: () => ({ message: 'Role must be one of: admin, accountant, driver.' })
  }).optional(),
  driverId: objectId.nullish(),
  isActive: z.boolean().optional()
});