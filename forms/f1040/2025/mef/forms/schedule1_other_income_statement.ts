import { element, elements } from "../../../mef/xml.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";
import { schedule1OtherIncomeRows } from "./schedule1_other_income_rows.ts";

/** TY2025 ReturnData1040 permits one ordered line-8z type statement. */
export const schedule1OtherIncomeStatement: MefFormDescriptor<
  "schedule1_other_income_statement",
  unknown
> = {
  pendingKey: "schedule1_other_income_statement",
  sourcePendingKeys: ["schedule1"],
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f1040s1--2025.pdf",
  build(_fields, context) {
    const source = context?.pending?.schedule1;
    if (!source || typeof source !== "object" || Array.isArray(source)) {
      return "";
    }
    const rows = schedule1OtherIncomeRows(source as Record<string, unknown>);
    if (rows.length === 0) return "";
    if (rows.length > 100) {
      throw new Error("Schedule 1 line 8z exceeds MeF statement row capacity");
    }
    return elements(
      "OtherIncomeTypeStatement",
      rows.map((row) =>
        elements("OtherIncomeTypeStmt", [
          row.literalCode
            ? element("OtherIncomeLitCd", row.literalCode)
            : element("OtherIncomeCodeTxt", row.label),
          element("OtherIncomeAmt", row.amount),
        ])
      ),
    );
  },
};
