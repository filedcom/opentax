import { type FilerIdentity, FilingStatus } from "../../mef/header.ts";
import { inputSchema } from "../../nodes/inputs/f1099r/index.ts";
import { TS } from "../../nodes/types.ts";

/** Prevent a payer's identified recipient from being filed as another owner. */
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
  for (const [index, item] of parsed.data.f1099rs.entries()) {
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
