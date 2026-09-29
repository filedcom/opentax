import { element, elements } from "../../../mef/xml.ts";
import {
  calculateForm5884,
  inputSchema,
} from "../../../nodes/inputs/f5884/index.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export const form5884ControlledGroupStatement: MefFormDescriptor<
  "f5884_controlled_group_statement",
  unknown
> = {
  pendingKey: "f5884_controlled_group_statement",
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
    return elements(
      "ControlledGroupMemberStatement",
      lines.controlledGroupShares.map((member) =>
        elements("ControlledGroupMember", [
          elements("BusinessName", [
            element("BusinessNameLine1Txt", member.business_name),
          ]),
          element("ShareOfCreditAmt", member.credit_share),
        ])
      ),
    );
  },
};
