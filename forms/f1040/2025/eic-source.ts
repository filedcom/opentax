import {
  filerCreditEligibility,
  inputSchema as generalInputSchema,
} from "../nodes/inputs/general/index.ts";
import {
  childEicFilerEligible,
  childlessEicEligible,
  priorEicDisallowanceEligible,
} from "../nodes/intermediate/forms/eitc/index.ts";
import { inputSchema as f8862InputSchema } from "../nodes/inputs/f8862/index.ts";

/** Check a positive Form 1040 EIC against the reviewed source before export. */
export function assertEicSource(
  filingStatus: unknown,
  credit: number | undefined,
  mainHomeInUS: unknown,
  pending: Readonly<Record<string, unknown>> | undefined,
): void {
  if ((credit ?? 0) <= 0) return;
  const form2555 = pending?.form2555;
  if (
    form2555 && typeof form2555 === "object" &&
    "filing_details" in form2555
  ) {
    throw new Error("Form 1040 EIC cannot accompany a filed Form 2555");
  }
  const result = pending?.eitc;
  if (
    !result || typeof result !== "object" || Array.isArray(result) ||
    !("qualifying_children" in result) ||
    !Number.isInteger(result.qualifying_children) ||
    !("credit_amount" in result) || result.credit_amount !== credit
  ) {
    throw new Error("Form 1040 EIC needs its matching calculation source");
  }
  const source = generalInputSchema.safeParse(pending?.general);
  const form8862 = f8862InputSchema.safeParse(pending?.f8862);
  const priorReviewEligible = source.success &&
    priorEicDisallowanceEligible({
      ...source.data,
      form8862_filed: form8862.success && form8862.data.claim_eitc === true,
      form8862_disallowed_year: form8862.success
        ? form8862.data.eitc_disallowed_year
        : undefined,
      form8862_notice_reference: form8862.success
        ? form8862.data.eitc_disallowance_notice_reference
        : undefined,
    }, result.qualifying_children as number);
  if (!source.success || !priorReviewEligible) {
    throw new Error("Form 1040 EIC needs reviewed prior-disallowance history");
  }
  if (
    source.data.filing_status !== filingStatus ||
    !filerCreditEligibility(source.data).eitc
  ) {
    throw new Error("Form 1040 EIC needs matching general filer facts");
  }
  if (result.qualifying_children !== 0) {
    if (
      !childEicFilerEligible({
        ...source.data,
        mfs_separation_reviewed:
          source.data.mfs_eitc_separation_review !== undefined,
      })
    ) {
      throw new Error(
        "Form 1040 child EIC needs reviewed filer qualifying-child status",
      );
    }
    return;
  }
  if (
    !childlessEicEligible(source.data) || mainHomeInUS !== true
  ) {
    throw new Error(
      "Form 1040 childless EIC needs reviewed general source facts",
    );
  }
}
