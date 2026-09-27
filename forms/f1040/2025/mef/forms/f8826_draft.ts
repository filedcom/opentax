import { element, elements } from "../../../mef/xml.ts";
import {
  calculateForm8826,
  type F8826Input,
  inputSchema,
  isEligible,
} from "../../../nodes/inputs/f8826/index.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

/**
 * TY2025 Form 8826 source document. Pass-through-only recipients report the
 * credit directly on Form 3800 and do not attach their own Form 8826.
 */
export function buildForm8826Document(rawInput: unknown): string {
  const input = inputSchema.parse(rawInput);
  const lines = calculateForm8826(input);
  if (lines.line7 > 0 && lines.line6 === 0) {
    throw new Error(
      "Pass-through-only disabled access credit is reported directly on Form 3800 without Form 8826",
    );
  }
  if (
    lines.line7 > 0 && input.eligible_expenditures > 0 && !isEligible(input)
  ) {
    throw new Error(
      "Form 8826 cannot combine an ineligible self-earned credit with pass-through credit",
    );
  }
  if (
    (input.pass_through_credits ?? []).some((source) =>
      source.credit_amount > 0 && source.subject_to_passive_activity_limit
    )
  ) {
    throw new Error(
      "Form 8826 passive pass-through credit needs Form 8582-CR before Form 3800",
    );
  }
  if (
    lines.line6 > 0 && isEligible(input) &&
    input.subject_to_passive_activity_limit
  ) {
    throw new Error(
      "Form 8826 passive credit needs Form 8582-CR before Form 3800",
    );
  }
  if (lines.line8 <= 0) {
    throw new Error("Form 8826 has no eligible source credit to document");
  }
  return elements("IRS8826", [
    element("TotalEligibleAccessExpendAmt", lines.line1),
    element("EligExpendAndMinDifferenceAmt", lines.line3),
    element("SmallerFromDifferenceOrMaxAmt", lines.line5),
    element("ShareOfCreditAmt", lines.line6),
    lines.line7 > 0
      ? element("PrtshpandSCorpDisabledAcsCrAmt", lines.line7)
      : "",
    element("PrtshpandSCorpReportAmt", lines.line8),
  ]);
}

type Input = Partial<F8826Input> & Record<string, unknown>;

export const form8826: MefFormDescriptor<"f8826", Input> = {
  pendingKey: "f8826",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8826.pdf",
  build(fields, context) {
    if (fields.eligible_expenditures === undefined) return "";
    const source = inputSchema.parse(fields);
    const lines = calculateForm8826(source);
    if (lines.line6 <= 0) return "";
    if (!isEligible(source)) {
      throw new Error("Form 8826 self-earned credit lacks eligibility");
    }
    if (
      context?.documentIdsByPendingKey &&
      context.documentIdsByPendingKey.f3800?.length !== 1
    ) {
      throw new Error("Form 8826 self-earned credit needs attached Form 3800");
    }
    return buildForm8826Document(source);
  },
};
