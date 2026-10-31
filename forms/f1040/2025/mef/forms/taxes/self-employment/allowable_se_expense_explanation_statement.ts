import { element, elements } from "../../../../../mef/xml.ts";
import { assertFileableClergyReturn } from "../../../../domains/income/wages/clergy/clergy_source.ts";
import type { MefFormDescriptor } from "../../../form-descriptor.ts";
import { mefTaxYear } from "../../../support/year-config.ts";

/**
 * Explains ministerial earnings, less allowable expenses, on Schedule SE line
 * 2 (i1040sse 2025, Ministers: "subtract on line 2 the allowable expenses ...
 * and attach an explanation"; Pub 517 (2025), "Allowable deductions":
 * "Subtract any allowable expenses from those wages, include the net amount
 * on line 2 of Schedule SE (Form 1040), and attach an explanation"). One
 * statement per minister whose filed Schedule SE subtracts expenses, taxpayer
 * first; IRS1040ScheduleSE names it as AllowableSEExpenseExplanationStatement.
 */
export const allowableSeExpenseExplanationStatement: MefFormDescriptor<
  "allowable_se_expense_explanation_statement",
  unknown,
  readonly string[]
> = {
  pendingKey: "allowable_se_expense_explanation_statement",
  sourcePendingKeys: ["clergy"],
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/p517.pdf",
  build(_fields, context) {
    const facts = context?.pending
      ? assertFileableClergyReturn(
        context.pending as Readonly<Record<string, Record<string, unknown>>>,
        mefTaxYear(context),
        context.filer,
      )
      : undefined;
    if (!facts) return [];
    return (["T", "S"] as const).flatMap((owner) => {
      const text = facts.scheduleSeExplanations.get(owner);
      return text === undefined ? [] : [
        elements("AllowableSEExpenseExplnStmt", [
          element("ExplanationTxt", text),
        ]),
      ];
    });
  },
};
