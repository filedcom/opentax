import { type FilerIdentity, FilingStatus } from "../../../../mef/header.ts";
import { inputSchema } from "../../../../nodes/inputs/f8288/index.ts";

/** Check credited FIRPTA withholding against the stamped seller copy. */
export function assertF8288WithholdingOwner(
  source: unknown,
  filer: FilerIdentity | undefined,
): void {
  if (source === undefined) return;
  const parsed = inputSchema.parse(source);
  const credited = parsed.f8288s.filter((item) => item.amount_withheld > 0);
  if (credited.length === 0) return;
  if (!filer) {
    throw new Error("Form 8288-A withholding needs Form 1040 filer identity");
  }
  const owners = new Set([filer.primarySSN.replace(/\D/g, "")]);
  if (
    filer.filingStatus === FilingStatus.MarriedFilingJointly &&
    filer.spouse?.ssn
  ) {
    owners.add(filer.spouse.ssn.replace(/\D/g, ""));
  }
  for (const item of credited) {
    if (!item.stamped_copy_b_reference) {
      throw new Error(
        "Form 8288-A withholding needs an IRS-stamped Copy B reference",
      );
    }
    if (!item.seller_tin || !owners.has(item.seller_tin.replace(/\D/g, ""))) {
      throw new Error(
        "Form 8288-A seller TIN must match the taxpayer or joint-filing spouse",
      );
    }
  }
}
