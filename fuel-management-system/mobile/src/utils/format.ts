import { API_BASE_URL } from '../config';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function groupThousands(intStr: string): string {
  return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** 'Rs 12,990' or 'Rs 12,990.25' (decimals shown only when present). */
export function formatMoney(value: number): string {
  const hasFraction = Math.abs(value % 1) > 1e-9;
  const fixed = hasFraction ? value.toFixed(2) : Math.round(value).toString();
  const [intPart, decPart] = fixed.split('.');
  return `Rs ${groupThousands(intPart)}${decPart ? `.${decPart}` : ''}`;
}

/** 'Rs 285.50' — always two decimals (unit rates always have them on slips). */
export function formatRate(value: number): string {
  const [intPart, decPart] = value.toFixed(2).split('.');
  return `Rs ${groupThousands(intPart)}.${decPart}`;
}

/** '45.50 L' */
export function formatLiters(value: number): string {
  return `${value.toFixed(2)} L`;
}

/** '2026-06-15' → '15 Jun 2026' */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS_SHORT[m - 1]} ${y}`;
}

export function dayMonth(iso: string): { day: string; month: string } {
  const [, m, d] = iso.split('-').map(Number);
  return { day: String(d), month: MONTHS_SHORT[m - 1].toUpperCase() };
}

/** ISO datetime → '15 Jun 2026, 14:32' (local time) */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}, ${hh}:${mm}`;
}

/** '2026-06' (current month, local time) */
export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Shifts 'YYYY-MM' by delta months. */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** '2026-06' → 'June 2026' */
export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${MONTHS_LONG[m - 1]} ${y}`;
}

/** Builds an absolute URL from a relative backend file path like '/uploads/x.png'. */
export function resolveFileUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_BASE_URL}${path}`;
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}