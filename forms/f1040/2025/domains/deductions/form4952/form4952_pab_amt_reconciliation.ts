import { inputSchema as interestSchema } from "../../../../nodes/inputs/f1099int/index.ts";
import {
  reconcilePabPaidExpense,
} from "../../../../nodes/inputs/pab_allocable_deduction.ts";
import {
  calculateAmtForm4952,
  calculateForm4952,
  inputSchema as form4952Schema,
} from "../../../../nodes/intermediate/forms/form4952/index.ts";
import { reconcileForm4952DirectDebtTrace } from "../../../../nodes/intermediate/forms/form4952/debt_trace.ts";
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

function sameAmounts(actual: unknown, expected: number[]): boolean {
  if (expected.length === 0) return actual === undefined || actual === 0;
  if (expected.length === 1 && actual === expected[0]) return true;
  return Array.isArray(actual) && actual.length === expected.length &&
    actual.every((amount, index) => amount === expected[index]);
}

/** Replay every issued PAB copy and its classified paid expense against AMT Form 4952. */
export function reconcileForm4952PabAmt(
  fields: Readonly<Record<string, unknown>>,
  pending: Readonly<Record<string, unknown>>,
  finalFilerTin?: string,
): number {
  const printed = form4952Schema.safeParse(fields);
  const retained = form4952Schema.safeParse(pending.form4952);
  const issuer = interestSchema.safeParse(pending.f1099int);
  const form1040 = pending.f1040 as Record<string, unknown> | undefined;
  const scheduleA = pending.schedule_a as Record<string, unknown> | undefined;
  const form6251 = pending.form6251 as Record<string, unknown> | undefined;
  const schedule2 = pending.schedule2 as Record<string, unknown> | undefined;
  if (
    !printed.success || !retained.success || !issuer.success ||
    issuer.data.f1099ints.length === 0 || !form1040 || !scheduleA ||
    !form6251 || !schedule2
  ) {
    throw new Error(
      "AMT Form 4952 needs its retained issued-copy inventory and finalized return",
    );
  }
  const source = retained.data;
  const claimed = printed.data;
  const tin = String(form1040.taxpayer_ssn ?? "").replaceAll("-", "");
  const trace = source.direct_debt_trace;
  if (
    !trace || !claimed.direct_debt_trace ||
    JSON.stringify(claimed.direct_debt_trace) !== JSON.stringify(trace) ||
    trace.owner_tin !== tin ||
    (finalFilerTin !== undefined &&
      finalFilerTin.replaceAll("-", "") !== tin) ||
    source.prior_year_carryforward_source !== undefined ||
    (source.prior_year_carryforward ?? 0) !== 0 ||
    (source.investment_interest_expense ?? 0) <= 0 ||
    (source.investment_income_election ?? 0) !== 0 ||
    (source.elected_capital_gain_portion ?? 0) !== 0 ||
    (source.investment_expenses ?? 0) !== 0 ||
    !source.amt_refigure ||
    Object.values(source.amt_refigure).some((value) => value !== 0) ||
    pending.f1099div !== undefined || pending.f1099oid !== undefined ||
    pending.form1116 !== undefined
  ) {
    throw new Error(
      "AMT Form 4952 needs its one paid taxable loan and current-year source",
    );
  }
  reconcileForm4952DirectDebtTrace(trace, source, tin);
  const references = new Set<string>([
    trace.loan_agreement_reference,
    trace.disbursement_record_reference,
    trace.purchase_record_reference,
    trace.lender_statement_reference,
    ...trace.interest_payments.map((row) => row.payment_record_reference),
  ]);
  const loanIds = new Set<string>([trace.loan_id]);
  const taxableAmounts: number[] = [];
  const pabAmounts: number[] = [];
  const debtExpenses: number[] = [];
  let taxableTotal = 0;
  let exemptTotal = 0;
  let netPabTotal = 0;
  for (const item of issuer.data.f1099ints) {
    const paper = item.pab_allocable_deduction_workpaper;
    const box1 = item.box1 ?? 0;
    const box8 = item.box8 ?? 0;
    const box9 = item.box9 ?? 0;
    const expense = paper?.allocable_deduction ?? 0;
    if (
      item.recipient_tin !== tin ||
      !item.payer_name.trim() || !/^[0-9]{9}$/.test(item.payer_tin ?? "") ||
      !item.account_number?.trim() || !item.source_document_reference?.trim() ||
      box1 + box8 <= 0 || box9 > box8 || expense > box9 ||
      (item.box3 ?? 0) !== 0 || (item.box13 ?? 0) !== 0 ||
      [
        item.box2,
        item.box4,
        item.box5,
        item.box6,
        item.box10,
        item.box11,
        item.box12,
        item.box17,
        item.nominee_interest,
        item.accrued_interest_paid,
        item.non_taxable_oid_adjustment,
      ]
        .some((amount) => (amount ?? 0) !== 0) ||
      [item.box7, item.box14, item.box15, item.box16]
        .some((value) => value !== undefined) ||
      item.foreign_source_interest_usd !== undefined ||
      item.foreign_tax_irs_country_code !== undefined ||
      item.seller_financed === true ||
      (box9 > 0 &&
        (item.investment_property_for_form4952 !== true ||
          item.pab_eligible_bonds_reviewed !== true ||
          !item.pab_bond_identifier?.trim() ||
          !item.pab_review_reference?.trim() || !paper ||
          !paper.direct_allocation_to_reported_bond ||
          !paper.deductible_if_interest_taxable ||
          !paper.not_claimed_elsewhere_on_return)) ||
      (box9 === 0 && (paper !== undefined ||
        item.pab_review_reference !== undefined ||
        item.pab_bond_identifier !== undefined))
    ) {
      throw new Error(
        "AMT Form 4952 issuer amounts, bond eligibility or owner disagree",
      );
    }
    const itemReferences = [item.source_document_reference];
    if (box9 > 0) {
      itemReferences.push(
        item.pab_review_reference!,
        paper!.reviewed_workpaper_reference,
        paper!.expense_record_reference,
      );
      if (trace.asset_id === item.pab_bond_identifier) {
        throw new Error(
          "Taxable loan purchase must be distinct from PAB bonds",
        );
      }
      reconcilePabPaidExpense(paper!, item.pab_bond_identifier!, tin);
      const bondDebt = paper!.bond_debt_trace;
      if (bondDebt) {
        if (loanIds.has(bondDebt.loan_id)) {
          throw new Error("PAB and taxable purchases need distinct loans");
        }
        loanIds.add(bondDebt.loan_id);
        itemReferences.push(
          bondDebt.loan_agreement_reference,
          bondDebt.disbursement_record_reference,
          bondDebt.purchase_record_reference,
          ...bondDebt.interest_payments.map((row) =>
            row.payment_record_reference
          ),
        );
        debtExpenses.push(expense);
      }
      pabAmounts.push(box9);
      netPabTotal += box9 - expense;
    }
    for (const reference of itemReferences) {
      if (references.has(reference)) {
        throw new Error(
          "AMT Form 4952 repeats a copy, expense or loan reference",
        );
      }
      references.add(reference);
    }
    if (box1 > 0 && item.investment_property_for_form4952 === true) {
      taxableAmounts.push(box1);
    }
    taxableTotal += box1;
    exemptTotal += box8;
  }
  if (
    pabAmounts.length === 0 ||
    !sameAmounts(source.source_1099_interest, taxableAmounts) ||
    !sameAmounts(source.source_private_activity_bond_interest, pabAmounts) ||
    !sameAmounts(source.source_pab_bond_debt_interest, debtExpenses) ||
    !sameAmounts(claimed.source_1099_interest, taxableAmounts) ||
    !sameAmounts(claimed.source_private_activity_bond_interest, pabAmounts) ||
    !sameAmounts(claimed.source_pab_bond_debt_interest, debtExpenses) ||
    [
      source.source_1099_dividends,
      source.source_1099_royalties,
      source.source_1099_capital_gain_distributions,
      source.source_k1_interest,
      source.source_k1_dividends,
      source.source_k1_investment_interest,
      source.other_investment_property_gross_income,
    ]
      .some((value) => value !== undefined && value !== 0)
  ) {
    throw new Error(
      "AMT Form 4952 per-copy taxable, PAB or expense sources disagree",
    );
  }
  const regular = calculateForm4952(source);
  const amt = calculateAmtForm4952(source).lines;
  const difference = regular.line8 - amt.line8;
  if (
    difference >= 0 || regular.line8 <= 0 || amt.line8 <= regular.line8 ||
    numberedLines.some((line) => fields[line] !== regular[line]) ||
    scheduleA.line_9_investment_interest !== regular.line8 ||
    form1040.line12e_itemized_deductions !== regular.line8 ||
    form1040.line2a_tax_exempt !== exemptTotal ||
    form1040.line2b_taxable_interest !== taxableTotal ||
    form6251.line2c_investment_interest !== difference ||
    form6251.form4952_amt_line2c_difference !== difference ||
    form6251.line2g_pab_interest !== netPabTotal ||
    form6251.private_activity_bond_interest !== netPabTotal ||
    typeof form6251.line11_amt !== "number" || form6251.line11_amt <= 0 ||
    schedule2.line2_amt !== form6251.line11_amt ||
    form1040.line17_additional_taxes !== form6251.line11_amt
  ) {
    throw new Error(
      "AMT Form 4952 source line8 difference and Form6251/1040 amounts disagree",
    );
  }
  reconcileForm4952Itemization(pending, regular.line8);
  return difference;
}
