import { inputSchema } from "../nodes/inputs/f1099g/index.ts";

const positiveAmountKeys = [
  "box_1_unemployment",
  "box_1_repaid",
  "box_2_state_refund",
  "box_2_taxable_recovery_verified_amount",
  "box_4_federal_withheld",
  "box_5_rtaa",
  "box_6_taxable_grants",
  "box_7_agriculture",
  "box_9_market_gain",
  "box_11_state_withheld",
] as const;

/** Require a filed owner for every positive retained 1099-G payer copy. */
export function assertPositive1099GOwner(
  fields: Record<string, unknown>,
  pending: Readonly<Record<string, unknown>> | undefined,
): void {
  if (pending?.f1099g === undefined) return;
  const rows = inputSchema.parse(pending.f1099g).f1099gs;
  const primary = typeof fields.taxpayer_ssn === "string"
    ? fields.taxpayer_ssn.replace(/\D/g, "")
    : undefined;
  const spouse = fields.filing_status === "mfj" &&
      typeof fields.spouse_ssn === "string"
    ? fields.spouse_ssn.replace(/\D/g, "")
    : undefined;
  for (const row of rows) {
    if (!positiveAmountKeys.some((key) => (row[key] ?? 0) > 0)) continue;
    if (row.recipient_tin === undefined) {
      throw new Error("Positive Form 1099-G needs a recipient TIN at export");
    }
    if (row.recipient_tin !== primary && row.recipient_tin !== spouse) {
      throw new Error(
        "Form 1099-G recipient TIN must match the taxpayer or joint spouse",
      );
    }
  }
}
