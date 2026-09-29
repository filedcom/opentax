import { element, elements } from "../../../mef/xml.ts";
import { categorySummarySchema } from "../../../nodes/intermediate/forms/form_1116/index.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";
import { sourceGroups } from "./f1116.ts";

// ReturnData1040.xsd places these statements after Form 1116, so they are
// emitted separately and referenced from the matching Part I source column.
export const form1116DirectExpenseStatement: MefFormDescriptor<
  "form1116_direct_expense_statement",
  unknown,
  readonly string[]
> = {
  pendingKey: "form1116_direct_expense_statement",
  sourcePendingKeys: ["form_1116"],
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f1116.pdf",
  build(_fields, context = {}) {
    const raw = context.pending?.form_1116;
    if (!raw || typeof raw !== "object" || !("category_summaries" in raw)) {
      return [];
    }
    const summaries = Array.isArray(raw.category_summaries)
      ? raw.category_summaries.map((value) =>
        categorySummarySchema.parse(value)
      )
      : [];
    return summaries.flatMap(sourceGroups).filter((items) =>
      items.some((item) => (item.directly_allocable_deductions ?? 0) > 0)
    ).map((items) => {
      const lines = items.filter((item) =>
        (item.directly_allocable_deductions ?? 0) > 0
      ).map((item) => {
        if (!item.direct_expense_explanation) {
          throw new Error(
            "Form 1116 direct expenses need a source explanation",
          );
        }
        return `${item.irs_country_code}: ${item.direct_expense_explanation} (${item.directly_allocable_deductions})`;
      });
      const explanation = lines.join("; ");
      if (explanation.length > 9000) {
        throw new Error("Form 1116 direct-expense explanation is too long");
      }
      return elements("ForeignIncmRelatedExpensesStmt", [
        element("ExplanationTxt", explanation),
      ]);
    });
  },
};
