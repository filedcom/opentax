import { element, elements } from "../../../mef/xml.ts";
import {
  calculateForm8826,
  type F8826Input,
  inputSchema,
  isEligible,
} from "../../../nodes/inputs/f8826/index.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";
import { reconcileDisabledAccessK1Credits } from "./f8826_credit_evidence.ts";
import { readDisabledAccessCapLedger } from "./f8826_cap_ledger.ts";

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
    if (context?.documentIdsByPendingKey) {
      if (
        (source.subject_to_passive_activity_limit && lines.line6 > 0 ||
          (source.pass_through_credits ?? []).some((entry) =>
            entry.credit_amount > 0 &&
            entry.subject_to_passive_activity_limit
          )) && !readDisabledAccessCapLedger(context)
      ) {
        throw new Error(
          "Passive Form 8826 needs its Form 8582-CR source ledger",
        );
      }
      if (
        lines.line8 > 0 &&
        context.documentIdsByPendingKey.f3800?.length !== 1
      ) {
        throw new Error("Form 8826 credit needs one attached Form 3800");
      }
      if ((source.pass_through_credits?.length ?? 0) > 0) {
        if (!context.pending) {
          throw new Error("Form 8826 K-1 source needs the filed return");
        }
        reconcileDisabledAccessK1Credits(
          (source.pass_through_credits ?? []).map((entry) => ({
            source_type: entry.entity_type,
            entity_ein: entry.entity_ein,
            source_document_reference: entry.source_document_reference,
            credit_amount: entry.credit_amount,
            subject_to_passive_activity_limit:
              entry.subject_to_passive_activity_limit,
          })),
          context.pending,
        );
      }
    }
    if (lines.line6 <= 0) return "";
    if (!isEligible(source)) {
      throw new Error("Form 8826 self-earned credit lacks eligibility");
    }
    return buildForm8826Document(source);
  },
};
