/**
 * Format-neutral normalization of the raw executor pending dict.
 *
 * The executor promotes a pending value to an array when multiple nodes write
 * to the same key. Both MEF and PDF builders expect scalar values, so this
 * module resolves all-numeric arrays to their last element (the most recently
 * computed value).
 */
export function normalizePendingDict(
  raw: unknown,
): Record<string, unknown> | undefined {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return undefined;
  }
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (
      Array.isArray(value) &&
      value.length > 0 &&
      value.every((v) => typeof v === "number")
    ) {
      result[key] = value[value.length - 1];
    } else {
      result[key] = value;
    }
  }
  return result;
}

/** Normalize all keys in a raw pending dict. */
export function normalizeAllPending(
  pending: Record<string, unknown>,
): Record<string, Record<string, unknown>> {
  const result: Record<string, Record<string, unknown>> = {};
  for (const key of Object.keys(pending)) {
    const normalized = normalizePendingDict(pending[key]);
    if (normalized !== undefined) {
      result[key] = normalized;
    }
  }
  return result;
}
