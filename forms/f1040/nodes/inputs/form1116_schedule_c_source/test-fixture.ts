import {
  ForeignTaxCreditMethod,
  IncomeCategory,
  type RedeterminationDisclosure,
} from "../../intermediate/forms/form_1116/index.ts";

export function scheduleCLedger(
  category: IncomeCategory = IncomeCategory.Passive,
  kind: RedeterminationDisclosure["payor_events"][number]["event_kind"] =
    "foreign_tax_refund_or_reduction",
): RedeterminationDisclosure {
  const increase = kind === "additional_accrued_tax";
  const relationBack = kind === "accrued_tax_unpaid_after_24_months"
    ? 2023
    : 2024;
  const relationBackEnd = `${relationBack}-12-31`;
  const eventDate = kind === "accrued_tax_unpaid_after_24_months"
    ? "2025-12-31"
    : "2025-08-15";
  const revised = increase ? 120 : 80;
  return {
    income_category: category,
    relation_back_tax_year: relationBack,
    relation_back_year_end: relationBackEnd,
    tax_credit_method_in_relation_back_year: ForeignTaxCreditMethod.Accrued,
    payor_events: [{
      payor_name: "Example foreign bank",
      payor_identifier: { kind: "foreign_reference", value: "BANK1" },
      irs_country_code: "SW",
      foreign_tax_year_end: relationBackEnd,
      payor_foreign_income_subject_to_tax: 1_000,
      local_currency_code: "SEK",
      functional_currency_code: "SEK",
      tax_change_local_currency: 200,
      tax_change_functional_currency: 200,
      original_local_units_per_usd: 10,
      tax_change_usd: 20,
      payor_tax_usd_on_filed_return: 100,
      payor_revised_tax_usd: revised,
      event_date: eventDate,
      event_kind: kind,
      source_document_references: ["Foreign assessment/refund and payment record"],
    }],
    filed_form1116: {
      foreign_taxes_paid_or_accrued_usd: 100,
      foreign_tax_credit_claimed_usd: 50,
      source_document_reference: `Filed ${relationBack} Form 1116 passive category`,
    },
    redetermined_form1116: {
      foreign_taxes_paid_or_accrued_usd: revised,
      foreign_tax_credit_claimed_usd: 50,
      calculation_document_reference:
        `${relationBack} Form 1116 redetermination workpaper`,
    },
    affected_years: [{
      tax_year_end: relationBackEnd,
      us_tax_liability_on_filed_return_usd: 4_000,
      redetermined_us_tax_liability_usd: 4_000,
      filed_return_document_reference: `Filed ${relationBack} Form 1040`,
      recalculation_document_reference: `${relationBack} tax liability workpaper`,
    }],
    all_affected_years_reviewed: true,
    source_document_references: ["Filed 1116, foreign notice, and later-year carryover review"],
  };
}
