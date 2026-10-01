import {
  categorySummarySchema,
  ForeignTaxCreditMethod,
  ForeignTaxKind,
  IncomeCategory,
  singleSourcePdfReviewSchema,
} from "../../../nodes/intermediate/forms/form_1116/index.ts";
import {
  alternativeCompensationWorldwideTotal,
  inputSchema as fecInputSchema,
} from "../../../nodes/inputs/fec/index.ts";
import { assertAlternativeCompensationSources } from "../../mef/forms/f1116_alternative_compensation_source.ts";

type Pending = Record<string, Record<string, unknown>>;

function zero(value: unknown): boolean {
  return value === undefined || value === null || value === 0;
}

function safePositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function ratio(numerator: number, denominator: number): number {
  return Math.round(
    Math.min(1, Math.max(0, numerator / denominator)) * 100_000,
  ) /
    100_000;
}

/** One alternative wage item, a sourced compensation inventory, and the filed standard deduction. */
export function projectGeneralWageForm1116Pdf(
  fields: Record<string, unknown>,
  pending: Pending,
): Record<string, unknown> {
  const review = singleSourcePdfReviewSchema.safeParse(
    fields.single_source_pdf_review,
  );
  if (!review.success) {
    throw new Error(
      "Form 1116 general wage PDF needs affirmative single-source Part I–IV review",
    );
  }
  const raw = fields.category_summaries;
  if (!Array.isArray(raw) || raw.length !== 1) {
    throw new Error("Form 1116 general wage PDF needs one category");
  }
  const summary = categorySummarySchema.parse(raw[0]);
  if (
    summary.category !== IncomeCategory.General || summary.items.length !== 1
  ) {
    throw new Error("Form 1116 general wage PDF needs one tax item");
  }
  const item = summary.items[0];
  const alternative = item.alternative_compensation_sourcing;
  const currency = item.foreign_tax_currency;
  if (
    !alternative || !currency ||
    item.tax_kind !== ForeignTaxKind.Other ||
    item.tax_credit_method !== ForeignTaxCreditMethod.Paid ||
    !item.irs_country_code ||
    !item.tax_paid_or_accrued_date ||
    item.tax_paid_or_accrued_date !== currency.conversion_date ||
    !/^2025-\d{2}-\d{2}$/.test(item.tax_paid_or_accrued_date) ||
    Number.isNaN(Date.parse(`${item.tax_paid_or_accrued_date}T00:00:00Z`)) ||
    new Date(`${item.tax_paid_or_accrued_date}T00:00:00Z`)
        .toISOString().slice(0, 10) !== item.tax_paid_or_accrued_date ||
    !currency.conversion_rate_explanation ||
    review.data.source_document_reference !==
      alternative.source_document_reference ||
    item.foreign_income_source_document_reference !==
      alternative.source_document_reference ||
    Math.round(currency.amount * currency.usd_per_foreign_unit * 100) !==
      Math.round(item.foreign_tax_paid * 100)
  ) {
    throw new Error(
      "Form 1116 general wage PDF needs a dated, converted foreign tax and the same reviewed wage source",
    );
  }
  const fec = fecInputSchema.safeParse(pending.fec);
  if (!fec.success || fec.data.fecs.length < 1) {
    throw new Error(
      "Form 1116 general wage PDF needs identified foreign-employer sources",
    );
  }
  assertAlternativeCompensationSources([summary], { pending });
  const wage = fec.data.fecs.find((source) =>
    source.alternative_compensation_sourcing?.source_document_reference ===
      alternative.source_document_reference
  );
  const gross = fec.data.fecs.reduce(
    (sum, source) => sum + source.compensation_usd,
    0,
  );
  const taxpayerSsn = typeof pending.general?.taxpayer_ssn === "string"
    ? pending.general.taxpayer_ssn
    : undefined;
  const filedSsn = typeof pending.f1040?.taxpayer_ssn === "string"
    ? pending.f1040.taxpayer_ssn
    : undefined;
  if (
    !wage ||
    !taxpayerSsn || !filedSsn ||
    taxpayerSsn.replace(/\D/g, "") !== filedSsn.replace(/\D/g, "") ||
    alternativeCompensationWorldwideTotal(
        fec.data.fecs,
        wage,
        taxpayerSsn,
      ) < 250_000
  ) {
    throw new Error(
      "Form 1116 general wage PDF needs the identified employee's $250,000 compensation inventory",
    );
  }
  const foreign = item.foreign_gross_income;
  const tax = item.foreign_tax_paid;
  const line18 = fields.total_income;
  const line20 = fields.us_tax_before_credits;
  const worldwideGross = fields.worldwide_gross_income;
  const standardDeduction = fields.standard_or_itemized_deduction;
  const foreignDeduction = safePositiveInteger(standardDeduction)
    ? Math.round(standardDeduction * ratio(foreign, gross))
    : 0;
  const foreignTaxableIncome = foreign - foreignDeduction;
  if (
    !safePositiveInteger(gross) || !safePositiveInteger(foreign) ||
    !safePositiveInteger(tax) || !safePositiveInteger(line18) ||
    !safePositiveInteger(line20) || !safePositiveInteger(worldwideGross) ||
    !safePositiveInteger(standardDeduction) ||
    foreign > gross || gross - standardDeduction !== line18 ||
    gross !== worldwideGross || foreignTaxableIncome <= 0 ||
    alternative.compensation_item_total_usd !== wage.compensation_usd ||
    alternative.alternative_foreign_source_usd !== foreign ||
    summary.foreignGrossIncome !== foreign ||
    summary.includedForeignIncome !== foreign ||
    summary.foreignTaxPaid !== tax ||
    (summary.foreignTaxReduction ?? 0) !== 0 ||
    item.schedule_k3_line12_reduction !== undefined ||
    summary.foreignTaxableIncome !== foreignTaxableIncome ||
    summary.directlyAllocableDeductions !== 0 ||
    summary.explicitlyApportionedDeductions !== 0 ||
    summary.automaticallyApportionedDeductions !== foreignDeduction ||
    (summary.vehicleInterestByCountry ?? []).some((row) => row.amount !== 0) ||
    (item.directly_allocable_deductions ?? 0) !== 0 ||
    (item.apportioned_deductions ?? 0) !== 0 ||
    (item.excluded_income ?? 0) !== 0 ||
    fields.general_deductions !== standardDeduction ||
    !zero(fields.other_deductions) ||
    !zero(summary.priorYearCarryover) ||
    !zero(summary.usedPriorYearCarryover) ||
    summary.currentYearExcessTax !== 0 ||
    fields.foreign_tax_paid !== tax ||
    fields.foreign_income !== foreign ||
    !zero(wage.foreign_earned_income_exclusion_usd)
  ) {
    throw new Error(
      "Form 1116 general wage PDF differs from the reviewed employee wage inventory, standard-deduction, zero-carryover calculation",
    );
  }
  const preferences = fields.regular_tax_preference_facts;
  if (
    !preferences || typeof preferences !== "object" ||
    Number((preferences as Record<string, unknown>).taxable_income) !==
      line18 ||
    Number(
        (preferences as Record<string, unknown>)
          .regular_tax_before_additional_items,
      ) !== line20 ||
    Number((preferences as Record<string, unknown>).qualified_dividends) !==
      0 ||
    Number((preferences as Record<string, unknown>).net_capital_gain) !== 0 ||
    Number((preferences as Record<string, unknown>).special_rate_gain) !== 0 ||
    Number((preferences as Record<string, unknown>).form4952_election) !== 0 ||
    Number(
        (preferences as Record<string, unknown>)
          .foreign_earned_income_exclusion,
      ) !== 0 ||
    (preferences as Record<string, unknown>).form8615_applies !== false
  ) {
    throw new Error(
      "Form 1116 general wage PDF needs matching regular-tax preference and zero special-rate facts",
    );
  }
  const f1040 = pending.f1040;
  const schedule3 = pending.schedule3;
  const schedule2 = pending.schedule2 ?? {};
  const otherIncomeLines = [
    "line1a_wages",
    "line1b_household_wages",
    "line1c_unreported_tips",
    "line1d_medicaid_waiver",
    "line1e_taxable_dep_care",
    "line1f_taxable_adoption_benefits",
    "line1g_wages_8919",
    "line1i_combat_pay",
    "line2a_tax_exempt",
    "line2b_taxable_interest",
    "line3a_qualified_dividends",
    "line3b_ordinary_dividends",
    "line4a_ira_gross",
    "line4b_ira_taxable",
    "line5a_pension_gross",
    "line5b_pension_taxable",
    "line6a_ss_gross",
    "line6b_ss_taxable",
    "line7_capital_gain",
    "line7a_cap_gain_distrib",
    "line8_additional_income",
  ];
  const schedule2TaxKeys = [
    "line1a_excess_advance_premium",
    "line1b_new_clean_vehicle_repayment",
    "line1c_prev_owned_clean_vehicle_repayment",
    "line1d_form4255_net_epe",
    "line1e_form4255_excessive_payment",
    "line1f_form4255_20_percent_ep",
  ];
  if (
    !f1040 || !schedule3 ||
    f1040.line1h_other_earned !== gross ||
    f1040.line1z_total_wages !== gross ||
    f1040.line9_total_income !== gross ||
    !zero(f1040.line10_adjustments) ||
    f1040.line11_agi !== gross ||
    f1040.line12a_standard_deduction !== standardDeduction ||
    !zero(f1040.line12e_itemized_deductions) ||
    f1040.line14_deductions_qbi_total !== standardDeduction ||
    f1040.line15_taxable_income !== line18 ||
    f1040.line16_income_tax !== line20 ||
    otherIncomeLines.some((key) => !zero(f1040[key])) ||
    schedule2TaxKeys.some((key) => !zero(schedule2[key]))
  ) {
    throw new Error(
      "Form 1116 general wage PDF needs only the identified employers on Form 1040 lines 1h and 1z, with the filed standard deduction and reconciled tax",
    );
  }
  const line19 = ratio(foreignTaxableIncome, line18);
  const line21 = Math.round(line20 * line19);
  const line24 = Math.min(tax, line21);
  const line33 = Math.min(line20, line24);
  if (
    summary.allowedCredit !== line24 ||
    schedule3.line1_foreign_tax_credit !== line33
  ) {
    throw new Error(
      "Form 1116 general wage PDF Part III and IV credit differs from MeF or Schedule 3",
    );
  }
  const date = item.tax_paid_or_accrued_date;
  return {
    ...fields,
    income_category: IncomeCategory.General,
    alternative_compensation_source: true,
    pdf_country_a: item.irs_country_code,
    pdf_income_description: "Employee compensation",
    pdf_line1a_a: foreign,
    pdf_line1a_total: foreign,
    pdf_line2_a: 0,
    pdf_line3a_a: standardDeduction,
    pdf_line3b_a: 0,
    pdf_line3c_a: standardDeduction,
    pdf_line3d_a: foreign,
    pdf_line3e_a: gross,
    pdf_line3f_a: ratio(foreign, gross).toFixed(5),
    pdf_line3g_a: foreignDeduction,
    pdf_line4a_a: 0,
    pdf_line4b_a: 0,
    pdf_line5_a: 0,
    pdf_line6_a: foreignDeduction,
    pdf_line6_total: foreignDeduction,
    pdf_line7: foreignTaxableIncome,
    pdf_tax_credit_method: ForeignTaxCreditMethod.Paid,
    pdf_part2_date_a: `${date.slice(5, 7)}/${date.slice(8, 10)}/${
      date.slice(0, 4)
    }`,
    pdf_part2_foreign_other_a: currency.amount,
    pdf_part2_us_other_a: tax,
    pdf_part2_total_a: tax,
    pdf_line8: tax,
    pdf_line9: tax,
    pdf_line10: 0,
    pdf_line11: tax,
    pdf_line12: 0,
    pdf_line13: 0,
    pdf_line14: tax,
    pdf_line15: foreignTaxableIncome,
    pdf_line16: 0,
    pdf_line17: foreignTaxableIncome,
    pdf_line19: line19.toFixed(5),
    pdf_line21: line21,
    pdf_line22: 0,
    pdf_line23: line21,
    pdf_line24: line24,
    pdf_line28: line24,
    pdf_line32: line24,
    pdf_line33: line33,
    pdf_line34: 0,
    pdf_line35: line33,
    pdf_complete_single_source: true,
  };
}
