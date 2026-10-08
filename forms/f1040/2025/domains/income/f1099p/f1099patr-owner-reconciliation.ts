import { inputSchema } from "../../../../nodes/inputs/f1099patr/index.ts";

const positiveAmountKeys = [
  "box1_patronage_dividends",
  "box2_nonpatronage_distributions",
  "box3_per_unit_retain",
  "box4_federal_withheld",
  "box5_redeemed_nonqualified",
  "box6_section199ag_deduction",
  "box7_qualified_payments",
  "box8_section199aa_qualified_items",
  "box9_section199aa_sstb_items",
] as const;

/** Require each positive PATR payer copy to belong to a filed owner. */
export function assertPositive1099PatrOwner(
  fields: Record<string, unknown>,
  pending: Readonly<Record<string, unknown>> | undefined,
): void {
  if (pending?.f1099patr === undefined) return;
  const rows = inputSchema.parse(pending.f1099patr).f1099patrs;
  const primary = typeof fields.taxpayer_ssn === "string"
    ? fields.taxpayer_ssn.replace(/\D/g, "")
    : undefined;
  const spouse = fields.filing_status === "mfj" &&
      typeof fields.spouse_ssn === "string"
    ? fields.spouse_ssn.replace(/\D/g, "")
    : undefined;
  for (const row of rows) {
    if (!positiveAmountKeys.some((key) => (row[key] ?? 0) > 0)) continue;
    if (!row.recipient_tin) {
      throw new Error(
        "Positive Form 1099-PATR needs a recipient TIN at export",
      );
    }
    if (
      !row.payer_name?.trim() &&
      !/^(?:\d{9}|\d{2}-\d{7}|\d{3}-\d{2}-\d{4})$/.test(
        row.payer_tin ?? "",
      )
    ) {
      throw new Error("Positive Form 1099-PATR needs an identified payer");
    }
    if (row.recipient_tin !== primary && row.recipient_tin !== spouse) {
      throw new Error(
        "Form 1099-PATR recipient TIN must match the taxpayer or joint spouse",
      );
    }
  }
}
