import { FuelType } from '../types/models';

export interface ReviewForm {
  date: string;
  time: string;
  petrolPumpName: string;
  vehicleNumber: string;
  fuelType: FuelType | '';
  liters: string;
  pricePerLiter: string;
  totalAmount: string;
  receiptNumber: string;
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

function isRealCalendarDate(iso: string): boolean {
  if (!DATE_REGEX.test(iso)) return false;
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

function positiveNumber(raw: string): number | null {
  const n = parseFloat(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/**
 * Client-side validation of the OCR review form. Mirrors the backend rules
 * (including the 5% / Rs 2 liters × price tolerance) so users get instant
 * feedback and the server never receives invalid data.
 */
export function validateReviewForm(form: ReviewForm): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!form.date) {
    errors.date = 'Date is required.';
  } else if (!isRealCalendarDate(form.date)) {
    errors.date = 'Enter a valid calendar date.';
  }

  if (form.time.trim() && !TIME_REGEX.test(form.time.trim())) {
    errors.time = 'Time must be in HH:MM 24-hour format.';
  }

  if (form.petrolPumpName.trim().length < 2) {
    errors.petrolPumpName = 'Petrol pump name is required.';
  }

  if (form.vehicleNumber.trim().length < 2) {
    errors.vehicleNumber = 'Vehicle number is required.';
  }

  if (form.fuelType !== 'Petrol' && form.fuelType !== 'Diesel') {
    errors.fuelType = 'Select the fuel type.';
  }

  const liters = positiveNumber(form.liters);
  if (liters === null) {
    errors.liters = 'Liters must be a positive number.';
  } else if (liters > 100000) {
    errors.liters = 'Liters value is too large. Please verify the slip.';
  }

  const rate = positiveNumber(form.pricePerLiter);
  if (rate === null) {
    errors.pricePerLiter = 'Price per liter must be a positive number.';
  } else if (rate > 1000000) {
    errors.pricePerLiter = 'Price per liter is too large. Please verify the slip.';
  }

  const total = positiveNumber(form.totalAmount);
  if (total === null) {
    errors.totalAmount = 'Total amount must be a positive number.';
  } else if (liters !== null && rate !== null) {
    const expected = liters * rate;
    const tolerance = Math.max(2, total * 0.05);
    if (Math.abs(total - expected) > tolerance) {
      errors.totalAmount =
        'Total does not match Liters × Price/Liter (within 5%). Please re-check the slip values.';
    }
  }

  if (!form.receiptNumber.trim()) {
    errors.receiptNumber = 'Receipt number is required.';
  }

  return errors;
}