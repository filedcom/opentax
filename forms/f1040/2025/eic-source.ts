import {
  filerCreditEligibility,
  inputSchema as generalInputSchema,
} from "../nodes/inputs/general/index.ts";
import { childlessEicEligible } from "../nodes/intermediate/forms/eitc/index.ts";

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
  if (result.qualifying_children !== 0) return;

  const source = generalInputSchema.safeParse(pending?.general);
  if (
    !source.success || source.data.filing_status !== filingStatus ||
    !filerCreditEligibility(source.data).eitc ||
    !childlessEicEligible(source.data) || mainHomeInUS !== true
  ) {
    throw new Error("Form 1040 childless EIC needs reviewed general source facts");
  }
}
