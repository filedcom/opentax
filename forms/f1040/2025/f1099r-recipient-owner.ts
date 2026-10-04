import { type FilerIdentity, FilingStatus } from "../mef/header.ts";
import {
  assertDistinct1099RCopies,
  assertIraRolloverEvidence,
  inputSchema,
} from "../nodes/inputs/f1099r/index.ts";
import { TS } from "../nodes/types.ts";

/** Require a positive payer copy's recipient to match the filed owner. */
export function assert1099RRecipientOwner(
  source: unknown,
  filer: FilerIdentity | undefined,
): void {
  if (source === undefined) return;
  if (!filer) {
    throw new Error("1099-R owner review needs Form 1040 filer identity");
  }
  const parsed = inputSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error("1099-R owner review needs valid payer source rows");
  }
  assertDistinct1099RCopies(parsed.data.f1099rs);
  assertIraRolloverEvidence(parsed.data.f1099rs);
  for (const [index, item] of parsed.data.f1099rs.entries()) {
    if (
      !item.payer_name.trim() ||
      !/^(?:\d{9}|\d{2}-\d{7})$/.test(item.payer_ein)
    ) {
      throw new Error(
        `1099-R ${index + 1} needs a payer name and nine-digit EIN`,
      );
    }
    if (
      (item.box1_gross_distribution > 0 ||
        (item.box2a_taxable_amount ?? 0) > 0 ||
        (item.box4_federal_withheld ?? 0) > 0) &&
      !item.recipient_ssn
    ) {
      throw new Error(
        `1099-R ${index + 1} positive issued copy needs recipient SSN`,
      );
    }
    const spouseOwned = item.ts === TS.S;
    if (
      spouseOwned &&
      (filer.filingStatus !== FilingStatus.MarriedFilingJointly ||
        !filer.spouse)
    ) {
      throw new Error(
        `1099-R ${
          index + 1
        } spouse distribution needs a joint return and spouse identity`,
      );
    }
    const expected = (spouseOwned ? filer.spouse!.ssn : filer.primarySSN)
      .replace(/\D/g, "");
    if (
      item.recipient_ssn !== undefined &&
      item.recipient_ssn.replace(/\D/g, "") !== expected
    ) {
      throw new Error(
        `1099-R ${
          index + 1
        } issued recipient SSN differs from its Form 1040 owner`,
      );
    }
  }
}
