import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";
import { scheduleAOtherTaxRows } from "../../schedule_a_other_tax_source.ts";

export const scheduleAOtherTaxStatement: MefFormDescriptor<
  "schedule_a_other_tax_statement",
  unknown
> = {
  pendingKey: "schedule_a_other_tax_statement",
  sourcePendingKeys: ["schedule_a"],
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f1040sa--2025.pdf",
  build(_fields, context) {
    const pending = context?.pending;
    const source = pending?.schedule_a;
    const returnFields = pending?.f1040;
    if (
      !source || typeof source !== "object" || Array.isArray(source) ||
      !returnFields || typeof returnFields !== "object" ||
      Array.isArray(returnFields) ||
      (returnFields as Record<string, unknown>).line12e_itemized_deductions ===
        undefined
    ) return "";
    const rows = scheduleAOtherTaxRows(source as Record<string, unknown>);
    if (rows.length === 0) return "";
    return elements(
      "OtherDeductibleTaxStmt",
      rows.map((row) =>
        elements("OtherDeductibleTaxGrp", [
          element("Desc", row.label),
          element("Amt", row.amount),
        ])
      ),
    );
  },
};
