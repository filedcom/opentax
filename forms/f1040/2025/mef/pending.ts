import { ALL_MEF_FORMS } from "./forms/index.ts";
import type { F8949Transaction, MefFormsPending } from "./types.ts";

function extractForm8949Transactions(
  raw: Record<string, unknown> | undefined,
): F8949Transaction[] | undefined {
  if (raw === undefined) return undefined;
  const tx = raw["transaction"];
  if (tx === undefined) return undefined;
  return (Array.isArray(tx) ? tx : [tx]) as F8949Transaction[];
}

/**
 * Normalize a pending dict: when a field was deposited by multiple nodes the
 * executor promotes the value to an array.  MeF builders expect scalars, so
 * resolve all-numeric arrays to their last element (the most recently computed).
 */
function normalizePendingDict(
  raw: unknown,
): Record<string, unknown> | undefined {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return undefined;
  }
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (Array.isArray(value) && value.length > 0 && value.every((v) => typeof v === "number")) {
      result[key] = value[value.length - 1];
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function buildPending(
  pending: Record<string, unknown>,
): MefFormsPending {
  const result: Record<string, unknown> = {};
  for (const form of ALL_MEF_FORMS) {
    result[form.pendingKey] = normalizePendingDict(pending[form.pendingKey]);
  }
  // form8949 has a non-standard transaction-array structure
  result["form8949"] = extractForm8949Transactions(
    pending["form8949"] as Record<string, unknown> | undefined,
  );
  return result as MefFormsPending;
}
