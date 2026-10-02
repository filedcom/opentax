import { type FilerIdentity, FilingStatus } from "../mef/header.ts";
import { inputSchema } from "../nodes/inputs/f1099patr/index.ts";

/** Recheck the retained payer copies when a caller bypasses graph calculation. */
export function assertPatrIssuedCopies(source: unknown): void {
  if (source === undefined) return;
  const parsed = inputSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error(
      `1099-PATR issued-copy source is invalid: ${parsed.error.message}`,
    );
  }
}

/** Match cooperative backup withholding to an issued recipient on this return. */
export function assertPatrWithholdingRecipient(
  source: unknown,
  filer: FilerIdentity | undefined,
): void {
  if (source === undefined) return;
  const rows = (source as { f1099patrs?: unknown })?.f1099patrs;
  if (
    !Array.isArray(rows) ||
    !rows.some((row) =>
      row !== null && typeof row === "object" &&
      typeof row.box4_federal_withheld === "number" &&
      row.box4_federal_withheld > 0
    )
  ) return;
  const parsed = inputSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error("1099-PATR withholding needs valid issued payer rows");
  }
  if (!filer) {
    throw new Error("1099-PATR withholding needs Form 1040 filer identity");
  }
  const recipients = new Set([filer.primarySSN.replace(/\D/g, "")]);
  if (
    filer.filingStatus === FilingStatus.MarriedFilingJointly &&
    filer.spouse?.ssn
  ) {
    recipients.add(filer.spouse.ssn.replace(/\D/g, ""));
  }
  for (const row of parsed.data.f1099patrs) {
    if ((row.box4_federal_withheld ?? 0) === 0) continue;
    if (!row.recipient_tin || !recipients.has(row.recipient_tin)) {
      throw new Error(
        "1099-PATR box 4 recipient must match the taxpayer or joint-filing spouse",
      );
    }
  }
}
