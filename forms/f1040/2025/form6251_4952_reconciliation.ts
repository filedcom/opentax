import {
  calculateAmtForm4952,
  calculateForm4952,
  inputSchema as form4952Schema,
} from "../nodes/intermediate/forms/form4952/index.ts";
import { inputSchema as interestSourceSchema } from "../nodes/inputs/f1099int/index.ts";
import { reconcileForm4952DirectDebtExport } from "./form4952_debt_reconciliation.ts";
import { reconcileForm4952InterestPath } from "./form4952_interest_reconciliation.ts";
import { reconcileForm4952PriorCarryforward } from "./form4952_prior_carryforward_reconciliation.ts";

/** Replay a bounded Schedule A investment-interest AMT refigure at filing. */
export function assertForm6251Form4952Line2c(
  fields: Readonly<Record<string, unknown>>,
  pending: Readonly<Record<string, unknown>> | undefined,
  finalFilerTin?: string,
  requireFinalFiler = false,
): void {
  const retainedRaw = pending?.form4952 as Record<string, unknown> | undefined;
  const claimed = Number(fields.line2c_investment_interest ?? 0);
  const retainedDifference = Number(
    (pending?.form6251 as Record<string, unknown> | undefined)
      ?.form4952_amt_line2c_difference ?? 0,
  );
  const parsed = form4952Schema.safeParse(retainedRaw);
  const sourceDifference = parsed.success && parsed.data.amt_refigure
    ? calculateForm4952(parsed.data).line8 -
      calculateAmtForm4952(parsed.data).lines.line8
    : 0;
  if (claimed === 0 && retainedDifference === 0 && sourceDifference === 0) {
    return;
  }
  if (requireFinalFiler && !finalFilerTin) {
    throw new Error("Form 6251 line 2c needs final filer identity");
  }
  const interest = interestSourceSchema.safeParse(pending?.f1099int);
  const form1040 = pending?.f1040 as Record<string, unknown> | undefined;
  const scheduleA = pending?.schedule_a as Record<string, unknown> | undefined;
  const schedule2 = pending?.schedule2 as Record<string, unknown> | undefined;
  if (
    !parsed.success || !interest.success ||
    (interest.data.f1099ints.length !== 1 &&
      interest.data.f1099ints.length !== 2) ||
    !parsed.data.direct_debt_trace ||
    !parsed.data.prior_year_carryforward_source ||
    !parsed.data.amt_refigure ||
    parsed.data.prior_year_carryforward ===
      parsed.data.amt_refigure.prior_year_disallowed_interest ||
    (parsed.data.investment_income_election ?? 0) !== 0 ||
    (parsed.data.elected_capital_gain_portion ?? 0) !== 0 ||
    parsed.data.amt_refigure.interest_on_private_activity_bonds !== 0 ||
    parsed.data.amt_refigure.other_gross_income_adjustment !== 0 ||
    parsed.data.amt_refigure.qualified_dividends_adjustment !== 0 ||
    parsed.data.amt_refigure.net_disposition_gain_adjustment !== 0 ||
    parsed.data.amt_refigure.net_capital_gain_adjustment !== 0 ||
    parsed.data.amt_refigure.investment_expenses_adjustment !== 0 ||
    (parsed.data.amt_refigure.elected_capital_gain_portion ?? 0) !== 0 ||
    pending?.f1099div !== undefined || pending?.f1099oid !== undefined ||
    pending?.form1116 !== undefined ||
    Number(fields.line11_amt ?? 0) <= 0 ||
    fields.taking_standard_deduction !== false
  ) {
    throw new Error(
      "Form 6251 line 2c needs the bounded owner-owned Form 4952 loan, interest payer, and distinct reviewed 2024 AMT carryforward",
    );
  }
  reconcileForm4952PriorCarryforward(retainedRaw!, pending!, finalFilerTin);
  reconcileForm4952DirectDebtExport(retainedRaw!, pending!, finalFilerTin);
  reconcileForm4952InterestPath(retainedRaw!, pending!);
  const regular = calculateForm4952(parsed.data);
  const amt = calculateAmtForm4952(parsed.data).lines;
  const difference = regular.line8 - amt.line8;
  const interestTotal = interest.data.f1099ints.reduce(
    (total, payer) => total + (payer.box1 ?? 0) + (payer.box3 ?? 0),
    0,
  );
  if (
    difference === 0 || claimed !== difference ||
    fields.form4952_amt_line2c_difference !== difference ||
    retainedDifference !== difference ||
    fields.line2c_investment_interest !== difference ||
    fields.form4952_regular_election !== undefined &&
      fields.form4952_regular_election !== 0 ||
    fields.form4952_amt_election !== undefined &&
      fields.form4952_amt_election !== 0 ||
    scheduleA?.line_9_investment_interest !== regular.line8 ||
    form1040?.line12e_itemized_deductions === undefined ||
    Number(form1040.line12e_itemized_deductions) < regular.line8 ||
    form1040?.line2b_taxable_interest !== interestTotal ||
    schedule2?.line2_amt !== fields.line11_amt
  ) {
    throw new Error(
      "Form 6251 line 2c must equal regular Form 4952 line 8 less AMT line 8 and reconcile Schedule A, Schedule 2 and Form 1040",
    );
  }
}
