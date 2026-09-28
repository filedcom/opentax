import { z } from "zod";
import { inputSchema as form1099divSchema } from "../nodes/inputs/f1099div/index.ts";
import {
  calculateForm4952,
  inputSchema as form4952Schema,
} from "../nodes/intermediate/forms/form4952/index.ts";
import {
  plainInvestmentDividend,
  sourceAmountsMatch,
} from "./form4952_combined_reconciliation.ts";
import { reconcileForm4952Itemization } from "./form4952_itemization.ts";

const scheduleASchema = z.object({
  line_9_investment_interest: z.number().nonnegative(),
});
const form1040Schema = z.object({
  line3a_qualified_dividends: z.number().nonnegative().optional(),
  line3b_ordinary_dividends: z.number().nonnegative(),
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

export function reconcileForm4952DividendPath(
  fields: Record<string, unknown>,
  pending: Readonly<Record<string, unknown>>,
): void {
  const source = form1099divSchema.safeParse(pending.f1099div);
  const form = form4952Schema.safeParse(fields);
  const scheduleA = scheduleASchema.safeParse(pending.schedule_a);
  const form1040 = form1040Schema.safeParse(pending.f1040);
  if (
    !source.success || !form.success || !scheduleA.success ||
    !form1040.success
  ) {
    throw new Error(
      "Form 4952 dividend path needs its 1099-DIV, completed Form 4952, Schedule A line 9, and finalized Form 1040",
    );
  }
  const sourceItems = source.data.f1099divs;
  const total = sourceItems.reduce((sum, item) => sum + item.box1a, 0);
  const qualifiedTotal = sourceItems.reduce(
    (sum, item) => sum + (item.box1b ?? 0),
    0,
  );
  if (
    sourceItems.some((item) =>
      (item.box7 ?? 0) > 0 ||
      (item.box8?.trim().length ?? 0) > 0 ||
      (item.foreign_source_dividends_usd ?? 0) > 0 ||
      (item.foreign_source_qualified_dividends_usd ?? 0) > 0 ||
      item.foreign_tax_irs_country_code !== undefined
    )
  ) {
    throw new Error(
      "Form 4952 dividend path does not reconcile foreign-source dividends or foreign tax with Form 1116 investment-interest allocation",
    );
  }
  if (
    sourceItems.length === 0 ||
    !sourceItems.every((item) =>
      (item.box1b ?? 0) <= item.box1a &&
      plainInvestmentDividend({ ...item, box1b: 0 })
    ) ||
    !sourceAmountsMatch(
      form.data.source_1099_dividends,
      sourceItems.map((item) => item.box1a),
    ) ||
    (qualifiedTotal > 0
      ? !sourceAmountsMatch(
        form.data.source_1099_qualified_dividends,
        sourceItems.filter((item) => (item.box1b ?? 0) > 0).map((item) =>
          item.box1b ?? 0
        ),
      )
      : form.data.source_1099_qualified_dividends !== undefined) ||
    (form.data.source_1099_capital_gain_distributions ?? 0) !== 0 ||
    (form.data.source_1099_interest ?? 0) !== 0 ||
    (form.data.source_1099_royalties ?? 0) !== 0 ||
    (form.data.source_private_activity_bond_interest ?? 0) !== 0 ||
    (form.data.source_k1_interest ?? 0) !== 0 ||
    (form.data.source_k1_dividends ?? 0) !== 0 ||
    (form.data.source_k1_qualified_dividends ?? 0) !== 0 ||
    (form.data.source_k1_allowed_investment_expenses ?? 0) !== 0 ||
    (form.data.other_investment_property_gross_income ?? 0) !== 0 ||
    (form.data.other_investment_property_qualified_dividends ?? 0) !== 0 ||
    (form.data.other_investment_property_net_disposition_gain ?? 0) !== 0 ||
    (form.data.other_investment_property_net_capital_gain ?? 0) !== 0 ||
    (form.data.investment_income_election ?? 0) !== 0 ||
    (form.data.elected_capital_gain_portion ?? 0) !== 0 ||
    (form.data.investment_expenses ?? 0) !== 0 ||
    (form.data.prior_year_carryforward ?? 0) !== 0 ||
    (form.data.form8814_line9_qualified_dividends ?? 0) !== 0 ||
    (form.data.form8814_line10_capital_gain ?? 0) !== 0 ||
    (form.data.form8814_line12_investment_income ?? 0) !== 0 ||
    (form.data.source_k1_investment_interest ?? 0) !== 0 ||
    (form.data.investment_interest_expense ?? 0) <= 0 ||
    !form.data.amt_refigure ||
    Object.values(form.data.amt_refigure).some((amount) => amount !== 0)
  ) {
    throw new Error(
      "Form 4952 dividend path supports only 1099-DIV box 1a/1b investment payers without other income or election components",
    );
  }
  const lines = calculateForm4952(form.data);
  if (
    lines.line1 <= 0 || lines.line8 <= 0 ||
    lines.line4a !== total || lines.line4b !== qualifiedTotal ||
    lines.line4d !== 0 || lines.line5 !== 0 ||
    numberedLines.some((line) => fields[line] !== lines[line])
  ) {
    throw new Error(
      "Form 4952 numbered lines differ from the sourced dividend and calculated interest limit",
    );
  }
  if (
    scheduleA.data.line_9_investment_interest !== lines.line8 ||
    (form1040.data.line3a_qualified_dividends ?? 0) !== qualifiedTotal ||
    form1040.data.line3b_ordinary_dividends !== total ||
    form1040.data.line12e_itemized_deductions < lines.line8
  ) {
    throw new Error(
      "Form 4952 line 8 or dividend income differs from finalized Schedule A and Form 1040",
    );
  }
  reconcileForm4952Itemization(pending, lines.line8);
}
