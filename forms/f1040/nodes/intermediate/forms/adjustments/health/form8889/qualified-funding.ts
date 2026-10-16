import { CoverageType } from "./contribution-limit.ts";

/** Transfer-month maximum and once-in-a-lifetime same-year exception. Annual
 * allocation, lifetime history, IRA/HSA ownership and actual receipts are
 * checked by the source caller. Monetary inputs must use consistent units. */
export function verifyHsaFundingTransfers(
  transfers: readonly {
    amount: number;
    month: number;
    coverage: CoverageType | null;
    source_reference: string;
  }[],
  age55: boolean,
  selfOnlyLimit: number,
  familyLimit: number,
  catchup: number,
) {
  if (transfers.length < 1 || transfers.length > 2) {
    throw Error(
      "Form 8889 qualified funding needs one transfer or the two-transfer coverage exception",
    );
  }
  for (const t of transfers) {
    if (!t.coverage) {
      throw Error(
        "Form 8889 qualified HSA funding transfer needs HDHP eligibility in its transfer month",
      );
    }
    const maximum =
      (t.coverage === CoverageType.Family ? familyLimit : selfOnlyLimit) +
      (age55 ? catchup : 0);
    if (t.amount > maximum) {
      throw Error(
        "Form 8889 qualified HSA funding transfer exceeds its coverage limit",
      );
    }
  }
  if (
    transfers.length === 2 && (
      transfers[0].coverage !== CoverageType.SelfOnly ||
      transfers[1].coverage !== CoverageType.Family ||
      transfers[0].month >= transfers[1].month ||
      transfers[0].source_reference === transfers[1].source_reference
    )
  ) {
    throw Error(
      "Form 8889 second HSA funding transfer needs a later family-coverage month and distinct trustee source",
    );
  }
  const maximum =
    (transfers.at(-1)!.coverage === CoverageType.Family
      ? familyLimit
      : selfOnlyLimit) + (age55 ? catchup : 0);
  const total = transfers.reduce((s, t) => s + t.amount, 0);
  if (total > maximum) {
    throw Error(
      "Form 8889 qualified HSA funding transfer exceeds its eligible contribution limit",
    );
  }
  return { total, maximum };
}
