import { z } from "zod";
import { TaxNode, type NodeResult } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// F1040 Output Node — Final Assembly
//
// Sink node: collects all computed values and assembles the complete
// Form 1040 return. No downstream outputs.
//
// Lines reference: Form 1040 (2025)

// ─── Schema ───────────────────────────────────────────────────────────────────

const inputSchema = z.object({
  // ── Part I — Income ───────────────────────────────────────────────────────
  // Line 1a — Wages (W-2 Box 1, regular employees)
  line1a_wages: z.number().optional(),
  // Line 1b — Household employee wages
  line1b_household_wages: z.number().nonnegative().optional(),
  // Line 1c — Unreported tips (Form 4137)
  line1c_unreported_tips: z.number().nonnegative().optional(),
  // Line 1d — Medicaid waiver payments (not excludable)
  line1d_medicaid_waiver: z.number().nonnegative().optional(),
  // Line 1e — Taxable dependent care benefits (Form 2441)
  line1e_taxable_dep_care: z.number().nonnegative().optional(),
  // Line 1f — Employer adoption benefits (Form 8839)
  line1f_taxable_adoption_benefits: z.number().nonnegative().optional(),
  // Line 1g — Wages from Form 8919 (uncollected SS/Medicare)
  line1g_wages_8919: z.number().nonnegative().optional(),
  // Line 1h — Other earned income
  line1h_other_earned: z.number().optional(),
  // Line 1i — Combat pay election
  line1i_combat_pay: z.number().nonnegative().optional(),
  // Line 1z — Total wages (sum of 1a–1h)
  line1z_total_wages: z.number().optional(),
  // Line 2a — Tax-exempt interest
  line2a_tax_exempt: z.number().nonnegative().optional(),
  // Line 2b — Taxable interest
  line2b_taxable_interest: z.number().optional(),
  // Line 3a — Qualified dividends
  line3a_qualified_dividends: z.number().nonnegative().optional(),
  // Line 3b — Ordinary dividends
  line3b_ordinary_dividends: z.number().optional(),
  // Line 4a — IRA distributions, gross
  line4a_ira_gross: z.number().nonnegative().optional(),
  // Line 4b — IRA distributions, taxable amount
  line4b_ira_taxable: z.number().optional(),
  // Line 5a — Pensions and annuities, gross
  line5a_pension_gross: z.number().nonnegative().optional(),
  // Line 5b — Pensions and annuities, taxable amount
  line5b_pension_taxable: z.number().optional(),
  // Line 6a — Social security benefits, gross
  line6a_ss_gross: z.number().nonnegative().optional(),
  // Line 6b — Social security benefits, taxable amount
  line6b_ss_taxable: z.number().nonnegative().optional(),
  // Line 7 — Capital gain or (loss) (Schedule D)
  line7_capital_gain: z.number().optional(),
  // Line 7a — Capital gain distributions (no Schedule D required)
  line7a_cap_gain_distrib: z.number().nonnegative().optional(),
  // Line 8 — Additional income from Schedule 1 Part I
  line8_additional_income: z.number().optional(),
  // Line 9 — Total income (sum of lines 1z–8)
  line9_total_income: z.number().optional(),
  // Line 10 — Adjustments from Schedule 1 Part II
  line10_adjustments: z.number().nonnegative().optional(),
  // Line 11 — Adjusted gross income (line 9 - line 10)
  line11_agi: z.number().nonnegative().optional(),
  // Line 12a — Standard deduction
  line12a_standard_deduction: z.number().nonnegative().optional(),
  // Line 12b — Charitable contributions (if standard deduction)
  line12b_charitable: z.number().nonnegative().optional(),
  // Line 12c — Sum of 12a + 12b
  line12c_deduction_total: z.number().nonnegative().optional(),
  // Line 12e — Itemized deductions (Schedule A)
  line12e_itemized_deductions: z.number().optional(),
  // Line 13 — QBI deduction (Form 8995 / 8995-A)
  line13_qbi_deduction: z.number().nonnegative().optional(),
  // Line 14 — Sum of 12c (or 12e) + 13
  line14_deductions_qbi_total: z.number().nonnegative().optional(),
  // Line 15 — Taxable income (line 11 - line 14)
  line15_taxable_income: z.number().nonnegative().optional(),
  // ── Part II — Tax and Credits ─────────────────────────────────────────────
  // Line 16 — Income tax (from tax tables / worksheets)
  line16_income_tax: z.number().nonnegative().optional(),
  // Line 17 — AMT (Form 6251) via Schedule 2 line 1
  line17_additional_taxes: z.number().nonnegative().optional(),
  // Line 18 — Total tax before credits (16 + 17)
  line18_total_tax_before_credits: z.number().nonnegative().optional(),
  // Line 19 — Child tax credit / credit for other dependents (Form 8812)
  line19_child_tax_credit: z.number().nonnegative().optional(),
  // Line 20 — Nonrefundable credits from Schedule 3 Part I
  line20_nonrefundable_credits: z.number().nonnegative().optional(),
  // Line 21 — Sum of 19 + 20
  line21_credits_total: z.number().nonnegative().optional(),
  // Line 22 — Tax after credits (18 - 21)
  line22_tax_after_credits: z.number().nonnegative().optional(),
  // Line 23 — Other taxes from Schedule 2 Part II
  line23_other_taxes: z.number().nonnegative().optional(),
  // Line 24 — Total tax (22 + 23)
  line24_total_tax: z.number().nonnegative().optional(),
  // ── Part III — Payments ───────────────────────────────────────────────────
  // Line 25a — Federal income tax withheld (W-2 Box 2)
  line25a_w2_withheld: z.number().nonnegative().optional(),
  // Line 25b — Federal tax withheld (1099 forms)
  line25b_withheld_1099: z.number().nonnegative().optional(),
  // Line 25c — Additional Medicare Tax withheld (Form 8959 line 24)
  line25c_additional_medicare_withheld: z.number().nonnegative().optional(),
  // Line 26 — 2025 estimated tax payments
  line26_estimated_tax: z.number().nonnegative().optional(),
  // Line 27 — Earned Income Credit (EITC)
  line27_eitc: z.number().nonnegative().optional(),
  // Line 28 — Additional Child Tax Credit (Form 8812)
  line28_actc: z.number().nonnegative().optional(),
  // Line 29 — American Opportunity Credit, refundable portion (Form 8863)
  line29_refundable_aoc: z.number().nonnegative().optional(),
  // Line 30 — Refundable adoption credit (Form 8839)
  line30_refundable_adoption: z.number().nonnegative().optional(),
  // Line 31 — Additional payments from Schedule 3 Part II
  line31_additional_payments: z.number().nonnegative().optional(),
  // Line 32 — Total other payments (sum of 27–31)
  line32_refundable_credits_total: z.number().nonnegative().optional(),
  // Line 33 — Sum of 25d + 26 + 32
  line33_total_payments: z.number().nonnegative().optional(),
  // Line 34 — Refund amount owed to taxpayer (33 - 24)
  line34_total_payments: z.number().nonnegative().optional(),
  // Line 35a — Amount of refund
  line35a_refund: z.number().nonnegative().optional(),
  // Line 37 — Amount owed (24 - 33)
  line37_amount_owed: z.number().nonnegative().optional(),
  // Line 38 — Estimated tax penalty (Form 2210) / amount paid with extension
  line38_amount_paid_extension: z.number().nonnegative().optional(),
  line38_underpayment_penalty: z.number().nonnegative().optional(),
});

type F1040Input = z.infer<typeof inputSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function totalWages(input: F1040Input): number {
  return (
    (input.line1a_wages ?? 0) +
    (input.line1b_household_wages ?? 0) +
    (input.line1c_unreported_tips ?? 0) +
    (input.line1d_medicaid_waiver ?? 0) +
    (input.line1e_taxable_dep_care ?? 0) +
    (input.line1f_taxable_adoption_benefits ?? 0) +
    (input.line1g_wages_8919 ?? 0) +
    (input.line1h_other_earned ?? 0)
  );
}

function totalIncome(input: F1040Input): number {
  // Prefer explicit line9 if provided; otherwise compute from component lines
  if (input.line9_total_income !== undefined) return input.line9_total_income;
  const wages = input.line1z_total_wages ?? totalWages(input);
  return (
    wages +
    (input.line2b_taxable_interest ?? 0) +
    (input.line3b_ordinary_dividends ?? 0) +
    (input.line4b_ira_taxable ?? 0) +
    (input.line5b_pension_taxable ?? 0) +
    (input.line6b_ss_taxable ?? 0) +
    (input.line7_capital_gain ?? 0) +
    (input.line7a_cap_gain_distrib ?? 0) +
    (input.line8_additional_income ?? 0)
  );
}

function deductionAmount(input: F1040Input): number {
  // Itemized deductions take precedence if provided
  if (input.line12e_itemized_deductions !== undefined) return input.line12e_itemized_deductions;
  return input.line12a_standard_deduction ?? 0;
}

function taxableIncome(input: F1040Input): number {
  if (input.line15_taxable_income !== undefined) return input.line15_taxable_income;
  const agi = input.line11_agi ?? 0;
  const deduction = deductionAmount(input);
  const qbi = input.line13_qbi_deduction ?? 0;
  return Math.max(0, agi - deduction - qbi);
}

function totalTaxBeforeCredits(input: F1040Input): number {
  return (input.line16_income_tax ?? 0) + (input.line17_additional_taxes ?? 0);
}

function creditsTotal(input: F1040Input): number {
  return (input.line19_child_tax_credit ?? 0) + (input.line20_nonrefundable_credits ?? 0);
}

function taxAfterCredits(input: F1040Input): number {
  const beforeCredits = totalTaxBeforeCredits(input);
  const credits = creditsTotal(input);
  return Math.max(0, beforeCredits - credits);
}

function totalTax(input: F1040Input): number {
  return taxAfterCredits(input) + (input.line23_other_taxes ?? 0);
}

function totalWithholding(input: F1040Input): number {
  return (
    (input.line25a_w2_withheld ?? 0) +
    (input.line25b_withheld_1099 ?? 0) +
    (input.line25c_additional_medicare_withheld ?? 0)
  );
}

function refundableCreditsTotal(input: F1040Input): number {
  return (
    (input.line27_eitc ?? 0) +
    (input.line28_actc ?? 0) +
    (input.line29_refundable_aoc ?? 0) +
    (input.line30_refundable_adoption ?? 0) +
    (input.line31_additional_payments ?? 0)
  );
}

function totalPayments(input: F1040Input): number {
  return (
    totalWithholding(input) +
    (input.line26_estimated_tax ?? 0) +
    refundableCreditsTotal(input)
  );
}

function assembleReturn(input: F1040Input): Record<string, number> {
  const computed_line1z = input.line1z_total_wages ?? totalWages(input);
  const computed_line9 = totalIncome(input);
  const computed_line11 = input.line11_agi ?? Math.max(0, computed_line9 - (input.line10_adjustments ?? 0));
  const computed_line15 = taxableIncome(input);
  const computed_line18 = totalTaxBeforeCredits(input);
  const computed_line21 = creditsTotal(input);
  const computed_line22 = Math.max(0, computed_line18 - computed_line21);
  const computed_line24 = computed_line22 + (input.line23_other_taxes ?? 0);
  const computed_line33 = totalPayments(input);
  const balance = computed_line33 - computed_line24;

  const result: Record<string, number> = {
    line1z_total_wages: computed_line1z,
    line9_total_income: computed_line9,
    line11_agi: computed_line11,
    line15_taxable_income: computed_line15,
    line18_total_tax_before_credits: computed_line18,
    line21_credits_total: computed_line21,
    line22_tax_after_credits: computed_line22,
    line24_total_tax: computed_line24,
    line33_total_payments: computed_line33,
  };

  // Conditionally include optional pass-through fields
  if (input.line1a_wages !== undefined) result.line1a_wages = input.line1a_wages;
  if (input.line2a_tax_exempt !== undefined) result.line2a_tax_exempt = input.line2a_tax_exempt;
  if (input.line2b_taxable_interest !== undefined) result.line2b_taxable_interest = input.line2b_taxable_interest;
  if (input.line3a_qualified_dividends !== undefined) result.line3a_qualified_dividends = input.line3a_qualified_dividends;
  if (input.line3b_ordinary_dividends !== undefined) result.line3b_ordinary_dividends = input.line3b_ordinary_dividends;
  if (input.line4a_ira_gross !== undefined) result.line4a_ira_gross = input.line4a_ira_gross;
  if (input.line4b_ira_taxable !== undefined) result.line4b_ira_taxable = input.line4b_ira_taxable;
  if (input.line5a_pension_gross !== undefined) result.line5a_pension_gross = input.line5a_pension_gross;
  if (input.line5b_pension_taxable !== undefined) result.line5b_pension_taxable = input.line5b_pension_taxable;
  if (input.line6a_ss_gross !== undefined) result.line6a_ss_gross = input.line6a_ss_gross;
  if (input.line6b_ss_taxable !== undefined) result.line6b_ss_taxable = input.line6b_ss_taxable;
  if (input.line7_capital_gain !== undefined) result.line7_capital_gain = input.line7_capital_gain;
  if (input.line12a_standard_deduction !== undefined) result.line12a_standard_deduction = input.line12a_standard_deduction;
  if (input.line12e_itemized_deductions !== undefined) result.line12e_itemized_deductions = input.line12e_itemized_deductions;
  if (input.line13_qbi_deduction !== undefined) result.line13_qbi_deduction = input.line13_qbi_deduction;
  if (input.line16_income_tax !== undefined) result.line16_income_tax = input.line16_income_tax;
  if (input.line17_additional_taxes !== undefined) result.line17_additional_taxes = input.line17_additional_taxes;
  if (input.line19_child_tax_credit !== undefined) result.line19_child_tax_credit = input.line19_child_tax_credit;
  if (input.line27_eitc !== undefined) result.line27_eitc = input.line27_eitc;
  if (input.line28_actc !== undefined) result.line28_actc = input.line28_actc;
  if (input.line29_refundable_aoc !== undefined) result.line29_refundable_aoc = input.line29_refundable_aoc;
  if (input.line25a_w2_withheld !== undefined) result.line25a_w2_withheld = input.line25a_w2_withheld;
  if (input.line25b_withheld_1099 !== undefined) result.line25b_withheld_1099 = input.line25b_withheld_1099;

  if (balance >= 0) {
    result.line35a_refund = balance;
  } else {
    result.line37_amount_owed = Math.abs(balance);
  }

  return result;
}

// ─── Node class ───────────────────────────────────────────────────────────────

class F1040Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f1040";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, rawInput: F1040Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    const assembled = assembleReturn(input);
    return { outputs: [{ nodeType: this.nodeType, fields: assembled }] };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const f1040 = new F1040Node();
