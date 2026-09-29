import { element, elements } from "../../../mef/xml.ts";
import {
  calculateForm5884,
  inputSchema,
} from "../../../nodes/inputs/f5884/index.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export const form5884DeductionDifferentiationStatement: MefFormDescriptor<
  "f5884_deduction_differentiation_stmt",
  unknown
> = {
  pendingKey: "f5884_deduction_differentiation_stmt",
  sourcePendingKeys: ["f5884"],
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f5884.pdf",
  build(_fields, context = {}) {
    const raw = context.pending?.f5884;
    if (!raw) return "";
    const input = inputSchema.parse(raw);
    if (!input.controlled_group) return "";
    const lines = calculateForm5884(input);
    if (lines.line2 <= 0) return "";
    const totalWages = lines.controlledGroupShares.reduce(
      (sum, member) => sum + member.qualified_wages,
      0,
    );
    const details = lines.controlledGroupShares.map((member) =>
      `${member.business_name} (EIN ${member.ein}): ` +
      `qualified wages ${member.qualified_wages}, ` +
      `credit share ${member.credit_share}`
    );
    const explanation =
      `Form 5884 controlled-group credit allocation (${input.controlled_group.group_classification_document_reference}): ` +
      `group qualified wages ${totalWages}; ` +
      `group credit ${lines.groupCredit}; taxpayer member ${input.controlled_group.taxpayer_member_ein}; ` +
      `taxpayer line 2 share ${lines.line2}. ` + details.join("; ");
    if (explanation.length > 9000) {
      throw new Error("Form 5884 controlled-group explanation is too long");
    }
    return elements("DeductionDifferentiationStmt", [
      element("ExplanationTxt", explanation),
    ]);
  },
};
