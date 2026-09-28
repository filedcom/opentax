import { z } from "zod";
import { inputSchema as partnershipSchema } from "../nodes/inputs/k1_partnership/index.ts";
import {
  computeExpenses,
  inputSchema as scheduleESchema,
} from "../nodes/inputs/schedule_e/index.ts";
import {
  calculateForm4952,
  inputSchema as form4952Schema,
} from "../nodes/intermediate/forms/form4952/index.ts";
import { sourceAmountsMatch } from "./form4952_combined_reconciliation.ts";
import { reconcileForm4952Itemization } from "./form4952_itemization.ts";

const schedule1Schema = z.object({
  line5_schedule_e: z.number(),
  line9_total_other_income: z.number(),
});
const scheduleASchema = z.object({
  line_9_investment_interest: z.number().nonnegative(),
});
const form1040Schema = z.object({
  line2b_taxable_interest: z.number().nonnegative().optional(),
  line8_additional_income: z.number(),
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
  "investment_property_for_form4952",
  "box5_interest",
  "box7_royalties",
  "box7_royalty_reporting",
  "box13_code_h_investment_interest",
  "box13_code_i_royalty_deduction",
  "box20_code_b_investment_expenses",
]);
const permittedRoyaltyFields = new Set([
  "tsj",
  "property_description",
  "property_type",
  "activity_type",
  "fair_rental_days",
  "personal_use_days",
  "rent_income",
  "royalties_income",
  "form_1099_payments_made",
  "k1_royalty_source",
  "expense_other_lines",
]);

/** One issuer-crosswalked K-1 code B expense already deducted on Schedule E. */
export function reconcileForm4952K1CodeBRoyaltyPath(
  fields: Record<string, unknown>,
  pending: Readonly<Record<string, unknown>>,
): void {
  const partnership = partnershipSchema.safeParse(pending.k1_partnership);
  const scheduleE = scheduleESchema.safeParse(pending.schedule_e);
  const schedule1 = schedule1Schema.safeParse(pending.schedule1);
  const scheduleA = scheduleASchema.safeParse(pending.schedule_a);
  const form1040 = form1040Schema.safeParse(pending.f1040);
  const form = form4952Schema.safeParse(fields);
  if (
    !partnership.success || !scheduleE.success || !schedule1.success ||
    !scheduleA.success || !form1040.success || !form.success
  ) {
    throw new Error(
      "Form 4952 K-1 code B needs one K-1, filed Schedule E royalty row, finalized Schedule 1, Schedule A, and Form 1040",
    );
  }
  const k1s = partnership.data.k1_partnerships;
  const rows = scheduleE.data.schedule_es;
  const k1 = k1s[0];
  const row = rows[0];
  const codeB = k1?.box20_code_b_investment_expenses;
  const codeI = k1?.box13_code_i_royalty_deduction;
  const royalty = k1?.box7_royalty_reporting;
  const source = row?.k1_royalty_source;
  const expense = codeB?.allowed_deduction_amount ?? 0;
  const gross = k1?.box7_royalties ?? 0;
  const interest = k1?.box13_code_h_investment_interest ?? 0;
  const box5 = k1?.box5_interest ?? 0;
  if (
    k1s.length !== 1 || rows.length !== 1 || !k1 || !row || !codeB ||
    !codeI || !royalty || !source || !k1.partnership_ein ||
    !k1.source_document_reference ||
    k1.investment_property_for_form4952 !== true ||
    gross <= 0 || interest <= 0 || expense <= 0 ||
    codeI.reported_amount !== codeB.reported_amount ||
    codeI.allowed_amount !== expense ||
    codeI.expense_kind !== codeB.allowed_deduction_kind ||
    codeI.allowed_amount > gross ||
    codeB.issuer_crosswalk.issuer_reported_amount !== codeB.reported_amount ||
    codeB.issuer_crosswalk.box13_code_i_statement_reference !==
      codeI.statement_reference ||
    codeB.issuer_crosswalk.royalty_property_description !==
      royalty.property_description ||
    Object.keys(k1).some((key) => !permittedPartnershipFields.has(key)) ||
    Object.keys(scheduleE.data).some((key) => key !== "schedule_es") ||
    Object.keys(row).some((key) => !permittedRoyaltyFields.has(key)) ||
    row.property_type !== 6 || row.activity_type !== "D" ||
    row.tsj !== royalty.tsj ||
    row.property_description !== royalty.property_description ||
    row.form_1099_payments_made !== false ||
    row.rent_income !== 0 || row.royalties_income !== gross ||
    row.fair_rental_days !== 0 || row.personal_use_days !== 0 ||
    computeExpenses(row) !== expense ||
    row.expense_other_lines?.length !== 1 ||
    row.expense_other_lines[0].description !==
      "From Schedule K-1 (Form 1065)" ||
    row.expense_other_lines[0].amount !== expense ||
    source.partnership_ein !== k1.partnership_ein ||
    source.source_document_reference !== k1.source_document_reference ||
    source.box7_gross_royalties !== gross ||
    source.box13_code_i_allowed_deduction !== expense ||
    source.box13_code_i_statement_reference !== codeI.statement_reference
  ) {
    throw new Error(
      "Form 4952 code B must identify the same allowed code I expense deducted once on its K-1 Schedule E royalty row",
    );
  }
  if (
    !sourceAmountsMatch(form.data.source_k1_royalties, [gross]) ||
    !sourceAmountsMatch(form.data.source_k1_allowed_investment_expenses, [
      expense,
    ]) ||
    !sourceAmountsMatch(form.data.source_k1_investment_interest, [interest]) ||
    (box5 > 0
      ? !sourceAmountsMatch(form.data.source_k1_interest, [box5])
      : form.data.source_k1_interest !== undefined) ||
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
    (form.data.source_1099_royalties ?? 0) !== 0 ||
    (form.data.source_1099_dividends ?? 0) !== 0 ||
    (form.data.source_1099_qualified_dividends ?? 0) !== 0 ||
    (form.data.source_1099_capital_gain_distributions ?? 0) !== 0 ||
    (form.data.source_private_activity_bond_interest ?? 0) !== 0 ||
    (form.data.source_k1_dividends ?? 0) !== 0 ||
    (form.data.source_k1_qualified_dividends ?? 0) !== 0 ||
    (form.data.form8814_line9_qualified_dividends ?? 0) !== 0 ||
    (form.data.form8814_line10_capital_gain ?? 0) !== 0 ||
    (form.data.form8814_line12_investment_income ?? 0) !== 0 ||
    form.data
        .investment_interest_expense_excludes_royalty_attributable_interest !==
      true ||
    !form.data.amt_refigure ||
    Object.values(form.data.amt_refigure).some((amount) => amount !== 0)
  ) {
    throw new Error(
      "Form 4952 code B route supports only the identified K-1 royalty, code I deduction, and code H interest",
    );
  }
  const lines = calculateForm4952(form.data);
  const netRoyalty = gross - expense;
  if (
    lines.line1 !== interest || lines.line2 !== 0 ||
    lines.line4a !== gross + box5 || lines.line4b !== 0 ||
    lines.line4d !== 0 || lines.line5 !== expense || lines.line8 <= 0 ||
    numberedLines.some((line) => fields[line] !== lines[line])
  ) {
    throw new Error(
      "Form 4952 code B numbered lines differ from the sourced K-1 amounts",
    );
  }
  if (
    schedule1.data.line5_schedule_e !== netRoyalty ||
    schedule1.data.line9_total_other_income !== netRoyalty ||
    form1040.data.line8_additional_income !== netRoyalty ||
    (form1040.data.line2b_taxable_interest ?? 0) !== box5 ||
    scheduleA.data.line_9_investment_interest !== lines.line8 ||
    form1040.data.line12e_itemized_deductions < lines.line8
  ) {
    throw new Error(
      "Form 4952 code B royalty income or interest deduction differs from finalized Schedule 1, Schedule A, and Form 1040",
    );
  }
  reconcileForm4952Itemization(pending, lines.line8);
}
