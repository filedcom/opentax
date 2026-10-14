import { inputSchema } from "../../../../../nodes/inputs/income/investments/f1099oid/index.ts";

const positiveAmountKeys = [
  "box1_oid",
  "box2_other_interest",
  "box3_early_withdrawal_penalty",
  "box4_federal_withheld",
  "box5_market_discount",
  "box6_acquisition_premium",
  "box8_oid_treasury",
  "box9_investment_expenses",
  "box10_bond_premium",
  "box11_tax_exempt_oid",
  "box11_pab_oid",
  "box12_state_tax",
] as const;

/** Require an owner for a positive OID payer copy before filing export. */
export function assertPositive1099OidOwner(
  fields: Record<string, unknown>,
  pending: Readonly<Record<string, unknown>> | undefined,
): void {
  if (pending?.f1099oid === undefined) return;
  const rows = inputSchema.parse(pending.f1099oid).f1099oids;
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
      throw new Error("Positive Form 1099-OID needs a recipient TIN at export");
    }
    if (row.recipient_tin !== primary && row.recipient_tin !== spouse) {
      throw new Error(
        "Form 1099-OID recipient TIN must match the taxpayer or joint spouse",
      );
    }
  }
}
