import { z } from "zod";
import {
  type NodeResult,
  TaxNode,
} from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { computeRegularMethodPenalty } from "../../inputs/f2210/calculation.ts";
import {
  calculateForm2210FBoxB,
  type Form2210FBoxBInput,
  form2210FBoxBInputSchema,
  type Form2210FBoxBLines,
} from "../../../2025/form2210f_box_b.ts";
import {
  calculateForm3800Nonpassive,
  deriveForm3800NonpassiveInput,
  type Form3800NonpassiveInput,
  type Form3800NonpassiveLines,
  type Form3800PassiveActivityLines,
  form3800PassiveActivityLinesSchema,
} from "../../inputs/f3800/calculation.ts";
import {
  calculateForm8912IndividualLimit,
  deriveForm8912IndividualLimitInput,
  type Form8912IndividualLimitLines,
} from "../../inputs/f8912/calculation.ts";
import {
  calculateForm8396,
  form8396SourceSchema,
} from "../../intermediate/forms/form8396/calculation.ts";
import { FilingStatus } from "../../types.ts";
import {
  calculateForm8880,
  inputSchema as form8880SourceSchema,
} from "../../intermediate/forms/form8880/calculation.ts";

// Fields that may arrive from multiple upstream nodes accumulate as arrays in the
// executor pending dict. Declaring them accumulable prevents Zod parse failure.
const accumulable = <T extends z.ZodTypeAny>(schema: T) =>
  z.union([schema, z.array(schema)]);

function sumField(value: number | number[] | undefined): number {
  if (value === undefined) return 0;
  if (Array.isArray(value)) return value.reduce((s, n) => s + n, 0);
  return value;
}

// F1040 Output Node — Final Assembly
//
// Sink node: collects all computed values and assembles the complete
// Form 1040 return. No downstream outputs.
//
// Lines reference: Form 1040 (2025)

// ─── Schema ───────────────────────────────────────────────────────────────────

const inputSchema = z.object({
  filing_status: z.nativeEnum(FilingStatus).optional(),
  spouse_has_business_credit: z.boolean().optional(),
  // ── Part I — Income ───────────────────────────────────────────────────────
  // Line 1a — Wages (accumulable: w2, fec, f4852, f1099r and qsehra all route here)
  line1a_wages: accumulable(z.number()).optional(),
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
  // Line 3a — Qualified dividends (accumulable: k1_partnership + f1099div both route here)
  line3a_qualified_dividends: accumulable(z.number().nonnegative()).optional(),
  // Line 3b — Ordinary dividends (accumulable: direct 1099-DIV and Schedule B)
  line3b_ordinary_dividends: accumulable(z.number()).optional(),
  // Line 4a — IRA distributions, gross
  line4a_ira_gross: z.number().nonnegative().optional(),
  // Line 4b — IRA distributions, taxable amount
  line4b_ira_taxable: z.number().optional(),
  // Line 5a — Pensions and annuities, gross
  line5a_pension_gross: z.number().nonnegative().optional(),
  // Line 5b — Pensions and annuities, taxable amount
  line5b_pension_taxable: z.number().optional(),
  // Line 5c(1) — payer-reported pension/plan direct rollover
  line5c_pension_rollover: z.boolean().optional(),
  line5b_form4972_ordinary: z.number().nonnegative().optional(),
  // Line 6a — Social security benefits, gross
  line6a_ss_gross: z.number().nonnegative().optional(),
  // Line 6b — Social security benefits, taxable amount
  line6b_ss_taxable: z.number().nonnegative().optional(),
  mfs_spouse_lived_with_taxpayer: z.boolean().optional(),
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
  line11_agi: z.number().optional(),
  // Form 8839 line 7 adds back the actual filed Form 2555 line 45.
  form8839_form2555_line45: z.number().finite().nonnegative().optional(),
  form8839_form2555_line50: z.number().finite().nonnegative().optional(),
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
  // Line 13b — Additional deductions from Schedule 1-A
  line13b_additional_deductions: z.number().nonnegative().optional(),
  schedule1a_line37_senior_deduction: z.number().nonnegative().optional(),
  // Line 14 — Sum of 12c (or 12e) + 13
  line14_deductions_qbi_total: z.number().nonnegative().optional(),
  // Line 15 — Taxable income (line 11 - line 14)
  line15_taxable_income: z.number().nonnegative().optional(),
  // ── Part II — Tax and Credits ─────────────────────────────────────────────
  // Line 16 — Income tax (from tax tables / worksheets)
  line16_income_tax: z.number().nonnegative().optional(),
  form4972_tax: z.number().nonnegative().optional(),
  form8978_tax: z.number().nonnegative().optional(),
  form8621_tax: z.number().nonnegative().optional(),
  // Line 17 — AMT (Form 6251) via Schedule 2 line 1
  line17_additional_taxes: z.number().nonnegative().optional(),
  // Line 18 — Total tax before credits (16 + 17)
  line18_total_tax_before_credits: z.number().nonnegative().optional(),
  // Line 19 — Child tax credit / credit for other dependents (Form 8812)
  line19_child_tax_credit: z.number().nonnegative().optional(),
  // Line 20 — Nonrefundable credits from Schedule 3 Part I
  line20_nonrefundable_credits: z.number().nonnegative().optional(),
  form8880_source: form8880SourceSchema.optional(),
  // Tentative Form 8936 amounts are finalized here after line 18 is known.
  form8936_tentative_new_credit: z.number().nonnegative().optional(),
  form8936_tentative_used_credit: z.number().nonnegative().optional(),
  form8936_priority_personal_credits: z.number().nonnegative().optional(),
  form8936_schedule3_line7_tentative: z.number().nonnegative().optional(),
  // Form 8912 income reaches AGI, but positive credit is not filed until its
  // separate tax limit and source document are finalized.
  form8912_source_lines: z.object({
    line1: z.number().finite().nonnegative(),
    line2: z.number().finite().nonnegative(),
    line3: z.number().finite().nonnegative(),
    line4: z.number().finite().nonnegative(),
    hasPassThroughCrebCredit: z.boolean(),
  }).optional(),
  form8859_source_carryforward: z.number().finite().nonnegative().optional(),
  form8859_worksheet_b_applies: z.boolean().optional(),
  form8859_worksheet_b_line14: z.number().finite().nonnegative().optional(),
  form8834_source_credit: z.number().finite().nonnegative().optional(),
  form8396_source: form8396SourceSchema.optional(),
  form3800_source_credits: z.object({
    standardCredit: z.number().finite().nonnegative(),
    specifiedCredit: z.number().finite().nonnegative(),
    passiveLines: form3800PassiveActivityLinesSchema,
  }).optional(),
  credit_limit_form6251_line9: z.number().finite().nonnegative().optional(),
  credit_limit_form6251_line11: z.number().finite().nonnegative().optional(),
  credit_limit_schedule2_line1z: z.number().finite().nonnegative().optional(),
  form1116_line18_worldwide_taxable_income: z.number().finite().nonnegative()
    .optional(),
  form1116_line18_preferential_adjustment: z.number().int().nonnegative()
    .optional(),
  form1116_line20_us_tax: z.number().finite().nonnegative().optional(),
  credit_limit_schedule3_lines: z.object({
    line1: z.number().finite().nonnegative(),
    line2: z.number().finite().nonnegative(),
    line3: z.number().finite().nonnegative(),
    line4: z.number().finite().nonnegative(),
    line5a: z.number().finite().nonnegative(),
    line5b: z.number().finite().nonnegative(),
    line6aGbc: z.number().finite().nonnegative(),
    line6bPriorMinimumTax: z.number().finite().nonnegative(),
    line6cAdoption: z.number().finite().nonnegative().optional(),
    line6dElderlyDisabled: z.number().finite().nonnegative().optional(),
    line6fCleanVehicle: z.number().finite().nonnegative().optional(),
    line6gMortgage: z.number().finite().nonnegative().optional(),
    line6hHomebuyer: z.number().finite().nonnegative().optional(),
    line6iElectricVehicle: z.number().finite().nonnegative().optional(),
    line6jRefueling: z.number().finite().nonnegative().optional(),
    line6kBondCredit: z.number().finite().nonnegative(),
    line6lForm8978: z.number().finite().nonnegative().optional(),
    line6mUsedCleanVehicle: z.number().finite().nonnegative().optional(),
    line7: z.number().finite().nonnegative(),
  }).optional(),
  // Line 21 — Sum of 19 + 20
  line21_credits_total: z.number().nonnegative().optional(),
  // Line 22 — Tax after credits (18 - 21)
  line22_tax_after_credits: z.number().nonnegative().optional(),
  // Line 23 — Other taxes from Schedule 2 Part II
  line23_other_taxes: z.number().nonnegative().optional(),
  taxpayer_can_be_claimed_as_dependent: z.boolean().optional(),
  form8978_schedule2_line17z_reduction: z.number().int().nonnegative()
    .optional(),
  // Line 24 — Total tax (22 + 23)
  line24_total_tax: z.number().nonnegative().optional(),
  // ── Part III — Payments ───────────────────────────────────────────────────
  // Line 25a — Federal income tax withheld (W-2 Box 2)
  line25a_w2_withheld: z.number().nonnegative().optional(),
  // Line 25b — Federal tax withheld (1099 forms) (accumulable: multiple 1099s route here)
  line25b_withheld_1099: accumulable(z.number().nonnegative()).optional(),
  // Line 25c — Additional Medicare Tax withheld (Form 8959 line 24)
  line25c_additional_medicare_withheld: z.number().nonnegative().optional(),
  // Line 25c — other federal income tax withheld, including Form 8805.
  line25c_other_withheld: accumulable(z.number().nonnegative()).optional(),
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
  // Line 34 — Overpayment (line 33 - line 24, when positive)
  line34_overpayment: z.number().nonnegative().optional(),
  // Line 35a — Amount of refund
  line35a_refund: z.number().nonnegative().optional(),
  // Line 37 — Amount owed (24 - 33)
  line37_amount_owed: z.number().nonnegative().optional(),
  // Line 38 — Estimated tax penalty (Form 2210) / amount paid with extension
  line38_amount_paid_extension: z.number().nonnegative().optional(),
  line38_underpayment_penalty: z.number().nonnegative().optional(),
  f2210f_box_b_source: form2210FBoxBInputSchema.optional(),
  // Form 2210 regular-method inputs are carried here so the final return can
  // use its computed tax and withholding without creating a graph cycle.
  f2210_active: z.boolean().optional(),
  f2210_required_annual_payment: z.number().nonnegative().optional(),
  f2210_withholding: z.number().nonnegative().optional(),
  f2210_q1_estimated_payment: z.number().nonnegative().optional(),
  f2210_q2_estimated_payment: z.number().nonnegative().optional(),
  f2210_q3_estimated_payment: z.number().nonnegative().optional(),
  f2210_q4_estimated_payment: z.number().nonnegative().optional(),
  f2210_prior_year_tax: z.number().nonnegative().optional(),
  f2210_prior_year_agi: z.number().nonnegative().optional(),
});

type F1040Input = z.infer<typeof inputSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function totalWages(input: F1040Input): number {
  return (
    sumField(input.line1a_wages as number | number[] | undefined) +
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
    sumField(input.line3b_ordinary_dividends) +
    (input.line4b_ira_taxable ?? 0) +
    (input.line5b_pension_taxable ?? 0) +
    (input.line5b_form4972_ordinary ?? 0) +
    (input.line6b_ss_taxable ?? 0) +
    (input.line7_capital_gain ?? 0) +
    (input.line7a_cap_gain_distrib ?? 0) +
    (input.line8_additional_income ?? 0)
  );
}

function deductionAmount(input: F1040Input): number {
  // The standard-deduction node only emits line 12a when it selected that
  // deduction. Schedule A can still emit a positive line 12e for comparison.
  if (input.line12a_standard_deduction !== undefined) {
    return input.line12a_standard_deduction;
  }
  if ((input.line12e_itemized_deductions ?? 0) > 0) {
    return input.line12e_itemized_deductions!;
  }
  return input.line12a_standard_deduction ?? 0;
}

function taxableIncome(input: F1040Input): number {
  if (input.line15_taxable_income !== undefined) {
    return input.line15_taxable_income;
  }
  const agi = input.line11_agi ?? 0;
  const deduction = deductionAmount(input);
  const qbi = input.line13_qbi_deduction ?? 0;
  const additionalDeductions = input.line13b_additional_deductions ?? 0;
  return Math.max(0, agi - deduction - qbi - additionalDeductions);
}

function totalTaxBeforeCredits(input: F1040Input): number {
  return (input.line16_income_tax ?? 0) + (input.line17_additional_taxes ?? 0);
}

function creditsTotal(input: F1040Input, schedule3Credits: number): number {
  return (input.line19_child_tax_credit ?? 0) +
    schedule3Credits;
}

type CleanVehicleAllowance = {
  readonly newCredit: number;
  readonly usedCredit: number;
  readonly schedule3Credits: number;
  readonly schedule3Line7: number;
};

type QualifiedElectricAllowance = {
  readonly line1: number;
  readonly line2: number;
  readonly line3a: number;
  readonly line3b: number;
  readonly line3c: number;
  readonly line4: number;
  readonly line5: number;
  readonly line6: number;
  readonly line7: number;
  readonly schedule3Line7: number;
  readonly schedule3Credits: number;
};

function qualifiedElectricAllowance(
  input: F1040Input,
): QualifiedElectricAllowance | undefined {
  const line1 = input.form8834_source_credit;
  if (line1 === undefined || line1 <= 0) return undefined;
  const schedule3 = input.credit_limit_schedule3_lines;
  if (
    input.line16_income_tax === undefined ||
    input.credit_limit_form6251_line9 === undefined ||
    schedule3 === undefined
  ) {
    throw new Error(
      "Form 8834 needs finalized Form 1040 tax, Form 6251 tentative minimum tax, and Schedule 3 credits",
    );
  }
  if (
    (input.form8859_source_carryforward ?? 0) > 0 ||
    (input.form8936_tentative_new_credit ?? 0) > 0 ||
    (input.form8936_tentative_used_credit ?? 0) > 0
  ) {
    throw new Error(
      "Form 8834 combined with Form 8859 or Form 8936 needs a joint credit-ordering calculation",
    );
  }
  if ((schedule3.line6iElectricVehicle ?? 0) > 0) {
    throw new Error(
      "Form 8834 source cannot combine with prefilled Schedule 3 line 6i",
    );
  }
  const line2 = input.line16_income_tax +
    (input.credit_limit_schedule2_line1z ?? 0);
  const line3a = schedule3.line1;
  const excludedFromLine7 = schedule3.line6aGbc +
    schedule3.line6bPriorMinimumTax +
    (schedule3.line6jRefueling ?? 0) + schedule3.line6kBondCredit;
  const otherLine7 = schedule3.line7 - excludedFromLine7;
  if (otherLine7 < -0.000001) {
    throw new Error(
      "Form 8834 Schedule 3 line 7 is smaller than excluded credits",
    );
  }
  const line3b = (input.line19_child_tax_credit ?? 0) +
    schedule3.line2 + schedule3.line3 + schedule3.line4 +
    schedule3.line5a + schedule3.line5b + Math.max(0, otherLine7);
  const line3c = line3a + line3b;
  const line4 = Math.max(0, line2 - line3c);
  const line5 = input.credit_limit_form6251_line9;
  const line6 = Math.max(0, line4 - line5);
  const line7 = Math.min(line1, line6);
  return {
    line1,
    line2,
    line3a,
    line3b,
    line3c,
    line4,
    line5,
    line6,
    line7,
    schedule3Line7: schedule3.line7 + line7,
    schedule3Credits: (input.line20_nonrefundable_credits ?? 0) + line7,
  };
}

type HomebuyerAllowance = {
  readonly worksheetLine1: number;
  readonly worksheetLine2: number;
  readonly line1: number;
  readonly line2: number;
  readonly line3: number;
  readonly line4: number;
  readonly schedule3Line7: number;
  readonly schedule3Credits: number;
};

type MortgageAllowance = {
  readonly lines: ReturnType<typeof calculateForm8396>;
  readonly worksheetLine1: number;
  readonly worksheetLine2: number;
  readonly schedule3Line7: number;
  readonly schedule3Credits: number;
};

function mortgageAllowance(
  input: F1040Input,
  cleanVehicles: CleanVehicleAllowance | undefined,
): MortgageAllowance | undefined {
  const source = input.form8396_source;
  if (!source) return undefined;
  const schedule3 = input.credit_limit_schedule3_lines;
  if (input.line16_income_tax === undefined || !schedule3) {
    throw new Error(
      "Form 8396 needs finalized Form 1040 tax and Schedule 3 credit lines",
    );
  }
  if ((schedule3.line6gMortgage ?? 0) > 0) {
    throw new Error(
      "Form 8396 source cannot combine with prefilled Schedule 3 line 6g",
    );
  }
  const worksheetB = input.form8859_worksheet_b_applies === true;
  if (worksheetB && input.form8859_worksheet_b_line14 === undefined) {
    throw new Error(
      "Form 8396 needs Schedule 8812 Credit Limit Worksheet B line 14",
    );
  }
  const childCredit = worksheetB
    ? input.form8859_worksheet_b_line14 ?? 0
    : input.line19_child_tax_credit ?? 0;
  const worksheetLine1 = Math.round(totalTaxBeforeCredits(input));
  const worksheetLine2 = Math.round(
    childCredit + schedule3.line1 + schedule3.line2 + schedule3.line3 +
      schedule3.line4 + (schedule3.line6dElderlyDisabled ?? 0) +
      (cleanVehicles?.newCredit ?? schedule3.line6fCleanVehicle ?? 0) +
      (schedule3.line6lForm8978 ?? 0) +
      (cleanVehicles?.usedCredit ?? schedule3.line6mUsedCleanVehicle ?? 0) +
      schedule3.line5b,
  );
  const lines = calculateForm8396(
    source,
    Math.max(0, worksheetLine1 - worksheetLine2),
  );
  const priorLine7 = cleanVehicles?.schedule3Line7 ?? schedule3.line7;
  const priorCredits = cleanVehicles?.schedule3Credits ??
    (input.line20_nonrefundable_credits ?? 0);
  return {
    lines,
    worksheetLine1,
    worksheetLine2,
    schedule3Line7: priorLine7 + lines.line9,
    schedule3Credits: priorCredits + lines.line9,
  };
}

function homebuyerAllowance(
  input: F1040Input,
  cleanVehicles: CleanVehicleAllowance | undefined,
  mortgage: MortgageAllowance | undefined,
): HomebuyerAllowance | undefined {
  const line1 = input.form8859_source_carryforward;
  if (line1 === undefined || line1 <= 0) return undefined;
  const schedule3 = input.credit_limit_schedule3_lines;
  if (input.line16_income_tax === undefined || schedule3 === undefined) {
    throw new Error(
      "Form 8859 needs finalized Form 1040 tax and Schedule 3 credit lines",
    );
  }
  if ((schedule3.line6hHomebuyer ?? 0) > 0) {
    throw new Error(
      "Form 8859 source cannot combine with prefilled Schedule 3 line 6h",
    );
  }
  const worksheetB = input.form8859_worksheet_b_applies === true;
  if (worksheetB && input.form8859_worksheet_b_line14 === undefined) {
    throw new Error(
      "Form 8859 needs Schedule 8812 Credit Limit Worksheet B line 14",
    );
  }
  const childCredit = worksheetB
    ? input.form8859_worksheet_b_line14 ?? 0
    : input.line19_child_tax_credit ?? 0;
  const precedingCredits = schedule3.line1 + schedule3.line2 +
    schedule3.line3 + schedule3.line4 + schedule3.line5b +
    (schedule3.line6cAdoption ?? 0) +
    (schedule3.line6dElderlyDisabled ?? 0) +
    (cleanVehicles?.newCredit ?? schedule3.line6fCleanVehicle ?? 0) +
    (mortgage?.lines.line9 ?? schedule3.line6gMortgage ?? 0) +
    (schedule3.line6lForm8978 ?? 0) +
    (cleanVehicles?.usedCredit ?? schedule3.line6mUsedCleanVehicle ?? 0) +
    childCredit;
  const worksheetLine1 = totalTaxBeforeCredits(input);
  const line2 = Math.max(0, worksheetLine1 - precedingCredits);
  const line3 = Math.min(line1, line2);
  const previousCredits = mortgage?.schedule3Credits ??
    cleanVehicles?.schedule3Credits ??
    (input.line20_nonrefundable_credits ?? 0);
  const previousLine7 = mortgage?.schedule3Line7 ??
    cleanVehicles?.schedule3Line7 ?? schedule3.line7;
  return {
    worksheetLine1,
    worksheetLine2: precedingCredits,
    line1,
    line2,
    line3,
    line4: line1 - line3,
    schedule3Line7: previousLine7 + line3,
    schedule3Credits: previousCredits + line3,
  };
}

type BusinessCreditAllowance = {
  readonly tax: Form3800NonpassiveInput;
  readonly passiveLines: Form3800PassiveActivityLines;
  readonly lines: Form3800NonpassiveLines;
  readonly schedule3Line7: number;
  readonly schedule3Credits: number;
};

type BondCreditAllowance = {
  readonly lines: Form8912IndividualLimitLines;
  readonly schedule3Line7: number;
  readonly schedule3Credits: number;
};

function cleanVehicleAllowance(
  input: F1040Input,
): CleanVehicleAllowance | undefined {
  const tentativeNew = input.form8936_tentative_new_credit ?? 0;
  const tentativeUsed = input.form8936_tentative_used_credit ?? 0;
  if (tentativeNew === 0 && tentativeUsed === 0) return undefined;
  const line18 = totalTaxBeforeCredits(input);
  const priority = input.form8936_priority_personal_credits;
  const tentativeLine7 = input.form8936_schedule3_line7_tentative;
  if (priority === undefined || tentativeLine7 === undefined) {
    throw new Error("Form 8936 needs Schedule 3 credit-priority totals");
  }
  const usedCredit = Math.min(tentativeUsed, Math.max(0, line18 - priority));
  const newCredit = Math.min(
    tentativeNew,
    Math.max(0, line18 - priority - usedCredit),
  );
  const reduction = tentativeNew + tentativeUsed - newCredit - usedCredit;
  const schedule3Credits = (input.line20_nonrefundable_credits ?? 0) -
    reduction;
  const schedule3Line7 = tentativeLine7 - reduction;
  if (schedule3Credits < -0.000001 || schedule3Line7 < -0.000001) {
    throw new Error("Form 8936 tentative credits exceed Schedule 3 totals");
  }
  return {
    newCredit,
    usedCredit,
    schedule3Credits: Math.max(0, schedule3Credits),
    schedule3Line7: Math.max(0, schedule3Line7),
  };
}

function businessCreditAllowance(
  input: F1040Input,
  cleanVehicles: CleanVehicleAllowance | undefined,
  mortgage: MortgageAllowance | undefined,
  homebuyer: HomebuyerAllowance | undefined,
  electric: QualifiedElectricAllowance | undefined,
): BusinessCreditAllowance | undefined {
  const credits = input.form3800_source_credits;
  if (!credits) return undefined;
  if (
    credits.standardCredit + credits.specifiedCredit +
          credits.passiveLines.line2 + credits.passiveLines.line23 +
          credits.passiveLines.line32 <= 0 ||
    input.filing_status === undefined ||
    input.line16_income_tax === undefined ||
    input.credit_limit_form6251_line9 === undefined ||
    input.credit_limit_form6251_line11 === undefined ||
    input.credit_limit_schedule3_lines === undefined
  ) {
    throw new Error(
      "Form 3800 source credit needs filing status, Form 1040 tax, Form 6251, and Schedule 3 return lines",
    );
  }
  const schedule3 = input.credit_limit_schedule3_lines;
  if (schedule3.line6aGbc > 0) {
    throw new Error(
      "Form 3800 source credit cannot combine with unbounded Schedule 3 general business credits",
    );
  }
  const schedule3Line7 = homebuyer?.schedule3Line7 ??
    mortgage?.schedule3Line7 ?? cleanVehicles?.schedule3Line7 ??
    electric?.schedule3Line7 ??
    schedule3.line7;
  const tax = deriveForm3800NonpassiveInput({
    filingStatus: input.filing_status,
    spouseHasBusinessCredit: input.spouse_has_business_credit,
    form1040Line16: input.line16_income_tax ?? 0,
    schedule2Line1z: input.credit_limit_schedule2_line1z ?? 0,
    educationCreditRecaptureTaxIncludedInLine7Sources: 0,
    form8621TaxIncludedInLine7Sources: input.form8621_tax ?? 0,
    deferred965TaxIncludedInLine7Sources: 0,
    triggering965TaxIncludedInLine7Sources: 0,
    form6251Line11: input.credit_limit_form6251_line11,
    form6251Line9: input.credit_limit_form6251_line9,
    form1040Line19: input.line19_child_tax_credit ?? 0,
    schedule3Line1: schedule3.line1,
    schedule3Line2: schedule3.line2,
    schedule3Line3: schedule3.line3,
    schedule3Line4: schedule3.line4,
    schedule3Line5a: schedule3.line5a,
    schedule3Line5b: schedule3.line5b,
    schedule3Line7,
    schedule3Line6aGbc: schedule3.line6aGbc,
    schedule3Line6bPriorMinimumTax: schedule3.line6bPriorMinimumTax,
    form8912CreditInSchedule3Line7: schedule3.line6kBondCredit,
  }, credits);
  const lines = calculateForm3800Nonpassive(
    tax,
    credits.passiveLines,
  );
  const originalSchedule3Credits = homebuyer?.schedule3Credits ??
    mortgage?.schedule3Credits ?? cleanVehicles?.schedule3Credits ??
    electric?.schedule3Credits ??
    (input.line20_nonrefundable_credits ?? 0);
  return {
    tax,
    passiveLines: credits.passiveLines,
    lines,
    schedule3Line7: schedule3Line7 + lines.line38,
    schedule3Credits: originalSchedule3Credits + lines.line38,
  };
}

function bondCreditAllowance(
  input: F1040Input,
  cleanVehicles: CleanVehicleAllowance | undefined,
  mortgage: MortgageAllowance | undefined,
  homebuyer: HomebuyerAllowance | undefined,
  electric: QualifiedElectricAllowance | undefined,
  businessCredit: BusinessCreditAllowance | undefined,
): BondCreditAllowance | undefined {
  const source = input.form8912_source_lines;
  if (!source || source.line4 <= 0) return undefined;
  const schedule3 = input.credit_limit_schedule3_lines;
  if (
    input.line16_income_tax === undefined ||
    input.credit_limit_form6251_line11 === undefined ||
    schedule3 === undefined
  ) {
    throw new Error(
      "Form 8912 needs finalized Form 1040 tax, Form 6251 AMT, and Schedule 3 credits",
    );
  }
  if (schedule3.line6kBondCredit > 0) {
    throw new Error(
      "Form 8912 source credit cannot combine with prefilled Schedule 3 line 6k",
    );
  }
  if (schedule3.line6aGbc > 0 && !businessCredit) {
    throw new Error("Form 8912 needs source-backed allowed Form 3800 credit");
  }
  const priorSchedule3Credits = businessCredit?.schedule3Credits ??
    homebuyer?.schedule3Credits ?? mortgage?.schedule3Credits ??
    electric?.schedule3Credits ??
    cleanVehicles?.schedule3Credits ??
    (input.line20_nonrefundable_credits ?? 0);
  const priorSchedule3Line7 = businessCredit?.schedule3Line7 ??
    homebuyer?.schedule3Line7 ?? mortgage?.schedule3Line7 ??
    electric?.schedule3Line7 ??
    cleanVehicles?.schedule3Line7 ?? schedule3.line7;
  const allowedBusinessCredit = businessCredit?.lines.line38 ?? 0;
  const lines = calculateForm8912IndividualLimit(
    deriveForm8912IndividualLimitInput(source, {
      form1040Line16: input.line16_income_tax,
      form1040Line19: input.line19_child_tax_credit ?? 0,
      schedule2Line1z: input.credit_limit_schedule2_line1z ?? 0,
      form6251Line11: input.credit_limit_form6251_line11,
      schedule3Line1: schedule3.line1,
      schedule3Line6a: allowedBusinessCredit,
      schedule3Line6b: schedule3.line6bPriorMinimumTax,
      schedule3Line6k: 0,
      schedule3Line8: priorSchedule3Credits,
      form3800AllowedCredit: allowedBusinessCredit,
    }),
  );
  return {
    lines,
    schedule3Line7: priorSchedule3Line7 + lines.line12,
    schedule3Credits: priorSchedule3Credits + lines.line12,
  };
}

function totalWithholding(input: F1040Input): number {
  return (
    (input.line25a_w2_withheld ?? 0) +
    sumField(input.line25b_withheld_1099 as number | number[] | undefined) +
    (input.line25c_additional_medicare_withheld ?? 0) +
    sumField(input.line25c_other_withheld)
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

function reconciledForm2210FBoxB(
  input: F1040Input,
  line22: number,
  line23: number,
  line25d: number,
  line32: number,
): Form2210FBoxBLines | undefined {
  const source: Form2210FBoxBInput | undefined = input.f2210f_box_b_source;
  if (source === undefined) return undefined;
  if (input.filing_status !== FilingStatus.MFJ) {
    throw new Error(
      "Form 2210-F box B needs the finalized joint Form 1040 filing status",
    );
  }
  if (
    input.f2210_active === true ||
    input.line38_underpayment_penalty !== undefined
  ) {
    throw new Error(
      "Form 2210 and Form 2210-F cannot both set Form 1040 line 38",
    );
  }
  if (
    line23 !== 0 || (input.line23_other_taxes ?? 0) !== 0 ||
    (input.form8978_schedule2_line17z_reduction ?? 0) !== 0 ||
    source.current_included_schedule2_taxes !== 0 ||
    line32 !== 0 ||
    source.current_line4_refundable_credits_excluding_schedule3_line11 !== 0 ||
    (input.line26_estimated_tax ?? 0) !== 0 ||
    source.estimated_payments_by_2026_01_15 !== 0 ||
    source.current_excess_social_security_or_rrta_withholding !== 0
  ) {
    throw new Error(
      "Form 2210-F box B public route currently needs no Schedule 2 other tax, refundable credit, estimated payment, or excess Social Security withholding",
    );
  }
  if (
    source.current_line22_tax_after_credits !== Math.round(line22) ||
    source.current_withholding !== Math.round(line25d)
  ) {
    throw new Error(
      "Form 2210-F current tax or withholding does not match the finalized Form 1040",
    );
  }
  const lines = calculateForm2210FBoxB(source);
  if (lines.line10 === 0) {
    throw new Error(
      "Form 2210-F public box B route excludes the no-2024-tax-liability exception",
    );
  }
  return lines;
}

function assembleReturn(
  input: F1040Input,
  cleanVehicles: CleanVehicleAllowance | undefined,
  mortgage: MortgageAllowance | undefined,
  homebuyer: HomebuyerAllowance | undefined,
  electric: QualifiedElectricAllowance | undefined,
  businessCredit: BusinessCreditAllowance | undefined,
  bondCredit: BondCreditAllowance | undefined,
): Record<string, number> {
  const computed_line1z = input.line1z_total_wages ?? totalWages(input);
  const computed_line9 = totalIncome(input);
  const computed_line10 = input.line10_adjustments ?? 0;
  const computed_line11 = input.line11_agi ?? computed_line9 - computed_line10;
  const computed_line14 = (deductionAmount(input)) +
    (input.line13_qbi_deduction ?? 0) +
    (input.line13b_additional_deductions ?? 0);
  const computed_line15 = taxableIncome(input);
  const computed_line18 = totalTaxBeforeCredits(input);
  const computed_line20 = bondCredit?.schedule3Credits ??
    businessCredit?.schedule3Credits ??
    homebuyer?.schedule3Credits ??
    mortgage?.schedule3Credits ?? cleanVehicles?.schedule3Credits ??
    electric?.schedule3Credits ??
    (input.line20_nonrefundable_credits ?? 0);
  const computed_line21 = creditsTotal(input, computed_line20);
  const computed_line22 = Math.max(0, computed_line18 - computed_line21);
  const computed_line23 = (input.line23_other_taxes ?? 0) -
    (input.form8978_schedule2_line17z_reduction ?? 0);
  if (computed_line23 < -0.000001) {
    throw new Error(
      "Form 8978 reduction exceeds Form 1040 line 23 other taxes",
    );
  }
  const computed_line24 = computed_line22 + computed_line23;
  const computed_line25d = totalWithholding(input);
  const computed_line25c = (input.line25c_additional_medicare_withheld ?? 0) +
    sumField(input.line25c_other_withheld);
  const computed_line32 = refundableCreditsTotal(input);
  const computed_line33 = totalPayments(input);
  const form2210f = reconciledForm2210FBoxB(
    input,
    computed_line22,
    computed_line23,
    computed_line25d,
    computed_line32,
  );
  const computed_line38 = form2210f?.line16 ??
    input.line38_underpayment_penalty ??
    (input.f2210_active === true
      ? computeRegularMethodPenalty({
        current_year_tax: computed_line24,
        required_annual_payment: input.f2210_required_annual_payment,
        withholding: input.f2210_withholding ?? computed_line25d,
        q1_estimated_payment: input.f2210_q1_estimated_payment,
        q2_estimated_payment: input.f2210_q2_estimated_payment,
        q3_estimated_payment: input.f2210_q3_estimated_payment,
        q4_estimated_payment: input.f2210_q4_estimated_payment,
        prior_year_tax: input.f2210_prior_year_tax,
        prior_year_agi: input.f2210_prior_year_agi,
      })
      : 0);
  // Lines 34/37 are the difference of two *filed* (whole-dollar) lines, so they
  // must be computed from the rounded operands. Rounding the cents-level
  // difference instead can disagree by $1 with the printed line 24 − line 33
  // (e.g. 26,357.62 − 25,751.28: rounded-operand result 607 vs naive 606),
  // which fails IRS arithmetic cross-checks on the filed return.
  const balance = Math.round(computed_line33) - Math.round(computed_line24);

  const result: Record<string, number> = {
    line1z_total_wages: computed_line1z,
    line9_total_income: computed_line9,
    line11_agi: computed_line11,
    line15_taxable_income: computed_line15,
    line18_total_tax_before_credits: computed_line18,
    line21_credits_total: computed_line21,
    line22_tax_after_credits: computed_line22,
    line24_total_tax: computed_line24,
    line25d_total_withholding: computed_line25d,
    line33_total_payments: computed_line33,
  };

  // Emit computed subtotals — always include these aggregates regardless of value
  result.line10_adjustments = computed_line10;
  result.line12c_deduction_total = deductionAmount(input);
  result.line14_deductions_qbi_total = computed_line14;
  result.line32_refundable_credits_total = computed_line32;
  if (
    input.form8880_source !== undefined ||
    cleanVehicles !== undefined || homebuyer !== undefined ||
    mortgage !== undefined ||
    electric !== undefined ||
    businessCredit !== undefined ||
    bondCredit !== undefined
  ) {
    result.line20_nonrefundable_credits = computed_line20;
  }
  if (computed_line25c > 0) result.line25c_total = computed_line25c;
  if ((input.form8978_schedule2_line17z_reduction ?? 0) > 0) {
    // The finalized return line replaces the unadjusted Schedule 2 deposit.
    result.line23_other_taxes = Math.max(0, computed_line23);
  }

  // line20_nonrefundable_credits and the unadjusted line23_other_taxes are
  // deposited by upstream nodes before this node runs. Only re-emit line 23
  // when the Form 8978 worksheet changes its filed value; otherwise the
  // executor would merge-accumulate the same amount twice.
  // They are used above for line21/line22/line24 computation — no re-emission needed.
  if (input.line26_estimated_tax !== undefined) {
    result.line26_estimated_tax = input.line26_estimated_tax;
  }
  if (input.line30_refundable_adoption !== undefined) {
    result.line30_refundable_adoption = input.line30_refundable_adoption;
  }
  if (input.line31_additional_payments !== undefined) {
    result.line31_additional_payments = input.line31_additional_payments;
  }

  // Conditionally include optional pass-through fields
  // Wage lines are already in f1040 pending. Re-emitting them here would turn
  // each value into an array when the executor merges this node's own output.
  if (input.line2a_tax_exempt !== undefined) {
    result.line2a_tax_exempt = input.line2a_tax_exempt;
  }
  if (input.line2b_taxable_interest !== undefined) {
    result.line2b_taxable_interest = input.line2b_taxable_interest;
  }
  const line3a = sumField(
    input.line3a_qualified_dividends as number | number[] | undefined,
  );
  if (line3a > 0) result.line3a_qualified_dividends = line3a;
  const line3b = sumField(input.line3b_ordinary_dividends);
  if (line3b > 0) result.line3b_ordinary_dividends = line3b;
  if (input.line4a_ira_gross !== undefined) {
    result.line4a_ira_gross = input.line4a_ira_gross;
  }
  if (input.line4b_ira_taxable !== undefined) {
    result.line4b_ira_taxable = input.line4b_ira_taxable;
  }
  const form4972Ordinary = input.line5b_form4972_ordinary ?? 0;
  if (input.line5a_pension_gross !== undefined || form4972Ordinary > 0) {
    result.line5a_pension_gross = (input.line5a_pension_gross ?? 0) +
      form4972Ordinary;
  }
  if (input.line5b_pension_taxable !== undefined || form4972Ordinary > 0) {
    result.line5b_pension_taxable = (input.line5b_pension_taxable ?? 0) +
      form4972Ordinary;
  }
  if (input.line6a_ss_gross !== undefined) {
    result.line6a_ss_gross = input.line6a_ss_gross;
  }
  if (input.line6b_ss_taxable !== undefined) {
    result.line6b_ss_taxable = input.line6b_ss_taxable;
  }
  if (input.line7_capital_gain !== undefined) {
    result.line7_capital_gain = input.line7_capital_gain;
  }
  if (input.line7a_cap_gain_distrib !== undefined) {
    result.line7a_cap_gain_distrib = input.line7a_cap_gain_distrib;
  }
  if (input.line12a_standard_deduction !== undefined) {
    result.line12a_standard_deduction = input.line12a_standard_deduction;
  }
  if (input.line12e_itemized_deductions !== undefined) {
    result.line12e_itemized_deductions = input.line12e_itemized_deductions;
  }
  if (input.line13_qbi_deduction !== undefined) {
    result.line13_qbi_deduction = input.line13_qbi_deduction;
  }
  if (input.line16_income_tax !== undefined) {
    result.line16_income_tax = input.line16_income_tax;
  }
  if (input.form4972_tax !== undefined) {
    result.form4972_tax = input.form4972_tax;
  }
  if (input.form8978_tax !== undefined) {
    result.form8978_tax = input.form8978_tax;
  }
  if (input.line17_additional_taxes !== undefined) {
    result.line17_additional_taxes = input.line17_additional_taxes;
  }
  if (input.line19_child_tax_credit !== undefined) {
    result.line19_child_tax_credit = input.line19_child_tax_credit;
  }
  if (input.line25a_w2_withheld !== undefined) {
    result.line25a_w2_withheld = input.line25a_w2_withheld;
  }
  const line25b = sumField(
    input.line25b_withheld_1099 as number | number[] | undefined,
  );
  if (line25b > 0) result.line25b_withheld_1099 = line25b;

  if (
    computed_line38 > 0 &&
    input.line38_underpayment_penalty === undefined
  ) {
    result.line38_underpayment_penalty = computed_line38;
  }

  if (balance >= 0) {
    result.line34_overpayment = balance;
    result.line35a_refund = Math.max(0, balance - computed_line38);
    if (computed_line38 > balance) {
      result.line37_amount_owed = computed_line38 - balance;
    }
  } else {
    result.line37_amount_owed = Math.abs(balance) + computed_line38;
  }

  return result;
}

function verifyForm1116Limitation(
  input: F1040Input,
  assembled: Record<string, number>,
): void {
  const form1116Line18 = input.form1116_line18_worldwide_taxable_income;
  const preferentialAdjustment =
    input.form1116_line18_preferential_adjustment ?? 0;
  // Schedule 2 Part I is line 1z plus line 2 AMT; both reach this sink.
  const sourcedAmt = Math.max(
    0,
    Math.round(input.line17_additional_taxes ?? 0) -
      Math.round(input.credit_limit_schedule2_line1z ?? 0),
  );
  if (
    preferentialAdjustment > 0 &&
    ((input.credit_limit_form6251_line11 ?? 0) > 0 || sourcedAmt > 0)
  ) {
    throw new Error(
      "Form 1116 preferential line 18 with AMT needs separate limitation rules",
    );
  }
  const form1116Line20 = input.form1116_line20_us_tax;
  if (form1116Line18 === undefined && form1116Line20 === undefined) return;
  if (
    form1116Line18 === undefined || form1116Line20 === undefined ||
    input.line16_income_tax === undefined
  ) {
    throw new Error(
      "Form 1116 limitation needs both lines 18 and 20 and sourced Form 1040 line 16",
    );
  }

  const seniorDeduction = input.schedule1a_line37_senior_deduction ?? 0;
  if (seniorDeduction > (input.line13b_additional_deductions ?? 0)) {
    throw new Error(
      "Form 1116 Schedule 1-A line 37 exceeds Form 1040 line 13b",
    );
  }
  // Compare the printed whole-dollar operands, not the unrounded intermediate
  // difference: 2025 Form 1116 lines 18 and 20 explicitly cite these lines.
  const expectedLine18 = Math.max(
    0,
    Math.round(assembled.line11_agi) -
      Math.round(assembled.line14_deductions_qbi_total) +
      Math.round(seniorDeduction),
  );
  const expectedLine20 = Math.round(input.line16_income_tax) +
    Math.round(input.credit_limit_schedule2_line1z ?? 0);
  if (
    preferentialAdjustment > expectedLine18 ||
    Math.round(form1116Line18) !==
      Math.max(0, expectedLine18 - preferentialAdjustment)
  ) {
    throw new Error(
      "Form 1116 line 18 does not reconcile its sourced preferential adjustment to Form 1040 lines 11b and 14 plus Schedule 1-A line 37",
    );
  }
  if (Math.round(form1116Line20) !== expectedLine20) {
    throw new Error(
      "Form 1116 line 20 does not match Form 1040 line 16 plus Schedule 2 line 1z",
    );
  }
}

// ─── Node class ───────────────────────────────────────────────────────────────

class F1040Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f1040";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(ctx: NodeContext, rawInput: F1040Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    const schedule3 = input.credit_limit_schedule3_lines;
    if (!input.form8880_source && (schedule3?.line4 ?? 0) > 0) {
      throw new Error(
        "Schedule 3 line 4 needs the Form 8880 contribution source",
      );
    }
    if (input.form8880_source && (schedule3?.line4 ?? 0) > 0) {
      throw new Error(
        "Form 8880 source conflicts with a prefilled Schedule 3 line 4",
      );
    }
    if (
      input.form8880_source &&
      (input.line16_income_tax === undefined || schedule3 === undefined)
    ) {
      throw new Error(
        "Form 8880 needs sourced Form 1040 line 16 and Schedule 3 priority credits",
      );
    }
    const source = input.form8880_source;
    if (
      source &&
      (source.filing_status !== input.filing_status ||
        source.agi !== (input.line11_agi ?? totalIncome(input) -
              (input.line10_adjustments ?? 0)))
    ) {
      throw new Error(
        "Form 8880 filing status and AGI differ from the finalized Form 1040 source",
      );
    }
    const capacity = schedule3 === undefined ? 0 : Math.max(
      0,
      totalTaxBeforeCredits(input) - schedule3.line1 - schedule3.line2 -
        schedule3.line3 - (schedule3.line6dElderlyDisabled ?? 0) -
        (schedule3.line6lForm8978 ?? 0),
    );
    const retirement = source === undefined
      ? undefined
      : calculateForm8880(ctx, source, capacity);
    const retirementCredit = retirement?.credit ?? 0;
    const effectiveInput = retirementCredit === 0 ? input : {
      ...input,
      line20_nonrefundable_credits: (input.line20_nonrefundable_credits ?? 0) +
        retirementCredit,
      credit_limit_schedule3_lines: {
        ...schedule3!,
        line4: retirementCredit,
      },
      ...(input.form8936_priority_personal_credits === undefined ? {} : {
        form8936_priority_personal_credits:
          input.form8936_priority_personal_credits + retirementCredit,
      }),
    };
    const electric = qualifiedElectricAllowance(effectiveInput);
    const cleanVehicles = cleanVehicleAllowance(effectiveInput);
    const mortgage = mortgageAllowance(effectiveInput, cleanVehicles);
    const homebuyer = homebuyerAllowance(
      effectiveInput,
      cleanVehicles,
      mortgage,
    );
    const businessCredit = businessCreditAllowance(
      effectiveInput,
      cleanVehicles,
      mortgage,
      homebuyer,
      electric,
    );
    const bondCredit = bondCreditAllowance(
      effectiveInput,
      cleanVehicles,
      mortgage,
      homebuyer,
      electric,
      businessCredit,
    );
    const numericLines = assembleReturn(
      effectiveInput,
      cleanVehicles,
      mortgage,
      homebuyer,
      electric,
      businessCredit,
      bondCredit,
    );
    verifyForm1116Limitation(effectiveInput, numericLines);
    const assembled = {
      ...numericLines,
      ...(effectiveInput.line5c_pension_rollover === true
        ? { line5c_pension_rollover: true }
        : {}),
    };
    const form2210f = effectiveInput.f2210f_box_b_source === undefined
      ? undefined
      : calculateForm2210FBoxB(effectiveInput.f2210f_box_b_source);
    const schedule3Finalization = cleanVehicles === undefined &&
        mortgage === undefined &&
        homebuyer === undefined &&
        electric === undefined && retirementCredit === 0 &&
        businessCredit === undefined && bondCredit === undefined
      ? undefined
      : {
        nodeType: "schedule3",
        fields: {
          ...(retirementCredit > 0
            ? { line4_retirement_savings_credit: retirementCredit }
            : {}),
          ...(businessCredit
            ? {
              line6a_total: businessCredit.lines.line38 > 0
                ? businessCredit.lines.line38
                : undefined,
            }
            : {}),
          line6f_total: cleanVehicles && cleanVehicles.newCredit > 0
            ? cleanVehicles.newCredit
            : undefined,
          line6m_total: cleanVehicles && cleanVehicles.usedCredit > 0
            ? cleanVehicles.usedCredit
            : undefined,
          line6g_mortgage_interest_credit: mortgage &&
              mortgage.lines.line9 > 0
            ? mortgage.lines.line9
            : undefined,
          line6h_dc_homebuyer_credit: homebuyer && homebuyer.line3 > 0
            ? homebuyer.line3
            : undefined,
          line6i_qualified_electric_vehicle_credit: electric &&
              electric.line7 > 0
            ? electric.line7
            : undefined,
          line6k_tax_credit_bonds: bondCredit && bondCredit.lines.line12 > 0
            ? bondCredit.lines.line12
            : undefined,
          line7_total:
            (bondCredit?.schedule3Line7 ?? businessCredit?.schedule3Line7 ??
                homebuyer?.schedule3Line7 ??
                mortgage?.schedule3Line7 ??
                electric?.schedule3Line7 ??
                cleanVehicles?.schedule3Line7 ?? 0) > 0
              ? bondCredit?.schedule3Line7 ?? businessCredit?.schedule3Line7 ??
                homebuyer?.schedule3Line7 ??
                mortgage?.schedule3Line7 ??
                electric?.schedule3Line7 ??
                cleanVehicles?.schedule3Line7
              : undefined,
          line8_total:
            (bondCredit?.schedule3Credits ?? businessCredit?.schedule3Credits ??
                homebuyer?.schedule3Credits ??
                mortgage?.schedule3Credits ??
                electric?.schedule3Credits ??
                cleanVehicles?.schedule3Credits ??
                (effectiveInput.line20_nonrefundable_credits ?? 0)) > 0
              ? bondCredit?.schedule3Credits ??
                businessCredit?.schedule3Credits ??
                homebuyer?.schedule3Credits ??
                mortgage?.schedule3Credits ??
                electric?.schedule3Credits ??
                cleanVehicles?.schedule3Credits ??
                effectiveInput.line20_nonrefundable_credits
              : undefined,
        },
      };
    return {
      outputs: [{ nodeType: this.nodeType, fields: assembled }],
      finalizations: [
        ...(retirement
          ? [{
            nodeType: "form8880",
            fields: retirement.calculatedZero
              ? { calculated_zero_credit: true }
              : retirement.printFields,
          }]
          : []),
        ...(form2210f
          ? [{
            nodeType: "f2210f",
            fields: {
              source: input.f2210f_box_b_source,
              filed_lines: form2210f,
            },
          }]
          : []),
        ...(schedule3Finalization ? [schedule3Finalization] : []),
        ...(businessCredit
          ? [{
            nodeType: "f3800",
            fields: {
              tax_context: businessCredit.tax,
              passive_lines: businessCredit.passiveLines,
              allowed_credit: businessCredit.lines.line38,
              standard_credit_allowed: businessCredit.lines.line17,
              specified_credit_allowed: businessCredit.lines.line37,
            },
          }]
          : []),
        ...(bondCredit
          ? [{
            nodeType: "f8912",
            fields: {
              allowed_credit: bondCredit.lines.line12,
              unused_credit: bondCredit.lines.unusedCredit,
            },
          }]
          : []),
        ...(mortgage
          ? [{
            nodeType: "form8396",
            fields: {
              ...mortgage.lines,
              credit_limit_worksheet_line1: mortgage.worksheetLine1,
              credit_limit_worksheet_line2: mortgage.worksheetLine2,
            },
          }]
          : []),
        ...(homebuyer
          ? [{
            nodeType: "f8859",
            fields: {
              line1_carryforward: homebuyer.line1,
              line2_limit: homebuyer.line2,
              line3_allowed_credit: homebuyer.line3,
              line4_carryforward: homebuyer.line4,
              worksheet_line1_tax: homebuyer.worksheetLine1,
              worksheet_line2_credits: homebuyer.worksheetLine2,
            },
          }]
          : []),
        ...(electric
          ? [{
            nodeType: "f8834",
            fields: {
              line1_source_credit: electric.line1,
              line2_regular_tax: electric.line2,
              line3a_foreign_tax_credit: electric.line3a,
              line3b_other_credits: electric.line3b,
              line3c_total_credits: electric.line3c,
              line4_net_regular_tax: electric.line4,
              line5_tentative_minimum_tax: electric.line5,
              line6_adjusted_regular_tax: electric.line6,
              line7_allowed_credit: electric.line7,
            },
          }]
          : []),
      ],
    };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const f1040 = new F1040Node();
