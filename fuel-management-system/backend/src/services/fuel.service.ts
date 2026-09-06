import { FilterQuery, Types } from 'mongoose';
import { IUser } from '../models/user.model';
import Driver, { IDriver } from '../models/driver.model';
import Vehicle, { IVehicle } from '../models/vehicle.model';
import FuelEntry, {
  FUEL_ENTRY_STATUSES,
  FUEL_TYPES,
  FuelEntryStatus,
  FuelType,
  IFuelEntry
} from '../models/fuelEntry.model';
import { ApiError } from '../utils/ApiError';
import { escapeRegex } from '../utils/regex';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';
import { round2 } from '../utils/number';
import { storageService } from './storage.service';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_REGEX = /^\d{4}-\d{2}$/;

export interface FuelEntryDTO {
  id: string;
  driverId: string;
  vehicleId: string;
  driver: { id: string; name: string; employeeId: string } | null;
  vehicle: { id: string; vehicleNumber: string } | null;
  date: string;
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
  status: FuelEntryStatus;
  ocrConfidence: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface FuelEntryDetailDTO extends FuelEntryDTO {
  ocrRawText: string;
  driverPhone: string | null;
}

export interface CreateFuelEntryInput {
  driverId?: string;
  vehicleId?: string;
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
  ocrConfidence?: number | null;
}

export interface UpdateFuelEntryInput {
  driverId?: string;
  vehicleId?: string;
  date?: string;
  time?: string;
  petrolPumpName?: string;
  vehicleNumber?: string;
  fuelType?: FuelType;
  liters?: number;
  pricePerLiter?: number;
  totalAmount?: number;
  receiptNumber?: string;
  slipImageUrl?: string;
  originalFileName?: string;
  ocrRawText?: string;
  ocrConfidence?: number | null;
  status?: FuelEntryStatus;
}

function toObjectIdOrThrow(value: string, field: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(value)) {
    throw ApiError.badRequest(`Invalid ${field}: must be a valid MongoDB ObjectId.`);
  }
  return new Types.ObjectId(value);
}

function parseEntryDate(value: string): Date {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw ApiError.badRequest(`"${value}" is not a valid calendar date (expected YYYY-MM-DD).`);
  }
  return parsed;
}

export function toFuelEntryDTO(entry: IFuelEntry, driver: IDriver | null, vehicle: IVehicle | null): FuelEntryDTO {
  return {
    id: entry._id.toString(),
    driverId: entry.driverId.toString(),
    vehicleId: entry.vehicleId.toString(),
    driver: driver
      ? { id: driver._id.toString(), name: driver.name, employeeId: driver.employeeId }
      : null,
    vehicle: vehicle ? { id: vehicle._id.toString(), vehicleNumber: vehicle.vehicleNumber } : null,
    date: entry.date.toISOString().slice(0, 10),
    time: entry.time,
    petrolPumpName: entry.petrolPumpName,
    vehicleNumber: entry.vehicleNumber,
    fuelType: entry.fuelType,
    liters: entry.liters,
    pricePerLiter: entry.pricePerLiter,
    totalAmount: entry.totalAmount,
    receiptNumber: entry.receiptNumber,
    slipImageUrl: entry.slipImageUrl,
    originalFileName: entry.originalFileName,
    status: entry.status,
    ocrConfidence: entry.ocrConfidence,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString()
  };
}

function toFuelEntryDetailDTO(
  entry: IFuelEntry,
  driver: IDriver | null,
  vehicle: IVehicle | null
): FuelEntryDetailDTO {
  return {
    ...toFuelEntryDTO(entry, driver, vehicle),
    ocrRawText: entry.ocrRawText,
    driverPhone: driver ? driver.phone : null
  };
}

function buildFuelFilter(query: Record<string, string | undefined>): FilterQuery<IFuelEntry> {
  const conditions: FilterQuery<IFuelEntry>[] = [];

  if (query.driverId) {
    conditions.push({ driverId: toObjectIdOrThrow(query.driverId, 'driverId') });
  }

  if (query.vehicleId) {
    conditions.push({ vehicleId: toObjectIdOrThrow(query.vehicleId, 'vehicleId') });
  }

  if (query.fuelType) {
    const normalized = query.fuelType.trim().charAt(0).toUpperCase() + query.fuelType.trim().slice(1).toLowerCase();
    if (!FUEL_TYPES.includes(normalized as FuelType)) {
      throw ApiError.badRequest(`Invalid fuelType filter. Allowed values: ${FUEL_TYPES.join(', ')}.`);
    }
    conditions.push({ fuelType: normalized });
  }

  if (query.status) {
    if (!FUEL_ENTRY_STATUSES.includes(query.status as FuelEntryStatus)) {
      throw ApiError.badRequest(
        `Invalid status filter. Allowed values: ${FUEL_ENTRY_STATUSES.join(', ')}.`
      );
    }
    conditions.push({ status: query.status });
  }

  if (query.receiptNumber) {
    conditions.push({ receiptNumber: new RegExp(escapeRegex(query.receiptNumber.trim()), 'i') });
  }

  if (query.vehicleNumber) {
    conditions.push({ vehicleNumber: new RegExp(escapeRegex(query.vehicleNumber.trim()), 'i') });
  }

  const dateConditions: Record<string, Date> = {};

  if (query.from) {
    if (!DATE_REGEX.test(query.from)) {
      throw ApiError.badRequest('"from" must be a valid date in YYYY-MM-DD format.');
    }
    dateConditions.$gte = new Date(`${query.from}T00:00:00.000Z`);
  }

  if (query.to) {
    if (!DATE_REGEX.test(query.to)) {
      throw ApiError.badRequest('"to" must be a valid date in YYYY-MM-DD format.');
    }
    dateConditions.$lte = new Date(`${query.to}T23:59:59.999Z`);
  }

  if (query.month) {
    if (!MONTH_REGEX.test(query.month)) {
      throw ApiError.badRequest('"month" must be in YYYY-MM format (e.g. 2026-06).');
    }
    const [year, month] = query.month.split('-').map(Number);
    dateConditions.$gte =
      dateConditions.$gte ?? new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    dateConditions.$lte =
      dateConditions.$lte ?? new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  }

  if (Object.keys(dateConditions).length > 0) {
    conditions.push({ date: dateConditions });
  }

  if (query.search) {
    const rx = new RegExp(escapeRegex(query.search.trim()), 'i');
    conditions.push({
      $or: [{ petrolPumpName: rx }, { receiptNumber: rx }, { vehicleNumber: rx }]
    });
  }

  return conditions.length ? { $and: conditions } : {};
}

async function fetchDriverAndVehicleMaps(entries: IFuelEntry[]) {
  const driverIds = [...new Set(entries.map((entry) => entry.driverId.toString()))];
  const vehicleIds = [...new Set(entries.map((entry) => entry.vehicleId.toString()))];

  const [drivers, vehicles] = await Promise.all([
    driverIds.length
      ? Driver.find({ _id: { $in: driverIds } }).select('name employeeId phone')
      : Promise.resolve([] as IDriver[]),
    vehicleIds.length
      ? Vehicle.find({ _id: { $in: vehicleIds } }).select('vehicleNumber')
      : Promise.resolve([] as IVehicle[])
  ]);

  return {
    driverMap: new Map(drivers.map((driver) => [driver._id.toString(), driver])),
    vehicleMap: new Map(vehicles.map((vehicle) => [vehicle._id.toString(), vehicle]))
  };
}

function assertDriverOwnsEntry(requester: IUser, entry: IFuelEntry): void {
  if (requester.role !== 'driver') return;
  const ownDriverId = requester.driverId ? requester.driverId.toString() : null;
  if (!ownDriverId || ownDriverId !== entry.driverId.toString()) {
    throw ApiError.forbidden('You can only view your own fuel entries.');
  }
}

export async function listFuelEntries(requester: IUser, query: Record<string, string | undefined>) {
  const { page, limit, skip } = parsePagination(query, 20, 100);
  const filter = buildFuelFilter(query);

  // Drivers may only ever see their own entries — enforced server-side.
  if (requester.role === 'driver') {
    const ownDriverId = requester.driverId ? requester.driverId.toString() : null;
    if (!ownDriverId) {
      return { entries: [] as FuelEntryDTO[], pagination: buildPaginationMeta(page, limit, 0) };
    }
    filter.driverId = new Types.ObjectId(ownDriverId);
  }

  const [entries, total] = await Promise.all([
    FuelEntry.find(filter).sort({ date: -1, createdAt: -1 }).skip(skip).limit(limit),
    FuelEntry.countDocuments(filter)
  ]);

  const { driverMap, vehicleMap } = await fetchDriverAndVehicleMaps(entries);
  const dtos = entries.map((entry) =>
    toFuelEntryDTO(entry, driverMap.get(entry.driverId.toString()) ?? null,
      vehicleMap.get(entry.vehicleId.toString()) ?? null)
  );

  return { entries: dtos, pagination: buildPaginationMeta(page, limit, total) };
}

export async function getFuelEntryById(requester: IUser, id: string): Promise<FuelEntryDetailDTO> {
  if (!Types.ObjectId.isValid(id)) throw ApiError.badRequest('Invalid fuel entry id.');

  const entry = await FuelEntry.findById(id);
  if (!entry) throw ApiError.notFound('Fuel entry not found.');

  assertDriverOwnsEntry(requester, entry);

  const [driver, vehicle] = await Promise.all([
    Driver.findById(entry.driverId).select('name employeeId phone'),
    Vehicle.findById(entry.vehicleId).select('vehicleNumber')
  ]);

  return toFuelEntryDetailDTO(entry, driver, vehicle);
}

export async function createFuelEntry(requester: IUser, input: CreateFuelEntryInput): Promise<FuelEntryDTO> {
  let driverId: Types.ObjectId;

  if (requester.role === 'driver') {
    if (!requester.driverId) {
      throw ApiError.forbidden(
        'Your user account is not linked to a driver profile. Please contact the administrator.'
      );
    }
    driverId = requester.driverId; // drivers can never submit for someone else
  } else {
    if (!input.driverId) {
      throw ApiError.badRequest('driverId is required when an admin creates a fuel entry.');
    }
    driverId = toObjectIdOrThrow(input.driverId, 'driverId');
  }

  const driver = await Driver.findById(driverId);
  if (!driver) throw ApiError.badRequest('Driver not found.');
  if (!driver.isActive) throw ApiError.badRequest('This driver is inactive.');

  let vehicleId: Types.ObjectId | null = null;
  if (input.vehicleId) {
    vehicleId = toObjectIdOrThrow(input.vehicleId, 'vehicleId');
  } else {
    vehicleId = driver.assignedVehicleId ?? null;
  }
  if (!vehicleId) {
    throw ApiError.badRequest(
      'No vehicle is assigned to this driver. Assign a vehicle first, or provide vehicleId.'
    );
  }

  const vehicle = await Vehicle.findById(vehicleId);
  if (!vehicle) throw ApiError.badRequest('Vehicle not found.');

  const totalAmount =
    input.totalAmount !== undefined ? input.totalAmount : round2(input.liters * input.pricePerLiter);

  const entry = await FuelEntry.create({
    driverId,
    vehicleId,
    date: parseEntryDate(input.date),
    time: input.time ?? '',
    petrolPumpName: input.petrolPumpName.trim(),
    vehicleNumber:
      input.vehicleNumber && input.vehicleNumber.trim() !== ''
        ? input.vehicleNumber.trim()
        : vehicle.vehicleNumber,
    fuelType: input.fuelType,
    liters: input.liters,
    pricePerLiter: input.pricePerLiter,
    totalAmount,
    receiptNumber: input.receiptNumber.trim(),
    slipImageUrl: input.slipImageUrl ?? '',
    originalFileName: input.originalFileName ?? '',
    ocrRawText: input.ocrRawText ?? '',
    ocrConfidence: input.ocrConfidence ?? null,
    // Entries are always saved after user review (Phase 2 OCR review screen),
    // so new entries start as verified.
    status: 'verified'
  });

  return toFuelEntryDTO(entry, driver, vehicle);
}

export async function updateFuelEntry(id: string, input: UpdateFuelEntryInput): Promise<FuelEntryDTO> {
  if (!Types.ObjectId.isValid(id)) throw ApiError.badRequest('Invalid fuel entry id.');

  const entry = await FuelEntry.findById(id);
  if (!entry) throw ApiError.notFound('Fuel entry not found.');

  if (input.driverId !== undefined) {
    const driver = await Driver.findById(input.driverId);
    if (!driver) throw ApiError.badRequest('Driver not found.');
    entry.driverId = driver._id;
  }

  if (input.vehicleId !== undefined) {
    const vehicle = await Vehicle.findById(input.vehicleId);
    if (!vehicle) throw ApiError.badRequest('Vehicle not found.');
    entry.vehicleId = vehicle._id;
  }

  if (input.date !== undefined) entry.date = parseEntryDate(input.date);
  if (input.time !== undefined) entry.time = input.time;
  if (input.petrolPumpName !== undefined) entry.petrolPumpName = input.petrolPumpName.trim();
  if (input.vehicleNumber !== undefined) entry.vehicleNumber = input.vehicleNumber.trim();
  if (input.fuelType !== undefined) entry.fuelType = input.fuelType;
  if (input.liters !== undefined) entry.liters = input.liters;
  if (input.pricePerLiter !== undefined) entry.pricePerLiter = input.pricePerLiter;
  if (input.receiptNumber !== undefined) entry.receiptNumber = input.receiptNumber.trim();
  if (input.status !== undefined) entry.status = input.status;
  if (input.slipImageUrl !== undefined) entry.slipImageUrl = input.slipImageUrl;
  if (input.originalFileName !== undefined) entry.originalFileName = input.originalFileName;
  if (input.ocrRawText !== undefined) entry.ocrRawText = input.ocrRawText;
  if (input.ocrConfidence !== undefined) entry.ocrConfidence = input.ocrConfidence ?? null;

  if (input.totalAmount !== undefined) {
    entry.totalAmount = input.totalAmount;
  } else if (input.liters !== undefined || input.pricePerLiter !== undefined) {
    entry.totalAmount = round2(entry.liters * entry.pricePerLiter);
  }

  await entry.save();

  const updated = await FuelEntry.findById(entry._id);
  const [driver, vehicle] = updated
    ? await Promise.all([
        Driver.findById(updated.driverId).select('name employeeId phone'),
        Vehicle.findById(updated.vehicleId).select('vehicleNumber')
      ])
    : [null, null];

  return toFuelEntryDTO(updated!, driver, vehicle);
}

export async function deleteFuelEntry(id: string): Promise<void> {
  if (!Types.ObjectId.isValid(id)) throw ApiError.badRequest('Invalid fuel entry id.');

  const entry = await FuelEntry.findById(id);
  if (!entry) throw ApiError.notFound('Fuel entry not found.');

  // Remove the stored slip file together with the entry
  if (entry.slipImageUrl) {
    await storageService.deleteSlipFile(entry.slipImageUrl);
  }

  await entry.deleteOne();
}