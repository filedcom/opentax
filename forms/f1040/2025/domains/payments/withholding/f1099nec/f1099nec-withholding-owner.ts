import { type FilerIdentity, FilingStatus } from "../../../../../mef/header.ts";
import {
  assertDistinct1099NecCopies,
  inputSchema,
} from "../../../../../nodes/inputs/income/business/f1099nec/index.ts";

/** Bind positive NEC backup withholding to a recipient on this return. */
export function assertNecWithholdingRecipient(
  source: unknown,
  filer: FilerIdentity | undefined,
): void {
  if (source === undefined) return;
  const parsed = inputSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error("1099-NEC withholding needs valid issued payer rows");
  }
  assertDistinct1099NecCopies(parsed.data.f1099necs);
  const withheld = parsed.data.f1099necs.filter((item) =>
    (item.box4_federal_withheld ?? 0) > 0
  );
  if (withheld.length === 0) return;
  if (!filer) {
    throw new Error("1099-NEC withholding needs Form 1040 filer identity");
  }
  const recipients = new Set([filer.primarySSN.replace(/\D/g, "")]);
  if (
    filer.filingStatus === FilingStatus.MarriedFilingJointly &&
    filer.spouse?.ssn
  ) {
    recipients.add(filer.spouse.ssn.replace(/\D/g, ""));
  }
  for (const item of withheld) {
    if (
      !item.recipient_ssn ||
      !recipients.has(item.recipient_ssn.replace(/\D/g, ""))
    ) {
      throw new Error(
        "1099-NEC box 4 recipient must match the taxpayer or joint-filing spouse",
      );
    }
  }
}
