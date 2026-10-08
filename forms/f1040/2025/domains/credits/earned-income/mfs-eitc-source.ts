import { inputSchema as generalInputSchema } from "../../../../nodes/inputs/general/index.ts";
import { FilingStatus } from "../../../../nodes/types.ts";

/** Reconcile the Form 1040 separated-spouse mark with its reviewed input. */
export function assertMfsEitcSource(
  filingStatus: unknown,
  marked: unknown,
  credit: number | undefined,
  pending: Readonly<Record<string, unknown>> | undefined,
): void {
  const positiveMfsCredit = filingStatus === FilingStatus.MFS &&
    (credit ?? 0) > 0;
  if (!positiveMfsCredit && marked !== true) return;
  if (!positiveMfsCredit || marked !== true) {
    throw new Error(
      "Form 1040 separated-spouse EIC mark and credit must agree",
    );
  }
  const source = generalInputSchema.safeParse(pending?.general);
  if (
    !source.success || source.data.filing_status !== FilingStatus.MFS ||
    !source.data.mfs_eitc_separation_review
  ) {
    throw new Error(
      "Form 1040 separated-spouse EIC needs reviewed general source facts",
    );
  }
  if (
    !source.data.spouse_first_name?.trim() ||
    !source.data.spouse_last_name?.trim() ||
    !source.data.spouse_ssn?.trim()
  ) {
    throw new Error(
      "Form 1040 separated-spouse EIC needs spouse name and taxpayer identifier",
    );
  }
  const eitc = pending?.eitc;
  if (
    !eitc || typeof eitc !== "object" || Array.isArray(eitc) ||
    !("qualifying_children" in eitc) ||
    typeof eitc.qualifying_children !== "number" ||
    eitc.qualifying_children < 1 ||
    !("credit_amount" in eitc) || eitc.credit_amount !== credit
  ) {
    throw new Error(
      "Form 1040 separated-spouse EIC needs matching Schedule EIC calculation",
    );
  }
}
