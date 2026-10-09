import { k1PortfolioSources } from "./form4952_k1_portfolio_sources.ts";
import { z } from "zod";
import { inputSchema as partnershipSchema } from "../../../../../nodes/inputs/income/rental-passthrough/k1_partnership/index.ts";
import {
  calculateForm4952,
  inputSchema as form4952Schema,
} from "../../../../../nodes/intermediate/forms/deductions/investments/form4952/index.ts";
import { reconcileForm4952Itemization } from "./form4952_itemization.ts";

const scheduleASchema = z.object({
  line_9_investment_interest: z.number().nonnegative(),
});
const form1040Schema = z.object({
  line2b_taxable_interest: z.number().nonnegative().optional(),
  line3a_qualified_dividends: z.number().nonnegative().optional(),
  line3b_ordinary_dividends: z.number().nonnegative().optional(),
  line12e_itemized_deductions: z.number().nonnegative(),
});
const numberedLines = [
  "line1",
  "line2",
  "line3",
  "line4a",
  "line4b",
  "line4c",
  "line4d",
  "line4e",
  "line4f",
  "line4g",
  "line4h",
  "line5",
  "line6",
  "line7",
  "line8",
] as const;
/** Source-identified K-1 box 5 income and code H interest. */
export function reconcileForm4952PartnershipPath(
  fields: Record<string, unknown>,
  pending: Readonly<Record<string, unknown>>,
): void {
  const partnership = partnershipSchema.safeParse(pending.k1_partnership);
  const form = form4952Schema.safeParse(fields);
  const scheduleA = scheduleASchema.safeParse(pending.schedule_a);
  const form1040 = form1040Schema.safeParse(pending.f1040);
  if (
    !partnership.success || !form.success || !scheduleA.success ||
    !form1040.success
  ) {
    throw new Error(
      "Form 4952 partnership path needs its K-1, completed Form 4952, Schedule A line 9, and finalized Form 1040",
    );
  }
  const items = partnership.data.k1_partnerships;
  const portfolio = k1PortfolioSources(items, form.data);
  const interest = portfolio.interest;
  const expense = portfolio.expense;
  if (items.some((item) => item.box20_code_b_investment_expenses)) {
    throw new Error(
      "Form 4952 K-1 box 20 code B needs a source-linked deduction on the filed return before XML or PDF export",
    );
  }
  if (
    !portfolio.valid || interest + portfolio.dividends <= 0 ||
    form.data.source_k1_allowed_investment_expenses !== undefined ||
    (form.data.investment_interest_expense ?? 0) !== 0 ||
    (form.data.prior_year_carryforward ?? 0) !== 0 ||
    (form.data.other_investment_property_gross_income ?? 0) !== 0 ||
    (form.data.other_investment_property_qualified_dividends ?? 0) !== 0 ||
    (form.data.other_investment_property_net_disposition_gain ?? 0) !== 0 ||
    (form.data.other_investment_property_net_capital_gain ?? 0) !== 0 ||
    (form.data.investment_income_election ?? 0) !== 0 ||
    (form.data.elected_capital_gain_portion ?? 0) !== 0 ||
    (form.data.investment_expenses ?? 0) !== 0 ||
    (form.data.source_1099_interest ?? 0) !== 0 ||
    (form.data.source_1099_dividends ?? 0) !== 0 ||
    (form.data.source_1099_qualified_dividends ?? 0) !== 0 ||
    (form.data.source_1099_capital_gain_distributions ?? 0) !== 0 ||
    (form.data.source_1099_royalties ?? 0) !== 0 ||
    (form.data.source_private_activity_bond_interest ?? 0) !== 0 ||
    (form.data.form8814_line9_qualified_dividends ?? 0) !== 0 ||
    (form.data.form8814_line10_capital_gain ?? 0) !== 0 ||
    (form.data.form8814_line12_investment_income ?? 0) !== 0 ||
    !form.data.amt_refigure ||
    Object.values(form.data.amt_refigure).some((amount) => amount !== 0)
  ) {
    throw new Error(
      "Form 4952 partnership path supports only sourced box 5 and box 13 code H K-1s without other income, expenses, or elections",
    );
  }
  const lines = calculateForm4952(form.data);
  if (
    lines.line1 !== expense ||
    lines.line4a !== interest + portfolio.dividends ||
    lines.line8 <= 0 || lines.line2 !== 0 ||
    lines.line4b !== portfolio.qualified ||
    lines.line4d !== 0 || lines.line5 !== 0 ||
    numberedLines.some((line) => fields[line] !== lines[line])
  ) {
    throw new Error(
      "Form 4952 partnership numbered lines differ from the sourced K-1 amounts",
    );
  }
  if (
    scheduleA.data.line_9_investment_interest !== lines.line8 ||
    (form1040.data.line2b_taxable_interest ?? 0) !== interest ||
    (form1040.data.line3b_ordinary_dividends ?? 0) !== portfolio.dividends ||
    (form1040.data.line3a_qualified_dividends ?? 0) !== portfolio.qualified ||
    form1040.data.line12e_itemized_deductions < lines.line8
  ) {
    throw new Error(
      "Form 4952 partnership deduction or interest differs from finalized Schedule A and Form 1040",
    );
  }
  reconcileForm4952Itemization(pending, lines.line8);
}
