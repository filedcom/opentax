import { z } from "zod";
import { inputSchema as dividendSchema } from "../nodes/inputs/f1099div/index.ts";
import { inputSchema as partnershipSchema } from "../nodes/inputs/k1_partnership/index.ts";
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
const permittedPartnershipFields = new Set([
  "partnership_name",
  "partnership_ein",
  "source_document_reference",
  "box13_code_h_investment_interest",
]);

/** K-1 code H investment interest limited by domestic investment dividends. */
export function reconcileForm4952K1InterestAgainst1099DivPath(
  fields: Record<string, unknown>,
  pending: Readonly<Record<string, unknown>>,
): void {
  const partnership = partnershipSchema.safeParse(pending.k1_partnership);
  const dividend = dividendSchema.safeParse(pending.f1099div);
  const form = form4952Schema.safeParse(fields);
  const scheduleA = scheduleASchema.safeParse(pending.schedule_a);
  const form1040 = form1040Schema.safeParse(pending.f1040);
  if (
    !partnership.success || !dividend.success || !form.success ||
    !scheduleA.success || !form1040.success
  ) {
    throw new Error(
      "Form 4952 mixed K-1/1099-DIV path needs both sources, completed Form 4952, Schedule A, and finalized Form 1040",
    );
  }
  const k1s = partnership.data.k1_partnerships;
  const payers = dividend.data.f1099divs;
  const k1Expense = k1s.reduce(
    (sum, item) => sum + (item.box13_code_h_investment_interest ?? 0),
    0,
  );
  const ordinaryDividends = payers.reduce(
    (sum, item) => sum + item.box1a,
    0,
  );
  const qualifiedDividends = payers.reduce(
    (sum, item) => sum + (item.box1b ?? 0),
    0,
  );
  if (
    k1s.length === 0 || payers.length === 0 ||
    new Set(k1s.map((item) => item.partnership_ein)).size !== k1s.length ||
    new Set(k1s.map((item) => item.source_document_reference)).size !==
      k1s.length ||
    k1s.some((item) =>
      !item.partnership_ein || !item.source_document_reference ||
      (item.box13_code_h_investment_interest ?? 0) <= 0 ||
      Object.keys(item).some((key) => !permittedPartnershipFields.has(key))
    ) ||
    payers.some((item) =>
      (item.box7 ?? 0) > 0 ||
      (item.box8?.trim().length ?? 0) > 0 ||
      (item.foreign_source_dividends_usd ?? 0) > 0 ||
      (item.foreign_source_qualified_dividends_usd ?? 0) > 0 ||
      item.foreign_tax_irs_country_code !== undefined ||
      (item.box1b ?? 0) > item.box1a ||
      !plainInvestmentDividend({ ...item, box1b: 0 })
    ) ||
    !sourceAmountsMatch(
      form.data.source_k1_investment_interest,
      k1s.map((item) => item.box13_code_h_investment_interest ?? 0),
    ) ||
    !sourceAmountsMatch(
      form.data.source_1099_dividends,
      payers.map((item) => item.box1a),
    ) ||
    (qualifiedDividends > 0
      ? !sourceAmountsMatch(
        form.data.source_1099_qualified_dividends,
        payers.filter((item) => (item.box1b ?? 0) > 0).map((item) =>
          item.box1b ?? 0
        ),
      )
      : form.data.source_1099_qualified_dividends !== undefined) ||
    k1Expense <= 0 || ordinaryDividends <= 0 ||
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
    (form.data.source_1099_capital_gain_distributions ?? 0) !== 0 ||
    (form.data.source_1099_royalties ?? 0) !== 0 ||
    (form.data.source_private_activity_bond_interest ?? 0) !== 0 ||
    (form.data.source_k1_interest ?? 0) !== 0 ||
    (form.data.source_k1_dividends ?? 0) !== 0 ||
    (form.data.source_k1_qualified_dividends ?? 0) !== 0 ||
    (form.data.source_k1_allowed_investment_expenses ?? 0) !== 0 ||
    (form.data.form8814_line9_qualified_dividends ?? 0) !== 0 ||
    (form.data.form8814_line10_capital_gain ?? 0) !== 0 ||
    (form.data.form8814_line12_investment_income ?? 0) !== 0 ||
    !form.data.amt_refigure ||
    Object.values(form.data.amt_refigure).some((amount) => amount !== 0)
  ) {
    throw new Error(
      "Form 4952 mixed path supports only identified code H K-1 expenses and domestic 1099-DIV box 1a/1b income without elections",
    );
  }
  const lines = calculateForm4952(form.data);
  if (
    lines.line1 !== k1Expense || lines.line4a !== ordinaryDividends ||
    lines.line4b !== qualifiedDividends || lines.line8 <= 0 ||
    lines.line2 !== 0 || lines.line4d !== 0 || lines.line5 !== 0 ||
    numberedLines.some((line) => fields[line] !== lines[line])
  ) {
    throw new Error(
      "Form 4952 mixed numbered lines differ from sourced K-1 and 1099-DIV amounts",
    );
  }
  if (
    scheduleA.data.line_9_investment_interest !== lines.line8 ||
    (form1040.data.line3a_qualified_dividends ?? 0) !== qualifiedDividends ||
    form1040.data.line3b_ordinary_dividends !== ordinaryDividends ||
    form1040.data.line12e_itemized_deductions < lines.line8
  ) {
    throw new Error(
      "Form 4952 mixed deduction or dividends differ from finalized Schedule A and Form 1040",
    );
  }
  reconcileForm4952Itemization(pending, lines.line8);
}
