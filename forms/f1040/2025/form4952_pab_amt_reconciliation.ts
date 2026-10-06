import { inputSchema as interestSchema } from "../nodes/inputs/f1099int/index.ts";
import {
  calculateAmtForm4952,
  calculateForm4952,
  inputSchema as form4952Schema,
} from "../nodes/intermediate/forms/form4952/index.ts";
import { reconcileForm4952DirectDebtExport } from "./form4952_debt_reconciliation.ts";
import { reconcileForm4952Itemization } from "./form4952_itemization.ts";

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

/** One issued mixed-interest copy, one current paid loan and a zero-expense PAB review. */
export function reconcileForm4952PabAmt(
  fields: Readonly<Record<string, unknown>>,
  pending: Readonly<Record<string, unknown>>,
  finalFilerTin?: string,
): number {
  const parsed = form4952Schema.safeParse(fields);
  const issuer = interestSchema.safeParse(pending.f1099int);
  const form1040 = pending.f1040 as Record<string, unknown> | undefined;
  const scheduleA = pending.schedule_a as Record<string, unknown> | undefined;
  const form6251 = pending.form6251 as Record<string, unknown> | undefined;
  const schedule2 = pending.schedule2 as Record<string, unknown> | undefined;
  if (
    !parsed.success || !issuer.success || issuer.data.f1099ints.length !== 1 ||
    !form1040 || !scheduleA || !form6251 || !schedule2
  ) {
    throw new Error(
      "AMT Form 4952 needs the retained one-issuer loan and finalized return",
    );
  }
  const source = parsed.data;
  const payer = issuer.data.f1099ints[0];
  const workpaper = payer.pab_allocable_deduction_workpaper;
  const tin = String(form1040.taxpayer_ssn ?? "").replaceAll("-", "");
  const trace = source.direct_debt_trace;
  if (
    !trace || trace.owner_tin !== tin ||
    (finalFilerTin !== undefined &&
      finalFilerTin.replaceAll("-", "") !== tin) ||
    trace.asset_id === payer.pab_bond_identifier ||
    !trace.no_tax_exempt_or_passive_activity_asset ||
    source.prior_year_carryforward_source !== undefined ||
    (source.prior_year_carryforward ?? 0) !== 0 ||
    (source.investment_interest_expense ?? 0) <= 0 ||
    (source.investment_income_election ?? 0) !== 0 ||
    (source.elected_capital_gain_portion ?? 0) !== 0 ||
    (source.investment_expenses ?? 0) !== 0 ||
    !source.amt_refigure ||
    Object.values(source.amt_refigure).some((value) => value !== 0) ||
    payer.investment_property_for_form4952 !== true ||
    payer.recipient_tin !== tin ||
    !payer.payer_name.trim() || !/^[0-9]{9}$/.test(payer.payer_tin ?? "") ||
    !payer.account_number?.trim() || !payer.source_document_reference?.trim() ||
    payer.pab_eligible_bonds_reviewed !== true ||
    !payer.pab_bond_identifier?.trim() || !payer.pab_review_reference?.trim() ||
    !workpaper || workpaper.allocable_deduction !== 0 ||
    workpaper.direct_allocation_to_reported_bond !== true ||
    workpaper.deductible_if_interest_taxable !== true ||
    workpaper.not_claimed_elsewhere_on_return !== true ||
    new Set([
        payer.source_document_reference,
        payer.pab_review_reference,
        workpaper.reviewed_workpaper_reference,
        workpaper.expense_record_reference,
        trace.loan_agreement_reference,
        trace.disbursement_record_reference,
        trace.purchase_record_reference,
        trace.lender_statement_reference,
      ]).size !== 8 ||
    (payer.box1 ?? 0) <= 0 || (payer.box3 ?? 0) !== 0 ||
    (payer.box8 ?? 0) <= 0 || payer.box8 !== payer.box9 ||
    [
      payer.box2,
      payer.box4,
      payer.box5,
      payer.box6,
      payer.box10,
      payer.box11,
      payer.box12,
      payer.box13,
      payer.box17,
      payer.nominee_interest,
      payer.accrued_interest_paid,
      payer.non_taxable_oid_adjustment,
    ].some((amount) => (amount ?? 0) !== 0) ||
    [payer.box7, payer.box14, payer.box15, payer.box16]
      .some((value) => value !== undefined) ||
    payer.foreign_source_interest_usd !== undefined ||
    payer.foreign_tax_irs_country_code !== undefined ||
    payer.seller_financed === true ||
    pending.f1099div !== undefined || pending.f1099oid !== undefined ||
    pending.form1116 !== undefined ||
    source.source_1099_interest !== payer.box1 ||
    source.source_private_activity_bond_interest !== payer.box9 ||
    [
      source.source_1099_dividends,
      source.source_1099_royalties,
      source.source_1099_capital_gain_distributions,
      source.source_k1_interest,
      source.source_k1_dividends,
      source.source_k1_investment_interest,
      source.other_investment_property_gross_income,
    ].some((value) => value !== undefined && value !== 0)
  ) {
    throw new Error(
      "AMT Form 4952 PAB source needs one owned issued copy and distinct paid loan records",
    );
  }
  reconcileForm4952DirectDebtExport(fields, pending, finalFilerTin);
  const regular = calculateForm4952(source);
  const amt = calculateAmtForm4952(source).lines;
  const difference = regular.line8 - amt.line8;
  if (
    difference >= 0 || regular.line8 <= 0 || amt.line8 <= regular.line8 ||
    regular.line4a !== payer.box1 ||
    amt.line4a !== payer.box1 + payer.box9! ||
    numberedLines.some((line) => fields[line] !== regular[line]) ||
    scheduleA.line_9_investment_interest !== regular.line8 ||
    form1040.line12e_itemized_deductions !== regular.line8 ||
    form1040.line2a_tax_exempt !== payer.box8 ||
    form1040.line2b_taxable_interest !== payer.box1 ||
    form6251.line2c_investment_interest !== difference ||
    form6251.form4952_amt_line2c_difference !== difference ||
    form6251.line2g_pab_interest !== payer.box9 ||
    form6251.private_activity_bond_interest !== payer.box9 ||
    typeof form6251.line11_amt !== "number" || form6251.line11_amt <= 0 ||
    schedule2.line2_amt !== form6251.line11_amt ||
    form1040.line17_additional_taxes !== form6251.line11_amt
  ) {
    throw new Error(
      "AMT Form 4952 paid-source line 8 difference and Form 6251/1040 amounts disagree",
    );
  }
  reconcileForm4952Itemization(pending, regular.line8);
  return difference;
}
