import { inputSchema as interestSchema } from "../../../../../nodes/inputs/income/investments/f1099int/index.ts";
import { inputSchema as dividendSchema } from "../../../../../nodes/inputs/income/investments/f1099div/index.ts";
import { inputSchema as oidSchema } from "../../../../../nodes/inputs/income/investments/f1099oid/index.ts";
import type { FilerIdentity } from "../../../../../mef/header.ts";
import { FilingStatus } from "../../../../../mef/header.ts";
import { inputSchema as partnershipSchema } from "../../../../../nodes/inputs/income/rental-passthrough/k1_partnership/index.ts";

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
  if (pending.f1099int !== undefined && pending.f1099div !== undefined) {
    const interest = interestSchema.safeParse(pending.f1099int);
    if (!interest.success) {
      throw new Error(
        "Form 4952 mixed path supports only identified code H K-1 expenses and valid 1099-INT sources",
      );
    }
    const sources = [
      ...interest.data.f1099ints,
      ...dividendSchema.parse(pending.f1099div).f1099divs,
      ...(pending.f1099oid === undefined
        ? []
        : oidSchema.parse(pending.f1099oid).f1099oids),
    ];
    const references = [
      ...parsed.data.k1_partnerships.map((row) =>
        row.source_document_reference
      ),
      ...sources.map((row) => row.source_document_reference),
    ];
    if (
      sources.some((row) =>
        !row.recipient_tin || !allowed.includes(row.recipient_tin)
      ) ||
      references.some((reference) => !reference) ||
      new Set(references).size !== references.length
    ) {
      throw new Error(
        "Form 4952 mixed path supports only identified code H K-1 expenses and owned 1099 sources with distinct issued-copy references",
      );
    }
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
