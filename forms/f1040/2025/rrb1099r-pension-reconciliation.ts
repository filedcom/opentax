import { inputSchema } from "../nodes/inputs/rrb1099r/index.ts";
import { type FilerIdentity, FilingStatus } from "../mef/header.ts";

/** Retain the filed pension amounts from correctly numbered RRB-1099-R boxes. */
export function assertRrb1099rPensionSource(
  pending: Record<string, unknown>,
  filer: FilerIdentity | undefined,
): void {
  if (pending.rrb1099r === undefined) return;
  const rows = inputSchema.parse(pending.rrb1099r).rrb1099rs;
  const recipients = new Set<string>();
  if (filer) {
    recipients.add(filer.primarySSN.replace(/\D/g, ""));
    if (
      filer.filingStatus === FilingStatus.MarriedFilingJointly && filer.spouse
    ) {
      recipients.add(filer.spouse.ssn.replace(/\D/g, ""));
    }
  }
  if (
    rows.some((row) =>
      ((row.box7_total_gross_paid ?? 0) > 0 ||
        (row.box9_federal_withheld ?? 0) > 0) &&
      !recipients.has(row.recipient_tin ?? "")
    )
  ) {
    throw new Error(
      "RRB-1099-R pension recipient must match taxpayer or joint spouse",
    );
  }
  const gross = rows.reduce(
    (sum, row) => sum + (row.box7_total_gross_paid ?? 0),
    0,
  );
  const filed = pending.f1040 as Record<string, unknown> | undefined;
  const line5a = filed?.line5a_pension_gross ?? 0;
  const line5b = filed?.line5b_pension_taxable ?? 0;
  const hasOtherPensionSource = pending.f1099r !== undefined ||
    pending.f4852 !== undefined;
  if (
    hasOtherPensionSource
      ? (typeof line5a !== "number" || line5a < gross ||
        typeof line5b !== "number" || line5b < gross)
      : (line5a !== gross || line5b !== gross)
  ) {
    throw new Error(
      "Form 1040 lines 5a and 5b differ from retained RRB-1099-R pension sources",
    );
  }
}
