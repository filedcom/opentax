import { element, elements } from "../../../mef/xml.ts";
import {
  calculateForm8820,
  inputSchema,
} from "../../../nodes/inputs/f8820/index.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export const form8820ControlledGroupStatement: MefFormDescriptor<
  "f8820_controlled_group_statement",
  unknown
> = {
  pendingKey: "f8820_controlled_group_statement",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f8820.pdf",
  build(_fields, context = {}) {
    const raw = context.pending?.f8820;
    if (!raw) return "";
    const input = inputSchema.parse(raw);
    if (!input.controlled_group) return "";
    const lines = calculateForm8820(input);
    if (lines.line2c <= 0 && !input.reduced_section280c_credit_election) {
      return "";
    }
    const group = lines.controlledGroup!;
    const explanation = [
      `Form 8820 line 2a; group classification: ${input.controlled_group.group_classification_document_reference}; rate: ${
        input.reduced_section280c_credit_election ? "19.75%" : "25%"
      }; aggregate qualified expenses: ${group.totalExpenses}; aggregate credit: ${group.totalCredit}; taxpayer EIN: ${input.controlled_group.taxpayer_member_ein}; taxpayer share: ${lines.line2a}.`,
      ...group.members.map((member) =>
        `${member.business_name} (${member.ein}): qualified expenses ${member.qualified_clinical_testing_expenses}; credit share ${member.credit_share}.`
      ),
    ].join(" ");
    if (explanation.length > 1000) {
      throw new Error(
        "Form 8820 controlled-group statement exceeds the IRS 1000-character limit",
      );
    }
    return elements("ControlledGroupMembersStmt", [
      element("ShortExplanationTxt", explanation),
    ]);
  },
};
