import { z } from 'zod';
import { FUEL_TYPES, FUEL_ENTRY_STATUSES } from '../models/fuelEntry.model';

const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Must be a valid MongoDB ObjectId.');

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

const fuelEntryBase = z.object({
  driverId: objectId.optional(),
  vehicleId: objectId.optional(),
  date: z
    .string({ required_error: 'Date is required.' })
    .regex(DATE_REGEX, 'Date must be in YYYY-MM-DD format.'),
  time: z
    .string()
    .regex(TIME_REGEX, 'Time must be in HH:MM or HH:MM:SS format (24-hour).')
    .optional(),
  petrolPumpName: z
    .string({ required_error: 'Petrol pump name is required.' })
    .trim()
    .min(2, 'Petrol pump name is required.')
    .max(150),
  vehicleNumber: z.string().trim().min(1, 'Vehicle number is required.').max(20).optional(),
  fuelType: z.enum(FUEL_TYPES, {
    errorMap: () => ({ message: 'Fuel type must be either Petrol or Diesel.' })
  }),
  liters: z.coerce
    .number({ invalid_type_error: 'Liters must be a number.' })
    .positive('Liters must be a positive number.')
    .max(100000, 'Liters value is too large. Please verify the slip.'),
  pricePerLiter: z.coerce
    .number({ invalid_type_error: 'Price per liter must be a number.' })
    .positive('Price per liter must be a positive number.')
    .max(1000000, 'Price per liter value is too large. Please verify the slip.'),
  totalAmount: z.coerce
    .number({ invalid_type_error: 'Total amount must be a number.' })
    .positive('Total amount must be a positive number.')
    .max(10000000, 'Total amount value is too large. Please verify the slip.')
    .optional(),
  receiptNumber: z
    .string({ required_error: 'Receipt number is required.' })
    .trim()
    .min(1, 'Receipt number is required.')
    .max(50),
  slipImageUrl: z.string().trim().min(1).max(500).optional(),
  originalFileName: z.string().trim().max(255).optional(),
  ocrRawText: z.string().max(50000).optional(),
  ocrConfidence: z.coerce.number().min(0).max(100).optional().nullable()
});

export const createFuelEntrySchema = fuelEntryBase.refine(
  (data) =>
    data.totalAmount === undefined ||
    Math.abs(data.totalAmount - data.liters * data.pricePerLiter) <=
      Math.max(2, data.totalAmount * 0.05),
  {
    message:
      'Total amount does not match Liters × Price/Liter (allowed tolerance 5%). Please re-check the slip values.',
    path: ['totalAmount']
  }
);

export const updateFuelEntrySchema = fuelEntryBase
  .partial()
  .extend({
    status: z.enum(FUEL_ENTRY_STATUSES, {
      errorMap: () => ({ message: 'Status must be one of: pending, verified, rejected.' })
    }).optional()
  })
  .refine(
    (data) => {
      if (data.totalAmount === undefined || data.liters === undefined || data.pricePerLiter === undefined) {
        return true;
      }
      return (
        Math.abs(data.totalAmount - data.liters * data.pricePerLiter) <=
        Math.max(2, data.totalAmount * 0.05)
      );
    },
    {
      message:
        'Total amount does not match Liters × Price/Liter (allowed tolerance 5%). Please re-check the slip values.',
      path: ['totalAmount']
    }
  );