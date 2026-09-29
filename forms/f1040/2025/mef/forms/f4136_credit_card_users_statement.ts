import { element, elements } from "../../../mef/xml.ts";
import {
  allForm4136Claims,
  inputSchema,
} from "../../../nodes/inputs/f4136/index.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

// Form 4136 line 13c's $.244 source tax changes the printed credit rate.
export const form4136CreditCardUsersStatement: MefFormDescriptor<
  "f4136_credit_card_users_statement",
  unknown
> = {
  pendingKey: "f4136_credit_card_users_statement",
  sourcePendingKeys: ["f4136"],
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f4136.pdf",
  build(_fields, context = {}) {
    const raw = context.pending?.f4136;
    if (!raw) return "";
    const input = inputSchema.parse(raw);
    const highRate13c = allForm4136Claims(input).some((claim) =>
      claim.line === "13c" && claim.excise_tax_rate_per_gallon === 0.244
    );
    if (!highRate13c) return "";
    return elements("NontxUseFuelsCrCardUsersStmt", [
      elements("NontaxableUseUsersStmt", [
        element(
          "ShortExplanationTxt",
          "Form 4136 line 13c kerosene for use in aviation taxed at $0.244 per gallon",
        ),
        element("LineNum", "13c"),
        element("CreditRt", "0.243"),
      ]),
    ]);
  },
};
