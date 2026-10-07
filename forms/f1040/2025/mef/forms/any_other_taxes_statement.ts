import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";
import { section1294DueFromCalculatedForm } from "../../../nodes/inputs/f8621/section1294.ts";

// TY2025 ReturnData1040 permits one statement for Schedule 2 line 17z.
export const anyOtherTaxesStatement: MefFormDescriptor<
  "any_other_taxes_statement",
  unknown
> = {
  pendingKey: "any_other_taxes_statement",
  sourcePendingKeys: ["form8978_reporting_year", "form8621"],
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1040s2.pdf",
  build(_fields, context) {
    const adjustment = context?.pending?.form8978_reporting_year;
    const reduction = adjustment && typeof adjustment === "object"
      ? (adjustment as Record<string, unknown>).schedule2_line17z_reduction
      : undefined;
    const tax =
      section1294DueFromCalculatedForm(context?.pending?.form8621).tax;
    const rows = [
      ...(tax > 0
        ? [elements("AnyOtherTaxesStmt", [
          element("OtherTaxTxt", "1294DT"),
          element("OtherTaxAmt", tax),
        ])]
        : []),
      ...(typeof reduction === "number" && reduction > 0
        ? [elements("AnyOtherTaxesStmt", [
          element("OtherTaxTxt", "Form 8978 ADJ"),
          element("OtherTaxAmt", -reduction),
        ])]
        : []),
    ];
    return rows.length > 0 ? elements("AnyOtherTaxesStatement", rows) : "";
  },
};
