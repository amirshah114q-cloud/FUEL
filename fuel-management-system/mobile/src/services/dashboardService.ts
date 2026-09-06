import { apiRequest } from './api';
import {
  DailyUsagePoint,
  DashboardSummary,
  DriverExpenseItem,
  MonthlyTrendPoint,
  VehicleExpenseItem
} from '../types/models';

export async function getDashboardSummary(month?: string): Promise<DashboardSummary> {
  const envelope = await apiRequest<DashboardSummary>(
    `/dashboard/summary${month ? `?month=${encodeURIComponent(month)}` : ''}`
  );
  return envelope.data;
}

export async function getMonthlyTrend(months = 12): Promise<MonthlyTrendPoint[]> {
  const envelope = await apiRequest<{ months: number; trend: MonthlyTrendPoint[] }>(
    `/dashboard/monthly?months=${months}`
  );
  return envelope.data.trend;
}

export async function getDailyUsage(month: string): Promise<DailyUsagePoint[]> {
  const envelope = await apiRequest<{ month: string; maxLiters: number; days: DailyUsagePoint[] }>(
    `/dashboard/daily?month=${encodeURIComponent(month)}`
  );
  return envelope.data.days;
}

export async function getVehicleExpenses(month?: string): Promise<VehicleExpenseItem[]> {
  const envelope = await apiRequest<{ month: string | null; vehicles: VehicleExpenseItem[] }>(
    `/dashboard/vehicle-expenses${month ? `?month=${encodeURIComponent(month)}` : ''}`
  );
  return envelope.data.vehicles;
}

export async function getDriverExpenses(month?: string): Promise<DriverExpenseItem[]> {
  const envelope = await apiRequest<{ month: string | null; drivers: DriverExpenseItem[] }>(
    `/dashboard/driver-expenses${month ? `?month=${encodeURIComponent(month)}` : ''}`
  );
  return envelope.data.drivers;
}