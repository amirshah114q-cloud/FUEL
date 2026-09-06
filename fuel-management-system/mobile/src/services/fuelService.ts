import { apiRequest, ApiError, PaginationMeta } from './api';
import { FuelEntry, FuelEntryDetail, FuelType } from '../types/models';

export interface FuelListQuery {
  driverId?: string;
  vehicleId?: string;
  from?: string;
  to?: string;
  month?: string;
  fuelType?: FuelType;
  status?: string;
  receiptNumber?: string;
  vehicleNumber?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface FuelListResult {
  entries: FuelEntry[];
  meta: PaginationMeta;
}

const FALLBACK_META = (count: number): PaginationMeta => ({
  page: 1,
  limit: count,
  totalItems: count,
  totalPages: 1,
  hasNextPage: false,
  hasPrevPage: false
});

export async function getFuelEntries(query: FuelListQuery = {}): Promise<FuelListResult> {
  const params = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join('&');

  const envelope = await apiRequest<FuelEntry[]>(`/fuel${params ? `?${params}` : ''}`);
  return {
    entries: envelope.data ?? [],
    meta: envelope.meta ?? FALLBACK_META(envelope.data?.length ?? 0)
  };
}

export async function getFuelEntry(id: string): Promise<FuelEntryDetail> {
  const envelope = await apiRequest<FuelEntryDetail>(`/fuel/${id}`);
  return envelope.data;
}

export interface CreateFuelEntryPayload {
  date: string;
  time?: string;
  petrolPumpName: string;
  vehicleNumber?: string;
  fuelType: FuelType;
  liters: number;
  pricePerLiter: number;
  totalAmount?: number;
  receiptNumber: string;
  slipImageUrl?: string;
  originalFileName?: string;
  ocrRawText?: string;
  ocrConfidence?: number;
}

/**
 * Saves the VERIFIED entry (driver has already reviewed/corrected the OCR
 * data on the review screen). The backend scopes drivers to their own
 * driver profile and assigned vehicle.
 */
export async function createFuelEntry(payload: CreateFuelEntryPayload): Promise<FuelEntry> {
  const envelope = await apiRequest<FuelEntry>('/fuel', {
    method: 'POST',
    body: payload,
    timeoutMs: 15000
  });
  return envelope.data;
}

/** Extracts a user-friendly message from any thrown service error. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}