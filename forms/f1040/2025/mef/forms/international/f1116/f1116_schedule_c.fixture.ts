import { scheduleCLedger } from "../../../../../nodes/inputs/form1116_schedule_c_source/test-fixture.ts";
import { IncomeCategory } from "../../../../../nodes/intermediate/forms/form_1116/index.ts";
import type { ScheduleCFiledYearEvidence } from "./f1116_schedule_c.ts";

export function stagedCase(
  category: IncomeCategory = IncomeCategory.Passive,
  kind:
    | "foreign_tax_refund_or_reduction"
    | "additional_accrued_tax"
    | "accrued_tax_unpaid_after_24_months" = "foreign_tax_refund_or_reduction",
) {
  const source = scheduleCLedger(category, kind);
  const revised =
    source.redetermined_form1116.foreign_taxes_paid_or_accrued_usd;
  const ledger = {
    ...source,
    filed_form1116: {
      ...source.filed_form1116,
      foreign_tax_credit_claimed_usd: 100,
    },
    redetermined_form1116: {
      ...source.redetermined_form1116,
      foreign_tax_credit_claimed_usd: revised,
    },
    affected_years: [{
      ...source.affected_years[0],
      us_tax_liability_on_filed_return_usd: 4_900,
      redetermined_us_tax_liability_usd: 5_000 - revised,
    }],
  };
  const evidence: ScheduleCFiledYearEvidence = {
    tax_year_end: source.relation_back_year_end as "2023-12-31" | "2024-12-31",
    filed_form1116: {
      line9_foreign_tax: 100,
      line10_carryover_or_carryback: 0,
      line12_foreign_tax_reduction: 0,
      line13_high_tax_kickout: 0,
      line14_available_tax: 100,
      line16_foreign_income_adjustment: 0,
      line17_foreign_taxable_income: 10_000,
      line18_worldwide_taxable_income: 100_000,
      line19_ratio: 0.1,
      line20_us_income_tax: 5_000,
      line21_limit: 500,
      line22_limit_increase: 0,
      line23_limit: 500,
      line24_allowed_credit: 100,
      line33_total_credit: 100,
      line34_boycott_reduction: 0,
      line35_credit: 100,
      unused_foreign_tax: 0,
      filed_document_reference: "Filed Form 1116 page 2",
    },
    filed_form1040: {
      line15_taxable_income: 100_000,
      line16_income_tax: 5_000,
      line17_schedule2_tax: 0,
      line18_tax_before_credits: 5_000,
      line19_child_and_dependent_credit: 0,
      line20_schedule3_nonrefundable_credit: 100,
      line21_nonrefundable_credits: 100,
      line22_tax_after_credits: 4_900,
      line23_other_taxes: 0,
      line24_total_tax: 4_900,
      filed_document_reference: "Filed Form 1040 page 2",
    },
    filed_schedule3: {
      line1_foreign_tax_credit: 100,
      line8_nonrefundable_credits: 100,
      filed_document_reference: "Filed Schedule 3 page 1",
    },
    revised_form1116: {
      line9_foreign_tax: revised,
      line14_available_tax: revised,
      line23_limit: 500,
      line24_allowed_credit: revised,
      line33_total_credit: revised,
      line35_credit: revised,
      unused_foreign_tax: 0,
      calculation_document_reference:
        source.redetermined_form1116.calculation_document_reference,
    },
    revised_schedule3: {
      line1_foreign_tax_credit: revised,
      line8_nonrefundable_credits: revised,
      calculation_document_reference:
        source.redetermined_form1116.calculation_document_reference,
    },
    revised_form1040: {
      line20_schedule3_nonrefundable_credit: revised,
      line21_nonrefundable_credits: revised,
      line22_tax_after_credits: 5_000 - revised,
      line24_total_tax: 5_000 - revised,
      recalculation_document_reference:
        source.affected_years[0].recalculation_document_reference,
    },
    reviewed_no_other_form1116_or_special_adjustment: true,
    reviewed_no_qualified_dividend_or_capital_gain_rate_adjustment: true,
    reviewed_income_tax_and_other_tax_lines_unchanged: true,
    reviewed_no_later_year_tax_attribute_effect: true,
    later_year_review_document_reference:
      "Filed later-year FTC and attribute review",
  };
  return { ledger, evidence };
}
