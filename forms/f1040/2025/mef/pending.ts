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

export function buildPending(
  pending: Record<string, unknown>,
): MefFormsPending {
  const result: Record<string, unknown> = {};
  for (const form of ALL_MEF_FORMS) {
    result[form.pendingKey] = pending[form.pendingKey];
  }
  // form8949 has a non-standard transaction-array structure
  result["form8949"] = extractForm8949Transactions(
    pending["form8949"] as Record<string, unknown> | undefined,
  );
  return result as MefFormsPending;
}
