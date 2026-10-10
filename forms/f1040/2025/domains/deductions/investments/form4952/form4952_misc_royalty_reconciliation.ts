import { reconcileRoyaltyDebtReturn } from "./form4952_royalty_debt_reconciliation.ts";
import { z } from "zod";
import { type FilerIdentity, FilingStatus } from "../../../../../mef/header.ts";
import { inputSchema as miscSchema } from "../../../../../nodes/inputs/income/business/f1099m/index.ts";
import { inputSchema as interestSchema } from "../../../../../nodes/inputs/income/investments/f1099int/index.ts";
import { inputSchema as scheduleESchema } from "../../../../../nodes/inputs/income/rental-passthrough/schedule_e/index.ts";
import {
  calculateForm4952,
  inputSchema as form4952Schema,
} from "../../../../../nodes/intermediate/forms/deductions/investments/form4952/index.ts";
import { sourceAmountsMatch } from "./form4952_combined_reconciliation.ts";
import { reconcileForm4952Itemization } from "./form4952_itemization.ts";
import { verifyMiscRoyaltySource } from "../../../../mef/forms/income/rental-passthrough/schedule_e.ts";
import { plainInvestmentBox1Or3 } from "./form4952_interest_reconciliation.ts";

const scheduleASchema = z.object({
  line_9_investment_interest: z.number().nonnegative(),
});
const schedule1Schema = z.object({
  line5_schedule_e: z.number(),
  line9_total_other_income: z.number().optional(),
  line10_total_additional_income: z.number(),
});
const form1040Schema = z.object({
  line8_additional_income: z.number(),
  line2b_taxable_interest: z.number().nonnegative().optional(),
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
const permittedPropertyFields = new Set([
  "tsj",
  "property_description",
  "property_type",
  "activity_type",
  "fair_rental_days",
  "personal_use_days",
  "rent_income",
  "royalties_income",
  "form_1099_payments_made",
  "f1099m_royalty_source",
]);

/** One nonbusiness 1099-MISC royalty included once on Schedule E and line 4a. */
export function reconcileForm4952MiscRoyaltyPath(
  fields: Record<string, unknown>,
  pending: Readonly<Record<string, unknown>>,
  filer?: FilerIdentity,
): void {
  const retained = form4952Schema.safeParse(pending.form4952);
  if (
    fields.royalty_debt_trace !== undefined ||
    (retained.success && retained.data.royalty_debt_trace !== undefined)
  ) {
    reconcileRoyaltyDebtReturn(fields, pending, filer);
    return;
  }
  const misc = miscSchema.safeParse(pending.f1099m);
  const scheduleE = scheduleESchema.safeParse(pending.schedule_e);
  const schedule1 = schedule1Schema.safeParse(pending.schedule1);
  const scheduleA = scheduleASchema.safeParse(pending.schedule_a);
  const form1040 = form1040Schema.safeParse(pending.f1040);
  const form = form4952Schema.safeParse(fields);
  const interestSource = interestSchema.safeParse(pending.f1099int);
  if (
    !misc.success || !scheduleE.success || !schedule1.success ||
    !scheduleA.success || !form1040.success || !form.success
  ) {
    throw new Error(
      "Form 4952 royalty needs one 1099-MISC, its Schedule E property, Schedule 1, Schedule A, and finalized Form 1040",
    );
  }
  const items = misc.data.f1099ms;
  const rows = scheduleE.data.schedule_es;
  const source = items[0];
  const row = rows[0];
  const royalty = source?.box2_royalties ?? 0;
  const interestItems = interestSource.success
    ? interestSource.data.f1099ints
    : [];
  const interestAmounts = interestItems.map((item) =>
    (item.box1 ?? 0) + (item.box3 ?? 0)
  );
  const interest = interestAmounts.reduce((total, amount) => total + amount, 0);
  if (
    (pending.f1099int !== undefined &&
      (!interestSource.success || interestItems.length === 0 ||
        !interestItems.every((item) =>
          plainInvestmentBox1Or3(item) &&
          (item.box6 ?? 0) === 0 &&
          (item.foreign_source_interest_usd ?? 0) === 0 &&
          !item.box7?.trim() &&
          item.foreign_tax_irs_country_code === undefined &&
          !!item.recipient_tin &&
          (filer === undefined ||
            item.recipient_tin === filer.primarySSN.replaceAll("-", "") ||
            (filer.filingStatus === FilingStatus.MarriedFilingJointly &&
              item.recipient_tin ===
                filer.spouse?.ssn.replaceAll("-", "")))
        ) ||
        (interestItems.length > 1 &&
          (!interestItems.every((item) =>
            !!item.source_document_reference?.trim()
          ) ||
            new Set(interestItems.map((item) => item.source_document_reference))
                .size !== interestItems.length)))) ||
    pending.f1099oid !== undefined
  ) {
    throw new Error(
      "Form 4952 royalty and interest need owned, separately identified unadjusted 1099-INT investment payers",
    );
  }
  if (
    items.length !== 1 || rows.length !== 1 || !source || !row ||
    !row.f1099m_royalty_source || royalty <= 0 ||
    Object.keys(scheduleE.data).some((key) =>
      key !== "schedule_es" && key !== "royalty_income"
    ) ||
    scheduleE.data.royalty_income !== royalty ||
    Object.keys(row).some((key) => !permittedPropertyFields.has(key))
  ) {
    throw new Error(
      "Form 4952 royalty needs exactly one matched, expense-free Schedule E property",
    );
  }
  verifyMiscRoyaltySource(row, pending.f1099m, filer);
  if (
    !sourceAmountsMatch(form.data.source_1099_royalties, [royalty]) ||
    form.data
        .investment_interest_expense_excludes_royalty_attributable_interest !==
      true ||
    (form.data.investment_interest_expense ?? 0) <= 0 ||
    (form.data.prior_year_carryforward ?? 0) !== 0 ||
    (form.data.other_investment_property_gross_income ?? 0) !== 0 ||
    (form.data.other_investment_property_qualified_dividends ?? 0) !== 0 ||
    (form.data.other_investment_property_net_disposition_gain ?? 0) !== 0 ||
    (form.data.other_investment_property_net_capital_gain ?? 0) !== 0 ||
    (form.data.investment_income_election ?? 0) !== 0 ||
    (form.data.elected_capital_gain_portion ?? 0) !== 0 ||
    (form.data.investment_expenses ?? 0) !== 0 ||
    (interest > 0
      ? !sourceAmountsMatch(form.data.source_1099_interest, interestAmounts)
      : (form.data.source_1099_interest ?? 0) !== 0) ||
    (form.data.source_1099_dividends ?? 0) !== 0 ||
    (form.data.source_1099_qualified_dividends ?? 0) !== 0 ||
    (form.data.source_1099_capital_gain_distributions ?? 0) !== 0 ||
    (form.data.source_private_activity_bond_interest ?? 0) !== 0 ||
    (form.data.source_k1_interest ?? 0) !== 0 ||
    (form.data.source_k1_dividends ?? 0) !== 0 ||
    (form.data.source_k1_qualified_dividends ?? 0) !== 0 ||
    (form.data.source_k1_royalties ?? 0) !== 0 ||
    (form.data.source_k1_allowed_investment_expenses ?? 0) !== 0 ||
    (form.data.source_k1_investment_interest ?? 0) !== 0 ||
    (form.data.form8814_line9_qualified_dividends ?? 0) !== 0 ||
    (form.data.form8814_line10_capital_gain ?? 0) !== 0 ||
    (form.data.form8814_line12_investment_income ?? 0) !== 0 ||
    !form.data.amt_refigure ||
    Object.values(form.data.amt_refigure).some((amount) => amount !== 0)
  ) {
    throw new Error(
      "Form 4952 royalty path supports one sourced box 2, plain source-matched 1099-INT payers, and separately traced nonroyalty interest",
    );
  }
  const lines = calculateForm4952(form.data);
  if (
    lines.line1 <= 0 || lines.line8 <= 0 ||
    lines.line4a !== royalty + interest || lines.line4b !== 0 ||
    lines.line4d !== 0 || lines.line5 !== 0 ||
    numberedLines.some((line) => fields[line] !== lines[line])
  ) {
    throw new Error(
      "Form 4952 royalty numbered lines differ from the sourced box 2 amount",
    );
  }
  if (
    schedule1.data.line5_schedule_e !== royalty ||
    (schedule1.data.line9_total_other_income ?? 0) !== 0 ||
    schedule1.data.line10_total_additional_income !== royalty ||
    form1040.data.line8_additional_income !== royalty ||
    (form1040.data.line2b_taxable_interest ?? 0) !== interest ||
    scheduleA.data.line_9_investment_interest !== lines.line8 ||
    form1040.data.line12e_itemized_deductions < lines.line8
  ) {
    throw new Error(
      "Form 4952 royalty or interest differs from finalized Schedule E, Schedule A, and Form 1040",
    );
  }
  reconcileForm4952Itemization(pending, lines.line8);
}
