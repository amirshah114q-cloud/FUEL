/** Mirrors the backend JSON DTOs exactly. */

export type UserRole = 'admin' | 'accountant' | 'driver';
export type FuelType = 'Petrol' | 'Diesel';
export type EntryStatus = 'pending' | 'verified' | 'rejected';

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  driverId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DriverProfileInfo {
  id: string;
  name: string;
  phone: string;
  employeeId: string;
  vehicle: {
    id: string;
    vehicleNumber: string;
    vehicleType: string;
    model: string;
  } | null;
}

export interface FuelEntry {
  id: string;
  driverId: string;
  vehicleId: string;
  driver: { id: string; name: string; employeeId: string } | null;
  vehicle: { id: string; vehicleNumber: string } | null;
  date: string;            // YYYY-MM-DD
  time: string;
  petrolPumpName: string;
  vehicleNumber: string;
  fuelType: FuelType;
  liters: number;
  pricePerLiter: number;
  totalAmount: number;
  receiptNumber: string;
  slipImageUrl: string;
  originalFileName: string;
  status: EntryStatus;
  ocrConfidence: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface FuelEntryDetail extends FuelEntry {
  ocrRawText: string;
  driverPhone: string | null;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface SlipFields {
  date: string | null;
  time: string | null;
  petrolPumpName: string | null;
  vehicleNumber: string | null;
  fuelType: FuelType | null;
  liters: number | null;
  pricePerLiter: number | null;
  totalAmount: number | null;
  receiptNumber: string | null;
}

/** Response of POST /api/ocr/process — data envelope. */
export interface OcrProcessResponse {
  filePath: string;
  fileUrl: string;
  originalFileName: string;
  mimeType: string;
  size: number;
  ocr: {
    fields: SlipFields;
    rawText: string;
    confidence: number | null;
    provider: string;
    warnings: string[];
  };
}