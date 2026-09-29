import {
  categorySummarySchema,
  ForeignTaxCreditMethod,
  ForeignTaxKind,
  IncomeCategory,
  singleSourceK3PdfReviewSchema,
  singleSourcePdfReviewSchema,
} from "../../../nodes/intermediate/forms/form_1116/index.ts";
import { inputSchema as f1099intInputSchema } from "../../../nodes/inputs/f1099int/index.ts";
import { inputSchema as k1PartnershipInputSchema } from "../../../nodes/inputs/k1_partnership/index.ts";
import { inputSchema as k1SCorpInputSchema } from "../../../nodes/inputs/k1_s_corp/index.ts";
import { scheduleBPresentation } from "../../mef/forms/f1116_schedule_b.ts";

type Pending = Record<string, Record<string, unknown>>;

function number(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Form 1116 PDF needs sourced ${label}`);
  }
  return value;
}

function zero(value: unknown): boolean {
  return value === undefined || value === null || value === 0;
}

function ratio(numerator: number, denominator: number): number {
  return Math.round(
    Math.min(1, Math.max(0, numerator / denominator)) * 100_000,
  ) / 100_000;
}

export function projectSingleSourceForm1116Pdf(
  fields: Record<string, unknown>,
  pending: Pending,
): Record<string, unknown> {
  const raw = fields.category_summaries;
  if (!Array.isArray(raw) || raw.length !== 1) {
    throw new Error("Form 1116 PDF supports one reviewed passive category");
  }
  const summary = categorySummarySchema.parse(raw[0]);
  if (
    summary.category !== IncomeCategory.Passive ||
    summary.items.length !== 1
  ) {
    throw new Error("Form 1116 PDF supports one reviewed passive tax item");
  }
  const item = summary.items[0];
  const k3 = item.partnership_k3_passive_interest;
  const sCorpK3 = item.s_corp_k3_passive_interest;
  const review =
    (k3 || sCorpK3
      ? singleSourceK3PdfReviewSchema
      : singleSourcePdfReviewSchema)
      .safeParse(fields.single_source_pdf_review);
  if (!review.success) {
    throw new Error(
      "Form 1116 PDF cannot render an active category without affirmative single-source Part I–IV review",
    );
  }
  if (k3 && sCorpK3) {
    throw new Error("Form 1116 PDF cannot combine two K-3 source types");
  }
  if (k3) {
    if (item.tax_reported_on_1099 === true) {
      throw new Error(
        "Form 1116 PDF partnership K-3 tax cannot also be a 1099-INT tax item",
      );
    }
    const source = k1PartnershipInputSchema.safeParse(pending.k1_partnership);
    const rows = source.success ? source.data.k1_partnerships : [];
    const otherK1Amounts = [
      "box1_ordinary_business",
      "box2_rental_re",
      "box3_other_rental",
      "box4a_guaranteed_services",
      "box4b_guaranteed_capital",
      "box6a_ordinary_dividends",
      "box6b_qualified_dividends",
      "box6c_dividend_equivalents",
      "box7_royalties",
      "box8_net_st_cap_gain",
      "box9a_net_lt_cap_gain",
      "box9b_collectibles_gain",
      "box9c_unrecaptured_1250",
      "box9b_unrecaptured_1250",
      "box10_net_1231",
      "box11_other_income",
      "box12_section_179",
      "box13_deductions",
      "box14a_se_earnings",
      "box16_foreign_deductions",
      "box17_amt_adjustment",
      "box18_tax_exempt_income",
      "box20z_qbi",
    ] as const;
    if (
      rows.length !== 1 ||
      otherK1Amounts.some((key) => !zero(rows[0][key])) ||
      rows[0].box20_code_b_investment_expenses !== undefined ||
      rows[0].box13_code_h_investment_interest !== undefined ||
      rows[0].box13_code_i_royalty_deduction !== undefined ||
      JSON.stringify(rows[0].schedule_k3_passive_interest) !==
        JSON.stringify(k3) ||
      rows[0].partnership_ein !== k3.partnership_ein ||
      rows[0].source_document_reference !== k3.k1_source_document_reference ||
      rows[0].box5_interest !== item.foreign_gross_income ||
      rows[0].box16_foreign_income !== item.foreign_gross_income ||
      rows[0].box16_foreign_tax !== item.foreign_tax_paid ||
      k3.part_ii_section_1_line_6_passive_interest !==
        item.foreign_gross_income ||
      k3.part_ii_section_1_line_24_passive_total !==
        item.foreign_gross_income ||
      k3.part_iii_section_4_line_1_foreign_tax !== item.foreign_tax_paid ||
      k3.part_iii_section_4_line_2_tax_reduction !==
        item.schedule_k3_line12_reduction?.amount ||
      k3.k3_source_document_reference !==
        item.schedule_k3_line12_reduction?.source_document_reference ||
      k3.irs_country_code !== item.irs_country_code ||
      k3.tax_paid_date !== item.tax_paid_or_accrued_date ||
      JSON.stringify(k3.foreign_tax_currency) !==
        JSON.stringify(item.foreign_tax_currency) ||
      review.data.source_document_reference !== k3.k3_source_document_reference
    ) {
      throw new Error(
        "Form 1116 PDF K-3 interest, tax, and line 12 reduction must match the sole partnership source",
      );
    }
  } else if (sCorpK3) {
    if (item.tax_reported_on_1099 === true) {
      throw new Error(
        "Form 1116 PDF S-corporation K-3 tax cannot also be a 1099-INT tax item",
      );
    }
    const source = k1SCorpInputSchema.safeParse(pending.k1_s_corp);
    const rows = source.success ? source.data.k1_s_corps : [];
    const permitted = new Set([
      "corporation_name",
      "corporation_ein",
      "source_document_reference",
      "box4_interest",
      "box14_foreign_tax",
      "box14_foreign_income",
      "box14_foreign_income_category",
      "box14_foreign_tax_irs_country_code",
      "box14_foreign_tax_paid_or_accrued_date",
      "box14_foreign_tax_kind",
      "box14_foreign_tax_credit_method",
      "schedule_k3_passive_interest",
    ]);
    if (
      rows.length !== 1 ||
      Object.keys(rows[0]).some((key) => !permitted.has(key)) ||
      JSON.stringify(rows[0].schedule_k3_passive_interest) !==
        JSON.stringify(sCorpK3) ||
      rows[0].corporation_ein !== sCorpK3.corporation_ein ||
      rows[0].source_document_reference !==
        sCorpK3.k1_source_document_reference ||
      rows[0].box4_interest !== item.foreign_gross_income ||
      rows[0].box14_foreign_income !== item.foreign_gross_income ||
      rows[0].box14_foreign_tax !== item.foreign_tax_paid ||
      rows[0].box14_foreign_income_category !== IncomeCategory.Passive ||
      rows[0].box14_foreign_tax_irs_country_code !== item.irs_country_code ||
      rows[0].box14_foreign_tax_paid_or_accrued_date !==
        item.tax_paid_or_accrued_date ||
      rows[0].box14_foreign_tax_kind !== ForeignTaxKind.Interest ||
      rows[0].box14_foreign_tax_credit_method !==
        ForeignTaxCreditMethod.Paid ||
      sCorpK3.part_ii_section_1_line_6_passive_interest !==
        item.foreign_gross_income ||
      sCorpK3.part_ii_section_1_line_24_passive_total !==
        item.foreign_gross_income ||
      sCorpK3.part_iii_section_3_line_1_foreign_tax !==
        item.foreign_tax_paid ||
      sCorpK3.part_iii_section_3_line_2_tax_reduction !==
        item.schedule_k3_line12_reduction?.amount ||
      sCorpK3.k3_source_document_reference !==
        item.schedule_k3_line12_reduction?.source_document_reference ||
      sCorpK3.irs_country_code !== item.irs_country_code ||
      sCorpK3.tax_paid_date !== item.tax_paid_or_accrued_date ||
      JSON.stringify(sCorpK3.foreign_tax_currency) !==
        JSON.stringify(item.foreign_tax_currency) ||
      review.data.source_document_reference !==
        sCorpK3.k3_source_document_reference
    ) {
      throw new Error(
        "Form 1116 PDF K-3 interest, tax, and line 12 reduction must match the sole S-corporation source",
      );
    }
  } else if (item.schedule_k3_line12_reduction !== undefined) {
    throw new Error(
      "Form 1116 PDF K-3 line 12 reduction needs a matching K-1 and K-3 source",
    );
  }
  const currency = item.foreign_tax_currency;
  const reportedOn1099 = item.tax_reported_on_1099 === true;
  if (
    item.tax_kind !== ForeignTaxKind.Interest ||
    item.tax_credit_method !== ForeignTaxCreditMethod.Paid ||
    !item.irs_country_code ||
    (reportedOn1099
      ? currency !== undefined || item.tax_paid_or_accrued_date !== undefined
      : !item.tax_paid_or_accrued_date ||
        !/^2025-\d{2}-\d{2}$/.test(item.tax_paid_or_accrued_date) ||
        Number.isNaN(
          Date.parse(`${item.tax_paid_or_accrued_date}T00:00:00Z`),
        ) ||
        new Date(`${item.tax_paid_or_accrued_date}T00:00:00Z`).toISOString()
            .slice(0, 10) !==
          item.tax_paid_or_accrued_date ||
        !currency)
  ) {
    throw new Error(
      "Form 1116 PDF needs one dated converted interest tax or one identified 1099-INT tax",
    );
  }
  if (
    review.data.source_document_reference !==
      item.foreign_income_source_document_reference ||
    (!reportedOn1099 && review.data.source_document_reference !==
        currency?.source_document_reference)
  ) {
    throw new Error(
      "Form 1116 PDF review must identify the same foreign income and tax source",
    );
  }
  if (
    !reportedOn1099 && currency &&
    Math.round(currency.amount * currency.usd_per_foreign_unit * 100) !==
      Math.round(item.foreign_tax_paid * 100)
  ) {
    throw new Error(
      "Form 1116 PDF foreign-currency conversion differs from the U.S.-dollar tax",
    );
  }
  if (reportedOn1099) {
    const source = f1099intInputSchema.safeParse(pending.f1099int);
    const rows = source.success ? source.data.f1099ints : [];
    if (
      rows.length !== 1 ||
      rows[0].foreign_tax_source_document_reference !==
        review.data.source_document_reference ||
      rows[0].box1 !== item.foreign_gross_income ||
      rows[0].foreign_source_interest_usd !== item.foreign_gross_income ||
      rows[0].box6 !== item.foreign_tax_paid ||
      rows[0].foreign_tax_irs_country_code !== item.irs_country_code
    ) {
      throw new Error(
        "Form 1116 PDF 1099-INT income, country and box 6 tax must match the identified source",
      );
    }
  }
  const worldwideGross = number(
    fields.worldwide_gross_income,
    "worldwide gross income for Part I line 3e",
  );
  const standardDeduction = number(
    fields.standard_or_itemized_deduction,
    "standard deduction for Part I line 3a",
  );
  const line18 = number(fields.total_income, "Part III line 18");
  const line20 = number(fields.us_tax_before_credits, "Part III line 20");
  const foreignTaxableIncome = item.foreign_gross_income - standardDeduction;
  if (
    worldwideGross <= 0 || line18 <= 0 || line20 <= 0 ||
    item.foreign_gross_income <= 0 ||
    standardDeduction < 0 || foreignTaxableIncome <= 0 ||
    !Number.isSafeInteger(item.foreign_gross_income) ||
    !Number.isSafeInteger(item.foreign_tax_paid) ||
    !Number.isSafeInteger(worldwideGross) ||
    !Number.isSafeInteger(standardDeduction) ||
    !Number.isSafeInteger(line18) ||
    !Number.isSafeInteger(line20) ||
    item.foreign_gross_income !== worldwideGross ||
    foreignTaxableIncome !== line18 ||
    item.foreign_tax_paid <= 0 ||
    summary.foreignGrossIncome !== item.foreign_gross_income ||
    summary.includedForeignIncome !== item.foreign_gross_income ||
    summary.foreignTaxPaid !== item.foreign_tax_paid ||
    (summary.foreignTaxReduction ?? 0) !==
      (k3?.part_iii_section_4_line_2_tax_reduction ??
        sCorpK3?.part_iii_section_3_line_2_tax_reduction ?? 0) ||
    summary.foreignTaxableIncome !== foreignTaxableIncome ||
    summary.directlyAllocableDeductions !== 0 ||
    summary.explicitlyApportionedDeductions !== 0 ||
    summary.automaticallyApportionedDeductions !== standardDeduction ||
    (summary.vehicleInterestByCountry ?? []).some((row) => row.amount !== 0) ||
    (item.directly_allocable_deductions ?? 0) !== 0 ||
    (item.apportioned_deductions ?? 0) !== 0 ||
    (item.excluded_income ?? 0) !== 0 ||
    fields.general_deductions !== standardDeduction ||
    (fields.other_deductions ?? 0) !== 0 ||
    (summary.priorYearCarryover ?? 0) !== 0 ||
    (summary.usedPriorYearCarryover ?? 0) !== 0 ||
    item.alternative_compensation_sourcing !== undefined
  ) {
    throw new Error(
      "Form 1116 PDF single-source category differs from the reviewed standard-deduction, zero-carryover calculation",
    );
  }
  const preferences = fields.regular_tax_preference_facts;
  if (
    preferences === undefined ||
    typeof preferences !== "object" || preferences === null ||
    (
      Number((preferences as Record<string, unknown>).qualified_dividends) !==
        0 ||
      Number((preferences as Record<string, unknown>).net_capital_gain) !== 0 ||
      Number((preferences as Record<string, unknown>).special_rate_gain) !==
        0 ||
      Number((preferences as Record<string, unknown>).form4952_election) !==
        0 ||
      Number(
          (preferences as Record<string, unknown>)
            .foreign_earned_income_exclusion,
        ) !== 0 ||
      (preferences as Record<string, unknown>).form8615_applies !== false ||
      Number((preferences as Record<string, unknown>).taxable_income) !==
        line18 ||
      Number(
          (preferences as Record<string, unknown>)
            .regular_tax_before_additional_items,
        ) !== line20
    )
  ) {
    throw new Error(
      "Form 1116 PDF needs matching regular-tax preference and zero special-rate facts",
    );
  }
  const f1040 = pending.f1040;
  const schedule3 = pending.schedule3;
  const schedule2 = pending.schedule2 ?? {};
  const line1zKeys = [
    "line1a_excess_advance_premium",
    "line1b_new_clean_vehicle_repayment",
    "line1c_prev_owned_clean_vehicle_repayment",
    "line1d_form4255_net_epe",
    "line1e_form4255_excessive_payment",
    "line1f_form4255_20_percent_ep",
  ];
  const otherIncomeLines = [
    "line1a_wages",
    "line1b_household_wages",
    "line1c_unreported_tips",
    "line1d_medicaid_waiver",
    "line1e_taxable_dep_care",
    "line1f_taxable_adoption_benefits",
    "line1g_wages_8919",
    "line1h_other_earned",
    "line1i_combat_pay",
    "line1z_total_wages",
    "line2a_tax_exempt",
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
  if (
    !f1040 || !schedule3 ||
    f1040.line2b_taxable_interest !== item.foreign_gross_income ||
    f1040.line9_total_income !== item.foreign_gross_income ||
    !zero(f1040.line10_adjustments) ||
    f1040.line11_agi !== item.foreign_gross_income ||
    f1040.line11_agi - standardDeduction !== line18 ||
    f1040.line12a_standard_deduction !== standardDeduction ||
    !zero(f1040.line12e_itemized_deductions) ||
    f1040.line14_deductions_qbi_total !== standardDeduction ||
    f1040.line15_taxable_income !== line18 ||
    f1040.line16_income_tax !== line20 ||
    !zero(f1040.line13b_additional_deductions) ||
    pending.schedule1a?.senior_zero_exclusions_review === true ||
    otherIncomeLines.some((key) => !zero(f1040[key])) ||
    (!reportedOn1099 && pending.f1099int !== undefined) ||
    pending.f1099oid !== undefined ||
    line1zKeys.some((key) => !zero(schedule2[key]))
  ) {
    throw new Error(
      "Form 1116 PDF needs only identified foreign interest on Form 1040 lines 2b and 9–11, the matching standard deduction on lines 12a–15, and zero other income, deductions, and Schedule 2 line 1z",
    );
  }
  const line19 = ratio(foreignTaxableIncome, line18);
  const line21 = Math.round(line20 * line19);
  const reduction = k3?.part_iii_section_4_line_2_tax_reduction ??
    sCorpK3?.part_iii_section_3_line_2_tax_reduction ?? 0;
  const netTax = item.foreign_tax_paid - reduction;
  const line24 = Math.min(Math.round(netTax), line21);
  const line33 = Math.min(line20, line24);
  const currentExcess = Math.max(0, netTax - line24);
  if (summary.currentYearExcessTax !== currentExcess) {
    throw new Error(
      "Form 1116 PDF current-year excess differs from the category calculation",
    );
  }
  if (currentExcess > 0) {
    if (!pending.form1116_schedule_b) {
      throw new Error(
        "Form 1116 PDF current-year excess needs the matching sourced Schedule B",
      );
    }
    const scheduleB = scheduleBPresentation(pending.form1116_schedule_b);
    if (
      scheduleB.case !== "current_year_excess" ||
      scheduleB.category !== summary.category ||
      scheduleB.amount !== currentExcess
    ) {
      throw new Error(
        "Form 1116 PDF current-year excess needs the matching sourced Schedule B",
      );
    }
  }
  if (
    summary.allowedCredit !== line24 ||
    schedule3.line1_foreign_tax_credit !== line33 ||
    fields.foreign_tax_paid !== item.foreign_tax_paid ||
    fields.foreign_income !== item.foreign_gross_income
  ) {
    throw new Error(
      "Form 1116 PDF category limitation and Part IV credit differ from MeF or Schedule 3",
    );
  }
  const date = item.tax_paid_or_accrued_date;
  const line3f = ratio(item.foreign_gross_income, worldwideGross);
  return {
    ...fields,
    income_category: summary.category,
    pdf_country_a: item.irs_country_code,
    pdf_income_description: "Interest income",
    pdf_line1a_a: item.foreign_gross_income,
    pdf_line1a_total: item.foreign_gross_income,
    pdf_line2_a: 0,
    pdf_line3a_a: standardDeduction,
    pdf_line3b_a: 0,
    pdf_line3c_a: standardDeduction,
    pdf_line3d_a: item.foreign_gross_income,
    pdf_line3e_a: worldwideGross,
    pdf_line3f_a: line3f.toFixed(5),
    pdf_line3g_a: standardDeduction,
    pdf_line4a_a: 0,
    pdf_line4b_a: 0,
    pdf_line5_a: 0,
    pdf_line6_a: standardDeduction,
    pdf_line6_total: standardDeduction,
    pdf_line7: foreignTaxableIncome,
    pdf_tax_credit_method: item.tax_credit_method,
    pdf_part2_date_a: reportedOn1099
      ? "1099 taxes"
      : `${date!.slice(5, 7)}/${date!.slice(8, 10)}/${date!.slice(0, 4)}`,
    pdf_part2_foreign_interest_a: currency?.amount,
    pdf_part2_us_interest_a: item.foreign_tax_paid,
    pdf_part2_total_a: item.foreign_tax_paid,
    pdf_line8: item.foreign_tax_paid,
    pdf_line9: item.foreign_tax_paid,
    pdf_line10: 0,
    pdf_line11: item.foreign_tax_paid,
    pdf_line12: reduction,
    pdf_line13: 0,
    pdf_line14: netTax,
    pdf_line15: foreignTaxableIncome,
    pdf_line16: 0,
    pdf_line17: foreignTaxableIncome,
    pdf_line19: line19.toFixed(5),
    pdf_line21: line21,
    pdf_line22: 0,
    pdf_line23: line21,
    pdf_line24: line24,
    pdf_line27: line24,
    pdf_line32: line24,
    pdf_line33: line33,
    pdf_line34: 0,
    pdf_line35: line33,
    pdf_complete_single_source: true,
  };
}
