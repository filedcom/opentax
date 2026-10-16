import { z } from "zod";
import { FilingStatus } from "../../nodes/types.ts";
import {
  buildIsoAmtBasisLedgerForYear,
  inputSchema as sharedSourceSchema,
} from "../../nodes/inputs/income/investments/f3921/index.ts";

const reference = z.string().trim().min(1);
const tin = z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/);
export const isoClaim2026Schema = z.object({
  tax_year: z.literal(2026),
  f3921s: sharedSourceSchema.innerType().shape.f3921s,
  year_end_holdings_review: z.object({
    as_of: z.literal("2026-12-31"),
    brokerage_record_reference: reference,
    all_exercised_shares_still_owned: z.literal(true),
    source_document_references: z.array(reference).min(1),
  }).strict(),
}).strict();
export const isoSource2026Schema = isoClaim2026Schema.extend({
  filing_status: z.nativeEnum(FilingStatus),
  taxpayer_ssn: tin,
  spouse_ssn: tin.optional(),
}).strict();
export type IsoSource2026 = z.input<typeof isoSource2026Schema>;

/** Unrestricted 2026 exercises retained through year end, with no option cost.
 * Same-year sales, restricted rights, elections and prior-year lots need their
 * own compensation/disposition owners; they are rejected by the shared schema.
 */
export function calculateIsoSources2026(raw: IsoSource2026) {
  const source = isoSource2026Schema.parse(raw);
  const allowed = new Set([
    source.taxpayer_ssn.replaceAll("-", ""),
    ...(source.filing_status === FilingStatus.MFJ && source.spouse_ssn
      ? [source.spouse_ssn.replaceAll("-", "")]
      : []),
  ]);
  if (source.filing_status === FilingStatus.MFJ && !source.spouse_ssn) {
    throw new Error("Joint ISO sources need both return owners");
  }
  const ledger = buildIsoAmtBasisLedgerForYear({ f3921s: source.f3921s }, 2026);
  if (ledger.some((lot) => !allowed.has(lot.employee_tin))) {
    throw new Error(
      "Form 3921 employee must match the taxpayer or joint spouse",
    );
  }
  const reviewed = source.year_end_holdings_review.source_document_references;
  const references = ledger.map((lot) => lot.source_document_reference);
  if (
    new Set(reviewed).size !== reviewed.length ||
    reviewed.length !== references.length ||
    references.some((ref) => !reviewed.includes(ref))
  ) {
    throw new Error(
      "Year-end holdings review must cover each issued Form 3921 once",
    );
  }
  const cents = ledger.reduce((sum, lot) => sum + lot.amt_adjustment_cents, 0);
  if (!Number.isSafeInteger(cents)) {
    throw new Error("ISO exercise total exceeds cent-precision range");
  }
  return { source_input: source, ledger, line2i: Math.round(cents / 100) };
}
