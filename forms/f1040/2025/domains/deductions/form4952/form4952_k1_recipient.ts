import type { FilerIdentity } from "../../../../mef/header.ts";
import { FilingStatus } from "../../../../mef/header.ts";
import { inputSchema as partnershipSchema } from "../../../../nodes/inputs/k1_partnership/index.ts";

/** Every K-1 used by Form 4952 must belong to this filed return. */
export function assertForm4952K1Recipients(
  pending: Readonly<Record<string, unknown>>,
  filer: FilerIdentity,
): void {
  const parsed = partnershipSchema.safeParse(pending.k1_partnership);
  if (!parsed.success || parsed.data.k1_partnerships.length === 0) {
    throw new Error("Form 4952 needs its issued partnership K-1 recipients");
  }
  const allowed = [filer.primarySSN.replace(/\D/g, "")];
  if (
    filer.filingStatus === FilingStatus.MarriedFilingJointly &&
    filer.spouse?.ssn
  ) {
    allowed.push(filer.spouse.ssn.replace(/\D/g, ""));
  }
  if (
    parsed.data.k1_partnerships.some((item) =>
      !item.recipient_tin || !allowed.includes(item.recipient_tin)
    )
  ) {
    throw new Error(
      "Form 4952 partnership K-1 recipient must match the filer or joint spouse",
    );
  }
}
