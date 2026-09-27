import { z } from "zod";
import { filingStatusSchema } from "../../types.ts";

// Parent facts come from the parent return. The child return can derive its
// own taxable income and tax, but cannot infer these cross-return amounts.
export const inputSchema = z.object({
  eligibility_confirmed: z.literal(true),
  parent_name: z.string().trim().min(1).max(50),
  parent_name_control: z.string().trim().min(1).max(4),
  parent_ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/),
  parent_filing_status: filingStatusSchema,
  parent_taxable_income: z.number().nonnegative(),
  parent_income_tax: z.number().nonnegative(),
  parent_tax_method: z.enum([
    "ordinary",
    "qualified_dividend",
    "schedule_d",
    "schedule_j",
    "foreign_earned_income",
  ]),
  child_unearned_income: z.number().nonnegative(),
  itemized_deductions_directly_connected: z.number().nonnegative().optional(),
  // Line 5 from every other Form 8615 for this parent. An explicit empty
  // array affirms that there are no other children in the allocation.
  other_children_line5: z.array(z.number().nonnegative()),
  // These are the net preferential amounts included in each other child's
  // Form 8615 line 5, after that child's own Line 5 Worksheet.
  other_children_qualified_dividends_line5: z.array(z.number().nonnegative()),
  other_children_net_capital_gain_line5: z.array(z.number().nonnegative()),
  other_children_schedule_d_tax_worksheet_used: z.array(z.boolean()),
  other_children_form2555_used: z.array(z.boolean()),
  parent_qualified_dividends: z.number().nonnegative(),
  parent_net_capital_gain: z.number().nonnegative(),
  // Worksheet #2/#3 requires the itemized expenses directly connected to
  // qualified dividends and net capital gain, not all line 2 expenses.
  itemized_deductions_directly_connected_to_preferential_income: z.number()
    .nonnegative().optional(),
});

export type F8615Input = z.infer<typeof inputSchema>;
