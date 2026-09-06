/** '2026-06' → 'Jun' */
export function monthShortLabel(month: string): string {
  const [, m] = month.split('-').map(Number);
  return MONTHS_SHORT[m - 1] ?? '';
}

/** Compact number for chart labels: 1234 → '1.2k', 1250000 → '1.3M'. */
export function compactNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 100_000) return `${(value / 1_000).toFixed(0)}k`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(Math.round(value));
}

/** Compact money for chart labels: 'Rs 354k'. */
export function compactMoney(value: number): string {
  return `Rs ${compactNumber(value)}`;
}

/** Today as local ISO date 'YYYY-MM-DD'. */
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** First day of the current local month as 'YYYY-MM-01'. */
export function firstDayOfMonthISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}