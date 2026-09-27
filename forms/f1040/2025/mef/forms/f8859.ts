import { z } from "zod";
import { element, elements } from "../../../mef/xml.ts";
import {
  inputSchema,
  totalCarryforward,
} from "../../../nodes/inputs/f8859/index.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

const amount = z.number().finite().nonnegative();
const finalizedSchema = inputSchema.extend({
  line1_carryforward: amount,
  line2_limit: amount,
  line3_allowed_credit: amount,
  line4_carryforward: amount,
});
type PendingForm8859 = Partial<z.infer<typeof finalizedSchema>>;

export const form8859: MefFormDescriptor<"f8859", PendingForm8859> = {
  pendingKey: "f8859",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8859--2025.pdf",
  build(raw, context = {}) {
    if (!raw.f8859s?.length) return "";
    const fields = finalizedSchema.parse(raw);
    const source = totalCarryforward(fields.f8859s);
    if (source <= 0) return "";
    const schedule3 = z.object({
      line6h_dc_homebuyer_credit: amount.optional(),
    }).parse(context.pending?.schedule3);
    if (
      Math.round(source * 100) !==
        Math.round(fields.line1_carryforward * 100) ||
      Math.round(fields.line3_allowed_credit * 100) !==
        Math.round((schedule3.line6h_dc_homebuyer_credit ?? 0) * 100) ||
      fields.line3_allowed_credit > fields.line1_carryforward ||
      fields.line3_allowed_credit > fields.line2_limit ||
      Math.round(fields.line4_carryforward * 100) !==
        Math.round(
          (fields.line1_carryforward - fields.line3_allowed_credit) * 100,
        )
    ) {
      throw new Error(
        "Form 8859 does not reconcile to its source and Schedule 3",
      );
    }
    return elements("IRS8859", [
      element("DCHmByrCreditCarryforwardPYAmt", fields.line1_carryforward),
      element("TaxLiabLmtFromCrLmtWrkshtAmt", fields.line2_limit),
      element("DCHmByrCurrentYearCreditAmt", fields.line3_allowed_credit),
      element("DCHmByrCreditCfwdNextYearAmt", fields.line4_carryforward),
    ]);
  },
};
