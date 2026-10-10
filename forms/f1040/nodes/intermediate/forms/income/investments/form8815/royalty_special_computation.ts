import { z } from "zod";
import { calculateForm4952 } from "../../../deductions/investments/form4952/index.ts";
import { royaltyDebtTraceSchema } from "../../../deductions/investments/form4952/royalty_debt.ts";

export const royaltySpecialSchema = z.object({
  debt_trace: royaltyDebtTraceSchema,
  other_income_before_royalty_interest: z.number().int(),
}).strict();

/** Form 8815 line 9 step 6: this computation is not a filed Form 4952. */
export function royaltyMagiDeduction(
  source: z.infer<typeof royaltySpecialSchema>,
  grossInterest: number,
): number {
  return calculateForm4952({
    royalty_debt_trace: source.debt_trace,
    source_1099_royalties:
      source.debt_trace.royalty_source.box2_gross_royalties,
    source_1099_interest: grossInterest,
    amt_refigure: {
      prior_year_disallowed_interest: 0,
      interest_on_private_activity_bonds: 0,
      other_gross_income_adjustment: 0,
      qualified_dividends_adjustment: 0,
      net_disposition_gain_adjustment: 0,
      net_capital_gain_adjustment: 0,
      investment_expenses_adjustment: 0,
    },
  }).line8;
}
