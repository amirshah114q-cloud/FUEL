/** Escapes user input before embedding it into a RegExp (prevents ReDoS/injection). */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}