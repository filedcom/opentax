import { element, elements } from "../../../../../mef/xml.ts";
import type { MefFormDescriptor } from "../../../form-descriptor.ts";
import { otherWithholdingStatementRows } from "../../../../domains/payments/withholding/f1099/f1099-withholding-reconciliation.ts";

const SOURCE_KEYS = [
  "f1099b",
  "f1099div",
  "f1099g",
  "f1099int",
  "f1099k",
  "f1099m",
  "f1099nec",
  "f1099oid",
  "f1099patr",
  "rrb1099r",
  "ssa1099",
] as const;

export const otherWithholdingStatement: MefFormDescriptor<
  "other_withholding_statement",
  unknown
> = {
  pendingKey: "other_withholding_statement",
  sourcePendingKeys: SOURCE_KEYS,
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/instructions/i1040gi",
  build(_fields, context) {
    const pending = context?.pending;
    if (!pending) return "";
    return elements(
      "OtherWithholdingStatement",
      otherWithholdingStatementRows(pending).map((row) =>
        elements("OtherWithholdingStmt", [
          element("WithholdingCd", "FORM 1099"),
          element("EIN", row.ein),
          element("WithholdingAmt", row.amount),
        ])
      ),
    );
  },
};
