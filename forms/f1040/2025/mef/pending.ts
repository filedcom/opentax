import { normalizePendingDict } from "../pending.ts";
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
  // Keep calculation-only node results available to serializers that must
  // reconcile a filed schedule with a finalized reporting-year worksheet.
  // Only ALL_MEF_FORMS controls which keys are emitted as XML documents.
  for (const [nodeType, raw] of Object.entries(pending)) {
    const normalized = normalizePendingDict(raw);
    if (normalized !== undefined) result[nodeType] = normalized;
  }
  // form8949 has a non-standard transaction-array structure
  result["form8949"] = extractForm8949Transactions(
    pending["form8949"] as Record<string, unknown> | undefined,
  );
  return result as MefFormsPending;
}
