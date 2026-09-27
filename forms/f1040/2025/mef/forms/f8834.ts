import { z } from "zod";
import { element, elements } from "../../../mef/xml.ts";
import {
  form8834SourceCredit,
  itemSchema,
} from "../../../nodes/inputs/f8834/index.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

const amount = z.number().finite().nonnegative();
const finalizedSchema = z.object({
  f8834s: z.array(itemSchema).min(1),
  line1_source_credit: amount,
  line2_regular_tax: amount,
  line3a_foreign_tax_credit: amount,
  line3b_other_credits: amount,
  line3c_total_credits: amount,
  line4_net_regular_tax: amount,
  line5_tentative_minimum_tax: amount,
  line6_adjusted_regular_tax: amount,
  line7_allowed_credit: amount,
});
type PendingForm8834 = Partial<z.infer<typeof finalizedSchema>>;

function equalCents(a: number, b: number): boolean {
  return Math.round(a * 100) === Math.round(b * 100);
}

export const form8834: MefFormDescriptor<"f8834", PendingForm8834> = {
  pendingKey: "f8834",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8834--2024.pdf",
  build(raw, context = {}) {
    if (!raw.f8834s?.length) return "";
    const fields = finalizedSchema.parse(raw);
    const source = form8834SourceCredit(fields);
    if (source <= 0) return "";
    const schedule3 = z.object({
      line6i_qualified_electric_vehicle_credit: amount.optional(),
    }).parse(context.pending?.schedule3);
    if (
      !equalCents(source, fields.line1_source_credit) ||
      !equalCents(
        fields.line3c_total_credits,
        fields.line3a_foreign_tax_credit + fields.line3b_other_credits,
      ) ||
      !equalCents(
        fields.line4_net_regular_tax,
        Math.max(0, fields.line2_regular_tax - fields.line3c_total_credits),
      ) ||
      !equalCents(
        fields.line6_adjusted_regular_tax,
        Math.max(
          0,
          fields.line4_net_regular_tax - fields.line5_tentative_minimum_tax,
        ),
      ) ||
      !equalCents(
        fields.line7_allowed_credit,
        Math.min(fields.line1_source_credit, fields.line6_adjusted_regular_tax),
      ) ||
      !equalCents(
        fields.line7_allowed_credit,
        schedule3.line6i_qualified_electric_vehicle_credit ?? 0,
      )
    ) {
      throw new Error(
        "Form 8834 does not reconcile to its source, tax limit, and Schedule 3",
      );
    }
    return elements("IRS8834", [
      element("QlfyElecVehPssvActyCrAllwAmt", fields.line1_source_credit),
      element("QlfyElecVehRegularTxBfrCrAmt", fields.line2_regular_tax),
      element("ForeignTaxCreditAmt", fields.line3a_foreign_tax_credit),
      element("CertainAllowableCreditsAmt", fields.line3b_other_credits),
      element("TotTaxCrBfrQlfyElecVehCrAmt", fields.line3c_total_credits),
      element("QlfyElecVehNetRegularTaxAmt", fields.line4_net_regular_tax),
      element(
        "QlfyElecVehTentativeMinTaxAmt",
        fields.line5_tentative_minimum_tax,
      ),
      element("QlfyElecVehAdjRegularTaxAmt", fields.line6_adjusted_regular_tax),
      element("QlfyElecMotorVehCrAmt", fields.line7_allowed_credit),
    ]);
  },
};
