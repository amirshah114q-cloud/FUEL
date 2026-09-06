import { FilterQuery, Types } from 'mongoose';
import Driver, { IDriver } from '../models/driver.model';
import Vehicle, { IVehicle } from '../models/vehicle.model';
import FuelEntry, { FuelType, IFuelEntry } from '../models/fuelEntry.model';
import { ApiError } from '../utils/ApiError';
import { round2 } from '../utils/number';

const MONTH_REGEX = /^\d{4}-\d{2}$/;
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface ReportEntryRow {
  id: string;
  date: string; // YYYY-MM-DD
  time: string;
  driverName: string;
  vehicleNumber: string;
  petrolPumpName: string;
  fuelType: FuelType;
  liters: number;
  pricePerLiter: number;
  totalAmount: number;
  receiptNumber: string;
}

export interface ReportGroupRow {
  id: string;
  label: string;
  sublabel: string;
  entries: number;
  liters: number;
  amount: number;
  sharePercent: number;
}

export interface ReportFuelTypeRow {
  fuelType: FuelType;
  entries: number;
  liters: number;
  amount: number;
  sharePercent: number;
}

export interface MonthlyReport {
  month: string; // YYYY-MM
  monthLabel: string; // "June 2026"
  generatedAt: string; // ISO
  generatedAtLabel: string; // "15 Jun 2026, 14:32 UTC"
  filters: {
    driverId: string | null;
    driverName: string | null;
    vehicleId: string | null;
    vehicleNumber: string | null;
    fuelType: FuelType | null;
  };
  totals: {
    entries: number;
    liters: number;
    amount: number;
    averageAmountPerEntry: number;
  };
  byFuelType: ReportFuelTypeRow[];
  byDriver: ReportGroupRow[];
  byVehicle: ReportGroupRow[];
  entries: ReportEntryRow[];
}

function currentMonthUTC(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

function normalizeMonth(value?: string): string {
  if (!value || value.trim() === '') return currentMonthUTC();
  const month = value.trim();
  if (!MONTH_REGEX.test(month)) {
    throw ApiError.badRequest('"month" must be in YYYY-MM format (e.g. 2026-06).');
  }
  const monthNumber = Number(month.split('-')[1]);
  if (monthNumber < 1 || monthNumber > 12) {
    throw ApiError.badRequest('Invalid month value.');
  }
  return month;
}

function toMonthLabel(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return `${MONTH_NAMES[monthNumber - 1]} ${year}`;
}

function sharePercent(amount: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((amount / total) * 1000) / 10;
}

function objectIdOrThrow(value: string, field: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(value)) {
    throw ApiError.badRequest(`Invalid ${field} filter.`);
  }
  return new Types.ObjectId(value);
}

/**
 * Builds the complete monthly report (JSON form). Rejected entries are
 * excluded, consistent with the dashboard aggregations.
 *
 * Optional filters: driverId, vehicleId, fuelType — used for
 * driver-wise / vehicle-wise / fuel-wise report variants.
 */
export async function buildMonthlyReport(query: Record<string, string | undefined>): Promise<MonthlyReport> {
  const month = normalizeMonth(query.month);
  const [year, monthNumber] = month.split('-').map(Number);
  const start = new Date(Date.UTC(year, monthNumber - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthNumber, 0, 23, 59, 59, 999));

  const conditions: FilterQuery<IFuelEntry>[] = [
    { date: { $gte: start, $lte: end } },
    { status: { $ne: 'rejected' } }
  ];

  let driverId: Types.ObjectId | null = null;
  if (query.driverId) {
    driverId = objectIdOrThrow(query.driverId, 'driverId');
    conditions.push({ driverId });
  }

  let vehicleId: Types.ObjectId | null = null;
  if (query.vehicleId) {
    vehicleId = objectIdOrThrow(query.vehicleId, 'vehicleId');
    conditions.push({ vehicleId });
  }

  let fuelType: FuelType | null = null;
  if (query.fuelType) {
    const normalized =
      query.fuelType.trim().charAt(0).toUpperCase() + query.fuelType.trim().slice(1).toLowerCase();
    if (normalized !== 'Petrol' && normalized !== 'Diesel') {
      throw ApiError.badRequest('Invalid fuelType filter. Allowed values: Petrol, Diesel.');
    }
    fuelType = normalized;
    conditions.push({ fuelType });
  }

  const filter: FilterQuery<IFuelEntry> = { $and: conditions };
  const entries = await FuelEntry.find(filter).sort({ date: 1, createdAt: 1 });

  // Lookup drivers/vehicles that appear in the entries (plus any filter target,
  // so its name can be echoed even when it has zero entries this month).
  const driverIdSet = new Set(entries.map((entry) => entry.driverId.toString()));
  if (driverId) driverIdSet.add(driverId.toString());
  const vehicleIdSet = new Set(entries.map((entry) => entry.vehicleId.toString()));
  if (vehicleId) vehicleIdSet.add(vehicleId.toString());

  const [driverDocs, vehicleDocs] = await Promise.all([
    driverIdSet.size
      ? Driver.find({ _id: { $in: [...driverIdSet].map((id) => new Types.ObjectId(id)) } })
      : Promise.resolve([] as IDriver[]),
    vehicleIdSet.size
      ? Vehicle.find({ _id: { $in: [...vehicleIdSet].map((id) => new Types.ObjectId(id)) } })
      : Promise.resolve([] as IVehicle[])
  ]);
  const driverMap = new Map(driverDocs.map((driver) => [driver._id.toString(), driver]));
  const vehicleMap = new Map(vehicleDocs.map((vehicle) => [vehicle._id.toString(), vehicle]));

  const entryRows: ReportEntryRow[] = entries.map((entry) => ({
    id: entry._id.toString(),
    date: entry.date.toISOString().slice(0, 10),
    time: entry.time,
    driverName: driverMap.get(entry.driverId.toString())?.name ?? 'Unknown Driver',
    vehicleNumber: entry.vehicleNumber,
    petrolPumpName: entry.petrolPumpName,
    fuelType: entry.fuelType,
    liters: entry.liters,
    pricePerLiter: entry.pricePerLiter,
    totalAmount: entry.totalAmount,
    receiptNumber: entry.receiptNumber
  }));

  const totalLiters = round2(entries.reduce((sum, entry) => sum + entry.liters, 0));
  const totalAmount = round2(entries.reduce((sum, entry) => sum + entry.totalAmount, 0));

  // ── Fuel-type breakdown ──
  const fuelAgg = new Map<FuelType, { entries: number; liters: number; amount: number }>();
  for (const entry of entries) {
    const bucket = fuelAgg.get(entry.fuelType) ?? { entries: 0, liters: 0, amount: 0 };
    bucket.entries += 1;
    bucket.liters += entry.liters;
    bucket.amount += entry.totalAmount;
    fuelAgg.set(entry.fuelType, bucket);
  }
  const byFuelType: ReportFuelTypeRow[] = [...fuelAgg.entries()]
    .map(([type, bucket]) => ({
      fuelType: type,
      entries: bucket.entries,
      liters: round2(bucket.liters),
      amount: round2(bucket.amount),
      sharePercent: sharePercent(round2(bucket.amount), totalAmount)
    }))
    .sort((a, b) => b.amount - a.amount);

  // ── Driver-wise breakdown (drivers with entries in the period) ──
  const driverAgg = new Map<string, { entries: number; liters: number; amount: number }>();
  for (const entry of entries) {
    const key = entry.driverId.toString();
    const bucket = driverAgg.get(key) ?? { entries: 0, liters: 0, amount: 0 };
    bucket.entries += 1;
    bucket.liters += entry.liters;
    bucket.amount += entry.totalAmount;
    driverAgg.set(key, bucket);
  }
  const byDriver: ReportGroupRow[] = [...driverAgg.entries()]
    .map(([id, bucket]) => {
      const driver = driverMap.get(id);
      return {
        id,
        label: driver?.name ?? 'Unknown Driver',
        sublabel: driver?.employeeId ?? '-',
        entries: bucket.entries,
        liters: round2(bucket.liters),
        amount: round2(bucket.amount),
        sharePercent: sharePercent(round2(bucket.amount), totalAmount)
      };
    })
    .sort((a, b) => b.amount - a.amount);

  // ── Vehicle-wise summary ──
  const vehicleAgg = new Map<string, { entries: number; liters: number; amount: number }>();
  for (const entry of entries) {
    const key = entry.vehicleId.toString();
    const bucket = vehicleAgg.get(key) ?? { entries: 0, liters: 0, amount: 0 };
    bucket.entries += 1;
    bucket.liters += entry.liters;
    bucket.amount += entry.totalAmount;
    vehicleAgg.set(key, bucket);
  }
  const byVehicle: ReportGroupRow[] = [...vehicleAgg.entries()]
    .map(([id, bucket]) => {
      const vehicle = vehicleMap.get(id);
      return {
        id,
        label: vehicle?.vehicleNumber ?? 'Unknown Vehicle',
        sublabel: vehicle ? `${vehicle.vehicleType} - ${vehicle.model}` : '-',
        entries: bucket.entries,
        liters: round2(bucket.liters),
        amount: round2(bucket.amount),
        sharePercent: sharePercent(round2(bucket.amount), totalAmount)
      };
    })
    .sort((a, b) => b.amount - a.amount);

  const now = new Date();
  const pad = (n: number): string => String(n).padStart(2, '0');
  const generatedAtLabel = `${pad(now.getUTCDate())} ${MONTH_NAMES_SHORT[now.getUTCMonth()]} ${now.getUTCFullYear()}, ${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())} UTC`;

  return {
    month,
    monthLabel: toMonthLabel(month),
    generatedAt: now.toISOString(),
    generatedAtLabel,
    filters: {
      driverId: driverId ? driverId.toString() : null,
      driverName: driverId ? (driverMap.get(driverId.toString())?.name ?? null) : null,
      vehicleId: vehicleId ? vehicleId.toString() : null,
      vehicleNumber: vehicleId ? (vehicleMap.get(vehicleId.toString())?.vehicleNumber ?? null) : null,
      fuelType
    },
    totals: {
      entries: entries.length,
      liters: totalLiters,
      amount: totalAmount,
      averageAmountPerEntry: entries.length > 0 ? round2(totalAmount / entries.length) : 0
    },
    byFuelType,
    byDriver,
    byVehicle,
    entries: entryRows
  };
}