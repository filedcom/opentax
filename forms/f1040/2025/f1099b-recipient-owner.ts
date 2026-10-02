import { type FilerIdentity, FilingStatus } from "../mef/header.ts";
import { inputSchema } from "../nodes/inputs/f1099b/index.ts";

/** A broker-reported sale must belong to a filer on this return. */
export function assert1099BRecipientOwner(
  source: unknown,
  filer: FilerIdentity | undefined,
): void {
  if (source === undefined) return;
  const parsed = inputSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error("1099-B needs valid issued transaction rows");
  }
  if (!filer) throw new Error("1099-B needs Form 1040 filer identity");
  const recipients = new Set([filer.primarySSN.replace(/\D/g, "")]);
  if (
    filer.filingStatus === FilingStatus.MarriedFilingJointly &&
    filer.spouse?.ssn
  ) {
    recipients.add(filer.spouse.ssn.replace(/\D/g, ""));
  }
  for (const row of parsed.data.f1099bs) {
    if (!row.recipient_ssn) {
      throw new Error("1099-B filing needs an issued recipient SSN");
    }
    if (!recipients.has(row.recipient_ssn)) {
      throw new Error(
        "1099-B recipient must match the taxpayer or joint-filing spouse",
      );
    }
  }
}
