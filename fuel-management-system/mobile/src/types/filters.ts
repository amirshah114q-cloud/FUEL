import { FuelType } from './models';

export type EntryStatusFilter = 'pending' | 'verified' | 'rejected';

export type PeriodFilter =
  | { type: 'month'; month: string }
  | { type: 'range'; from: string; to: string }
  | { type: 'all' };

/**
 * Complete filter state for the fuel records browser.
 * driverLabel/vehicleLabel are display-only (used for removable chips);
 * the API query uses the ids.
 */
export interface FuelFilterState {
  period: PeriodFilter;
  driverId?: string;
  driverLabel?: string;
  vehicleId?: string;
  vehicleLabel?: string;
  fuelType?: FuelType;
  status?: EntryStatusFilter;
  receiptNumber?: string;
  vehicleNumber?: string;
}