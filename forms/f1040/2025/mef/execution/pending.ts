import { normalizePendingDict } from "../../return-processing/pending.ts";
import type { F8949Transaction, MefFormsPending } from "../types.ts";

function extractForm8949Transactions(
  raw: Record<string, unknown> | undefined,
): F8949Transaction[] | undefined {
  if (raw === undefined) return undefined;
  const tx = raw["transaction"];
  if (tx === undefined) return undefined;
  const filedRows = (Array.isArray(tx) ? tx : [tx])
    .filter((row) =>
      !((row.part === "A" || row.part === "D") && !row.adjustment_codes &&
        row.adjustment_amount === undefined)
    ) as F8949Transaction[];
  return filedRows.length > 0 ? filedRows : undefined;
}

export function buildPending(
  pending: Record<string, unknown>,
): MefFormsPending {
  const result: Record<string, unknown> = {};
  // Keep calculation-only node results available to serializers that must
  // reconcile a filed schedule with a finalized reporting-year worksheet.
  // Only ALL_MEF_FORMS controls which keys are emitted as XML documents.
  for (const [nodeType, raw] of Object.entries(pending)) {
    const normalized = normalizePendingDict(raw, nodeType);
    if (normalized === undefined) continue;
    // The graph can retain a source-only Form 8960 slice (for example taxable
    // interest) even when the calculator returned no form below the MAGI
    // threshold. Only a completed calculation may become a native document.
    if (
      nodeType === "form8960" &&
      typeof normalized["line13_magi"] !== "number"
    ) continue;
    if (
      nodeType === "form4952" &&
      typeof normalized["line3"] !== "number"
    ) continue;
    result[nodeType] = normalized;
  }
  // form8949 has a non-standard transaction-array structure
  result["form8949"] = extractForm8949Transactions(
    pending["form8949"] as Record<string, unknown> | undefined,
  );
  return result as MefFormsPending;
}
