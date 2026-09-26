import { element, elements } from "../../../mef/xml.ts";
import {
  calculateForm8826,
  inputSchema,
} from "../../../nodes/inputs/f8826/index.ts";

/**
 * TY2025 Form 8826 source document. Do not register until Form 3800's
 * allowed-credit route and source-document reconciliation are assembled.
 */
export function buildForm8826Document(rawInput: unknown): string {
  const input = inputSchema.parse(rawInput);
  const lines = calculateForm8826(input);
  if (lines.line8 > 0 && input.subject_to_passive_activity_limit) {
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
    element("PrtshpandSCorpReportAmt", lines.line8),
  ]);
}
