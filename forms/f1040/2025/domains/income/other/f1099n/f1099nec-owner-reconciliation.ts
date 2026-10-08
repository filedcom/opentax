import {
  assertDistinct1099NecCopies,
  inputSchema,
} from "../../../../../nodes/inputs/income/business/f1099nec/index.ts";

/** Require each positive NEC payer copy to belong to a filed owner. */
export function assertPositive1099NecOwner(
  fields: Record<string, unknown>,
  pending: Readonly<Record<string, unknown>> | undefined,
): void {
  if (pending?.f1099nec === undefined) return;
  const rows = inputSchema.parse(pending.f1099nec).f1099necs;
  assertDistinct1099NecCopies(rows);
  const primary = typeof fields.taxpayer_ssn === "string"
    ? fields.taxpayer_ssn.replace(/\D/g, "")
    : undefined;
  const spouse = fields.filing_status === "mfj" &&
      typeof fields.spouse_ssn === "string"
    ? fields.spouse_ssn.replace(/\D/g, "")
    : undefined;
  for (const row of rows) {
    if (
      (row.box1_nec ?? 0) <= 0 &&
      (row.box3_golden_parachute ?? 0) <= 0 &&
      (row.box4_federal_withheld ?? 0) <= 0
    ) continue;
    if (!row.recipient_ssn) {
      throw new Error("Positive Form 1099-NEC needs a recipient SSN at export");
    }
    const recipient = row.recipient_ssn.replace(/\D/g, "");
    if (recipient !== primary && recipient !== spouse) {
      throw new Error(
        "Form 1099-NEC recipient SSN must match the taxpayer or joint spouse",
      );
    }
  }
}
