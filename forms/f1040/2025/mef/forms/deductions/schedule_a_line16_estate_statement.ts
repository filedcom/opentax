import { element, elements } from "../../../../mef/xml.ts";
import type { MefFormDescriptor } from "../../form-descriptor.ts";
import { scheduleALine16EstateTax } from "../../../domains/deductions/schedule-a/schedule_a_line16_estate_source.ts";

export const scheduleALine16EstateStatement: MefFormDescriptor<
  "schedule_a_line16_estate_statement",
  unknown
> = {
  pendingKey: "schedule_a_line16_estate_statement",
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
    const amount = scheduleALine16EstateTax(
      pending,
      (source as Record<string, unknown>).line_16_other_deductions,
    );
    if (amount === 0) return "";
    return elements("OtherMiscDeductionsStmt", [
      elements("MiscellaneousDeductionDetail", [
        element("MiscellaneousDeductionTypeDesc", "FEDERAL ESTATE TAX"),
        element("MiscellaneousDeductionAmt", amount),
      ]),
    ]);
  },
};
