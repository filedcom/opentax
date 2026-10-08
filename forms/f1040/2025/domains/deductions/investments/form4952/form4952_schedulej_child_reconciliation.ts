import { inputSchema as dividendSchema } from "../../../../../nodes/inputs/income/investments/f1099div/index.ts";
import {
  assertForm8814CalculatedLines,
  type Form8814Lines,
} from "../../../../../nodes/inputs/income/investments/f8814/index.ts";
import {
  calculateAmtForm4952,
  calculateForm4952,
  inputSchema as form4952Schema,
} from "../../../../../nodes/intermediate/forms/deductions/investments/form4952/index.ts";
import { reconcileForm4952DirectDebtExport } from "./form4952_debt_reconciliation.ts";
import { reconcileForm4952Itemization } from "./form4952_itemization.ts";

const lineKeys = [
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

/** One current-year, owner-traced dividend/child election with an equal AMT copy. */
export function reconcileForm4952ScheduleJChildDividend(
  fields: Readonly<Record<string, unknown>>,
  pending: Readonly<Record<string, unknown>>,
  finalFilerTin?: string,
): number {
  const parsed = form4952Schema.safeParse(fields);
  const dividends = dividendSchema.safeParse(pending.f1099div);
  const child = (pending.form8814 as { items?: Form8814Lines[] } | undefined)
    ?.items;
  const f1040 = pending.f1040 as Record<string, unknown> | undefined;
  const scheduleA = pending.schedule_a as Record<string, unknown> | undefined;
  const form6251 = pending.form6251 as Record<string, unknown> | undefined;
  const tax = pending.income_tax_calculation as
    | Record<string, unknown>
    | undefined;
  if (
    !parsed.success || !dividends.success ||
    dividends.data.f1099divs.length !== 1 ||
    !Array.isArray(child) || child.length !== 1 ||
    !f1040 || !scheduleA || !form6251 || !tax
  ) {
    throw new Error(
      "Schedule J Form 4952 needs one reviewed parent dividend, child election, and finalized tax sources",
    );
  }
  const source = parsed.data;
  const payer = dividends.data.f1099divs[0];
  assertForm8814CalculatedLines(child, String(f1040.taxpayer_ssn ?? ""));
  const childLine = child[0];
  const childReview = childLine.item.source_review
    ?.capital_gain_distribution_review;
  if (
    !source.direct_debt_trace ||
    source.prior_year_carryforward_source !== undefined ||
    (source.prior_year_carryforward ?? 0) !== 0 ||
    (source.investment_interest_expense ?? 0) <= 0 ||
    (source.investment_income_election ?? 0) <= 0 ||
    source.elected_capital_gain_portion === undefined ||
    !Number.isSafeInteger(source.elected_capital_gain_portion) ||
    (source.investment_expenses ?? 0) !== 0 ||
    !source.amt_refigure ||
    Object.entries(source.amt_refigure).some(([key, amount]) =>
      key !== "elected_capital_gain_portion" && amount !== 0
    ) ||
    source.amt_refigure.elected_capital_gain_portion !==
      source.elected_capital_gain_portion ||
    source.source_1099_dividends !== payer.box1a ||
    source.source_1099_qualified_dividends !== payer.box1b ||
    source.form8814_line9_qualified_dividends !== childLine.line9 ||
    source.form8814_line10_capital_gain !== childLine.line10 ||
    source.form8814_line12_investment_income !==
      childLine.line12InvestmentIncome ||
    payer.investment_property_for_form4952 !== true ||
    !payer.source_document_reference?.trim() ||
    !payer.payerName?.trim() || payer.recipient_tin !== f1040.taxpayer_ssn ||
    payer.isNominee !== false || payer.box11 !== false ||
    (payer.box1b ?? 0) <= 0 ||
    (payer.box1b ?? 0) > payer.box1a ||
    [
      payer.box2a,
      payer.box2b,
      payer.box2c,
      payer.box2d,
      payer.box2e,
      payer.box2f,
      payer.box3,
      payer.box4,
      payer.box5,
      payer.box6,
      payer.box7,
      payer.box9,
      payer.box10,
      payer.box12,
      payer.box13,
      payer.box16,
    ].some((amount) => (amount ?? 0) !== 0) ||
    (payer.box8?.trim().length ?? 0) > 0 ||
    (payer.box14?.trim().length ?? 0) > 0 ||
    (payer.box15?.trim().length ?? 0) > 0 ||
    payer.nominee_distribution !== undefined ||
    !childReview || childReview.box2a !==
      childLine.item.capital_gain_distributions ||
    childReview.source_document_reference === payer.source_document_reference ||
    (source.source_1099_interest ?? 0) !== 0 ||
    (source.source_1099_royalties ?? 0) !== 0 ||
    (source.source_1099_capital_gain_distributions ?? 0) !== 0 ||
    (source.source_k1_interest ?? 0) !== 0 ||
    (source.source_k1_dividends ?? 0) !== 0 ||
    (source.source_k1_qualified_dividends ?? 0) !== 0 ||
    (source.source_k1_allowed_investment_expenses ?? 0) !== 0 ||
    (source.source_k1_investment_interest ?? 0) !== 0 ||
    (source.other_investment_property_gross_income ?? 0) !== 0 ||
    (source.other_investment_property_qualified_dividends ?? 0) !== 0 ||
    (source.other_investment_property_net_disposition_gain ?? 0) !== 0 ||
    (source.other_investment_property_net_capital_gain ?? 0) !== 0 ||
    pending.k1_partnership !== undefined ||
    pending.k1_s_corp !== undefined || pending.k1_trust !== undefined ||
    pending.f8949 !== undefined ||
    pending.schedule_d !== undefined &&
      Object.entries(pending.schedule_d as Record<string, unknown>).some(
        ([key, value]) => key !== "line13_form8814" && value !== undefined,
      ) ||
    pending.form1116 !== undefined
  ) {
    throw new Error(
      "Schedule J Form 4952 needs the distinct owner-paid debt, ordinary dividend, and child capital sources",
    );
  }
  reconcileForm4952DirectDebtExport(fields, pending, finalFilerTin);
  const lines = calculateForm4952(source);
  const amt = calculateAmtForm4952(source);
  if (
    lines.line1 <= 0 || lines.line8 <= 0 ||
    lines.line4a !== payer.box1a + childLine.line9 +
        childLine.line12InvestmentIncome ||
    lines.line4b !== (payer.box1b ?? 0) + childLine.line9 ||
    lines.line4d !== childLine.line10 ||
    lines.line4g > lines.line4b + lines.line4e ||
    amt.lines.line8 !== lines.line8 ||
    amt.lines.line4g !== lines.line4g ||
    amt.electedCapitalGain !== source.elected_capital_gain_portion ||
    lineKeys.some((key) => fields[key] !== lines[key]) ||
    scheduleA.line_9_investment_interest !== lines.line8 ||
    f1040.line12e_itemized_deductions !== lines.line8 ||
    f1040.line3a_qualified_dividends !== lines.line4b ||
    f1040.line3b_ordinary_dividends !== payer.box1a + childLine.line9 ||
    f1040.line7a_cap_gain_distrib !== childLine.line10 ||
    tax.form4952_election !== lines.line4g ||
    tax.form4952_elected_capital_gain !== source.elected_capital_gain_portion ||
    tax.form4952_amt_election !== amt.lines.line4g ||
    tax.form4952_amt_elected_capital_gain !==
      source.elected_capital_gain_portion ||
    form6251.form4952_regular_election !== lines.line4g ||
    form6251.form4952_amt_election !== amt.lines.line4g ||
    form6251.form4952_regular_elected_capital_gain !==
      source.elected_capital_gain_portion ||
    form6251.form4952_amt_elected_capital_gain !==
      source.elected_capital_gain_portion ||
    (form6251.line2c_investment_interest ?? 0) !== 0
  ) {
    throw new Error(
      "Schedule J Form 4952 regular/AMT election and itemized return lines differ from paid source",
    );
  }
  reconcileForm4952Itemization(pending, lines.line8);
  return lines.line4g;
}
