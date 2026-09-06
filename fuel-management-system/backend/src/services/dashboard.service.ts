import { Types } from 'mongoose';
import Driver from '../models/driver.model';
import Vehicle from '../models/vehicle.model';
import FuelEntry, { FuelType } from '../models/fuelEntry.model';
import { ApiError } from '../utils/ApiError';
import { round2 } from '../utils/number';

const MONTH_REGEX = /^\d{4}-\d{2}$/;

interface Totals {
  liters: number;
  amount: number;
  entries: number;
}

export interface FuelTypeSplitDTO {
  fuelType: FuelType;
  liters: number;
  amount: number;
  entries: number;
}

export interface SummaryDTO {
  month: string;
  totalLiters: number;
  totalAmount: number;
  entryCount: number;
  averageAmountPerEntry: number;
  activeDrivers: number;
  activeVehicles: number;
  byFuelType: FuelTypeSplitDTO[];
  previousMonth: {
    month: string;
    totalLiters: number;
    totalAmount: number;
    entryCount: number;
  };
}

export interface MonthlyTrendDTO {
  month: string; // YYYY-MM
  liters: number;
  amount: number;
  entries: number;
}

export interface DailyUsageDTO {
  date: string; // YYYY-MM-DD
  day: number;
  liters: number;
  amount: number;
  entries: number;
}

export interface VehicleExpenseDTO {
  vehicleId: string;
  vehicleNumber: string;
  vehicleType: string;
  isActive: boolean;
  liters: number;
  amount: number;
  entries: number;
}

export interface DriverExpenseDTO {
  driverId: string;
  driverName: string;
  employeeId: string;
  isActive: boolean;
  liters: number;
  amount: number;
  entries: number;
}

function currentMonthUTC(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

function normalizeMonth(monthParam?: string): string {
  if (!monthParam || monthParam.trim() === '') return currentMonthUTC();
  const value = monthParam.trim();
  if (!MONTH_REGEX.test(value)) {
    throw ApiError.badRequest('"month" must be in YYYY-MM format (e.g. 2026-06).');
  }
  const monthNumber = Number(value.split('-')[1]);
  if (monthNumber < 1 || monthNumber > 12) {
    throw ApiError.badRequest('Invalid month value.');
  }
  return value;
}

function monthRange(month: string): { start: Date; end: Date } {
  const [year, monthNumber] = month.split('-').map(Number);
  return {
    start: new Date(Date.UTC(year, monthNumber - 1, 1, 0, 0, 0, 0)),
    end: new Date(Date.UTC(year, monthNumber, 0, 23, 59, 59, 999))
  };
}

function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const d = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Dashboard aggregations exclude entries with status "rejected" — rejected
 * entries represent bad data the office explicitly refused.
 */
async function totalsFor(match: Record<string, unknown>): Promise<Totals> {
  const rows = await FuelEntry.aggregate<{ _id: null; liters: number; amount: number; entries: number }>([
    { $match: match },
    {
      $group: {
        _id: null,
        liters: { $sum: '$liters' },
        amount: { $sum: '$totalAmount' },
        entries: { $sum: 1 }
      }
    }
  ]).exec();
  const row = rows[0];
  return {
    liters: round2(row?.liters ?? 0),
    amount: round2(row?.amount ?? 0),
    entries: row?.entries ?? 0
  };
}

export async function getSummary(monthParam?: string): Promise<SummaryDTO> {
  const month = normalizeMonth(monthParam);
  const { start, end } = monthRange(month);
  const previousMonth = shiftMonth(month, -1);
  const prevRange = monthRange(previousMonth);

  const currentMatch = { date: { $gte: start, $lte: end }, status: { $ne: 'rejected' } };
  const previousMatch = { date: { $gte: prevRange.start, $lte: prevRange.end }, status: { $ne: 'rejected' } };

  const [current, previous, fuelTypeRows, activeDrivers, activeVehicles] = await Promise.all([
    totalsFor(currentMatch),
    totalsFor(previousMatch),
    FuelEntry.aggregate<{ _id: FuelType; liters: number; amount: number; entries: number }>([
      { $match: currentMatch },
      {
        $group: {
          _id: '$fuelType',
          liters: { $sum: '$liters' },
          amount: { $sum: '$totalAmount' },
          entries: { $sum: 1 }
        }
      },
      { $sort: { amount: -1 } }
    ]).exec(),
    Driver.countDocuments({ isActive: true }),
    Vehicle.countDocuments({ isActive: true })
  ]);

  return {
    month,
    totalLiters: current.liters,
    totalAmount: current.amount,
    entryCount: current.entries,
    averageAmountPerEntry: current.entries > 0 ? round2(current.amount / current.entries) : 0,
    activeDrivers,
    activeVehicles,
    byFuelType: fuelTypeRows.map((row) => ({
      fuelType: row._id,
      liters: round2(row.liters),
      amount: round2(row.amount),
      entries: row.entries
    })),
    previousMonth: {
      month: previousMonth,
      totalLiters: previous.liters,
      totalAmount: previous.amount,
      entryCount: previous.entries
    }
  };
}

export async function getMonthlyTrend(
  monthsParam?: string
): Promise<{ months: number; trend: MonthlyTrendDTO[] }> {
  const requested = monthsParam ? parseInt(monthsParam, 10) : 12;
  const months = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), 36) : 12;

  const endMonth = currentMonthUTC();
  const startMonth = shiftMonth(endMonth, -(months - 1));
  const windowStart = monthRange(startMonth).start;

  const rows = await FuelEntry.aggregate<{ _id: string; liters: number; amount: number; entries: number }>([
    { $match: { date: { $gte: windowStart }, status: { $ne: 'rejected' } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
        liters: { $sum: '$liters' },
        amount: { $sum: '$totalAmount' },
        entries: { $sum: 1 }
      }
    }
  ]).exec();

  const map = new Map<string, Totals>(
    rows.map((row) => [
      row._id,
      { liters: round2(row.liters), amount: round2(row.amount), entries: row.entries }
    ])
  );

  // Zero-fill every month in the window so charts always show a full axis.
  const trend: MonthlyTrendDTO[] = [];
  for (let i = 0; i < months; i++) {
    const m = shiftMonth(startMonth, i);
    const t = map.get(m) ?? { liters: 0, amount: 0, entries: 0 };
    trend.push({ month: m, ...t });
  }
  return { months, trend };
}

export async function getDailyUsage(
  monthParam?: string
): Promise<{ month: string; maxLiters: number; days: DailyUsageDTO[] }> {
  const month = normalizeMonth(monthParam);
  const { start, end } = monthRange(month);
  const [year, monthNumber] = month.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();

  const rows = await FuelEntry.aggregate<{ _id: string; liters: number; amount: number; entries: number }>([
    { $match: { date: { $gte: start, $lte: end }, status: { $ne: 'rejected' } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        liters: { $sum: '$liters' },
        amount: { $sum: '$totalAmount' },
        entries: { $sum: 1 }
      }
    }
  ]).exec();

  const map = new Map(rows.map((row) => [row._id, row]));

  const days: DailyUsageDTO[] = [];
  let maxLiters = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${month}-${String(day).padStart(2, '0')}`;
    const row = map.get(date);
    const liters = round2(row?.liters ?? 0);
    maxLiters = Math.max(maxLiters, liters);
    days.push({ date, day, liters, amount: round2(row?.amount ?? 0), entries: row?.entries ?? 0 });
  }
  return { month, maxLiters, days };
}

export async function getVehicleExpenses(
  monthParam?: string
): Promise<{ month: string | null; vehicles: VehicleExpenseDTO[] }> {
  const match: Record<string, unknown> = { status: { $ne: 'rejected' } };
  const monthValue = monthParam && monthParam.trim() !== '' ? normalizeMonth(monthParam) : null;
  if (monthValue) {
    const { start, end } = monthRange(monthValue);
    match.date = { $gte: start, $lte: end };
  }

  const [rows, vehicles] = await Promise.all([
    FuelEntry.aggregate<{ _id: Types.ObjectId; liters: number; amount: number; entries: number }>([
      { $match: match },
      {
        $group: {
          _id: '$vehicleId',
          liters: { $sum: '$liters' },
          amount: { $sum: '$totalAmount' },
          entries: { $sum: 1 }
        }
      }
    ]).exec(),
    Vehicle.find({})
  ]);

  const map = new Map(rows.map((row) => [row._id.toString(), row]));

  // Include every vehicle (even zero-expense) so the office sees the whole fleet.
  const list: VehicleExpenseDTO[] = vehicles
    .map((vehicle) => {
      const row = map.get(vehicle._id.toString());
      return {
        vehicleId: vehicle._id.toString(),
        vehicleNumber: vehicle.vehicleNumber,
        vehicleType: vehicle.vehicleType,
        isActive: vehicle.isActive,
        liters: round2(row?.liters ?? 0),
        amount: round2(row?.amount ?? 0),
        entries: row?.entries ?? 0
      };
    })
    .sort((a, b) => b.amount - a.amount);

  return { month: monthValue, vehicles: list };
}

export async function getDriverExpenses(
  monthParam?: string
): Promise<{ month: string | null; drivers: DriverExpenseDTO[] }> {
  const match: Record<string, unknown> = { status: { $ne: 'rejected' } };
  const monthValue = monthParam && monthParam.trim() !== '' ? normalizeMonth(monthParam) : null;
  if (monthValue) {
    const { start, end } = monthRange(monthValue);
    match.date = { $gte: start, $lte: end };
  }

  const [rows, drivers] = await Promise.all([
    FuelEntry.aggregate<{ _id: Types.ObjectId; liters: number; amount: number; entries: number }>([
      { $match: match },
      {
        $group: {
          _id: '$driverId',
          liters: { $sum: '$liters' },
          amount: { $sum: '$totalAmount' },
          entries: { $sum: 1 }
        }
      }
    ]).exec(),
    Driver.find({})
  ]);

  const map = new Map(rows.map((row) => [row._id.toString(), row]));

  const list: DriverExpenseDTO[] = drivers
    .map((driver) => {
      const row = map.get(driver._id.toString());
      return {
        driverId: driver._id.toString(),
        driverName: driver.name,
        employeeId: driver.employeeId,
        isActive: driver.isActive,
        liters: round2(row?.liters ?? 0),
        amount: round2(row?.amount ?? 0),
        entries: row?.entries ?? 0
      };
    })
    .sort((a, b) => b.amount - a.amount);

  return { month: monthValue, drivers: list };
}