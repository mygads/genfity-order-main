export function normalizeTableNumber(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);

  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const candidate = obj.tableNumber ?? obj.value ?? obj.label;
    if (typeof candidate === 'string') return candidate;
    if (typeof candidate === 'number' && Number.isFinite(candidate)) return String(candidate);
  }

  return '';
}
