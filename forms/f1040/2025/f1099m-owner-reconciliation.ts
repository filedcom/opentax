import { inputSchema } from "../nodes/inputs/f1099m/index.ts";

const positiveAmountKeys = [
  "box1_rents",
  "box2_royalties",
  "box3_other_income",
  "box4_federal_withheld",
  "box5_fishing_boat",
  "box6_medical_payments",
  "box8_substitute_payments",
  "box9_crop_insurance",
  "box10_attorney_proceeds",
  "box11_fish_purchased",
  "box12_section_409a_deferrals",
  "box15_nqdc",
  "box16_state_tax_withheld",
  "box18_state_income",
] as const;

/** Require each positive MISC payer copy to belong to a filed owner. */
export function assertPositive1099MOwner(
  fields: Record<string, unknown>,
  pending: Readonly<Record<string, unknown>> | undefined,
): void {
  if (pending?.f1099m === undefined) return;
  const rows = inputSchema.parse(pending.f1099m).f1099ms;
  const primary = typeof fields.taxpayer_ssn === "string"
    ? fields.taxpayer_ssn.replace(/\D/g, "")
    : undefined;
  const spouse = fields.filing_status === "mfj" &&
      typeof fields.spouse_ssn === "string"
    ? fields.spouse_ssn.replace(/\D/g, "")
    : undefined;
  for (const row of rows) {
    if (!positiveAmountKeys.some((key) => (row[key] ?? 0) > 0)) continue;
    if (row.recipient_tin !== primary && row.recipient_tin !== spouse) {
      throw new Error(
        "Form 1099-MISC recipient TIN must match the taxpayer or joint spouse",
      );
    }
  }
}
