/** Rounds a monetary value to 2 decimal places. */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}