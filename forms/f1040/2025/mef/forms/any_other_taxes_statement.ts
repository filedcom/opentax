import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

// TY2025 ReturnData1040 permits one statement for Schedule 2 line 17z.
export const anyOtherTaxesStatement: MefFormDescriptor<
  "any_other_taxes_statement",
  unknown
> = {
  pendingKey: "any_other_taxes_statement",
  sourcePendingKeys: ["form8978_reporting_year"],
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040s2.pdf",
  build(_fields, context) {
    const adjustment = context?.pending?.form8978_reporting_year;
    if (!adjustment || typeof adjustment !== "object") return "";
    const reduction = (adjustment as Record<string, unknown>)
      .schedule2_line17z_reduction;
    if (typeof reduction !== "number" || reduction <= 0) return "";
    return elements("AnyOtherTaxesStatement", [
      elements("AnyOtherTaxesStmt", [
        element("OtherTaxTxt", "Form 8978 ADJ"),
        element("OtherTaxAmt", -reduction),
      ]),
    ]);
  },
};
