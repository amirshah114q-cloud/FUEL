import { FuelListQuery } from '../services/fuelService';
import { FuelFilterState } from '../types/filters';
import { currentMonth, formatDate, monthLabel } from './format';

export function defaultFuelFilter(): FuelFilterState {
  return { period: { type: 'month', month: currentMonth() } };
}

export function cloneFilter(filter: FuelFilterState): FuelFilterState {
  const period =
    filter.period.type === 'month'
      ? { type: 'month' as const, month: filter.period.month }
      : filter.period.type === 'range'
        ? { type: 'range' as const, from: filter.period.from, to: filter.period.to }
        : { type: 'all' as const };
  return { ...filter, period };
}

/** Number of active non-period filters (drives the badge on the filter button). */
export function activeFilterCount(filter: FuelFilterState): number {
  let count = 0;
  if (filter.driverId) count += 1;
  if (filter.vehicleId) count += 1;
  if (filter.fuelType) count += 1;
  if (filter.status) count += 1;
  if (filter.receiptNumber?.trim()) count += 1;
  if (filter.vehicleNumber?.trim()) count += 1;
  return count;
}

export function fuelFilterToQuery(filter: FuelFilterState, search?: string): FuelListQuery {
  const query: FuelListQuery = {};
  if (filter.period.type === 'month') {
    query.month = filter.period.month;
  } else if (filter.period.type === 'range') {
    query.from = filter.period.from;
    query.to = filter.period.to;
  }
  if (filter.driverId) query.driverId = filter.driverId;
  if (filter.vehicleId) query.vehicleId = filter.vehicleId;
  if (filter.fuelType) query.fuelType = filter.fuelType;
  if (filter.status) query.status = filter.status;
  if (filter.receiptNumber?.trim()) query.receiptNumber = filter.receiptNumber.trim();
  if (filter.vehicleNumber?.trim()) query.vehicleNumber = filter.vehicleNumber.trim();
  if (search?.trim()) query.search = search.trim();
  return query;
}

export function periodLabel(filter: FuelFilterState): string {
  if (filter.period.type === 'all') return 'All time';
  if (filter.period.type === 'month') return monthLabel(filter.period.month);
  return `${formatDate(filter.period.from)} – ${formatDate(filter.period.to)}`;
}