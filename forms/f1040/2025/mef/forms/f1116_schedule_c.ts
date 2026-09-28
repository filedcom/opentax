import { element, elements } from "../../../mef/xml.ts";
import { z } from "zod";
import {
  IncomeCategory,
  type RedeterminationDisclosure,
  redeterminationDisclosureSchema,
} from "../../../nodes/intermediate/forms/form_1116/index.ts";

const CATEGORY_INDICATOR: Partial<Record<IncomeCategory, string>> = {
  [IncomeCategory.Passive]: "ForeignIncPassiveCategoryInd",
  [IncomeCategory.General]: "ForeignIncGeneralCategoryInd",
};

function wholeDollar(amount: number): number {
  if (!Number.isSafeInteger(amount)) {
    throw new Error(
      "Form 1116 Schedule C staged MeF projection requires whole-dollar U.S. amounts",
    );
  }
  return amount;
}

// These are transcribed filed-year lines, not current-year inputs. The narrow
// arithmetic route below is only for a single 2023/2024 calendar-year Form
// 1116 with no carryovers, other credits, or preferential-rate adjustments.
export const scheduleCFiledYearEvidenceSchema = z.object({
  tax_year_end: z.enum(["2023-12-31", "2024-12-31"]),
  filed_form1116: z.object({
    line9_foreign_tax: z.number().int().nonnegative(),
    line10_carryover_or_carryback: z.literal(0),
    line12_foreign_tax_reduction: z.literal(0),
    line13_high_tax_kickout: z.literal(0),
    line14_available_tax: z.number().int().nonnegative(),
    line16_foreign_income_adjustment: z.literal(0),
    line17_foreign_taxable_income: z.number().int().positive(),
    line18_worldwide_taxable_income: z.number().int().positive(),
    line19_ratio: z.number().min(0).max(1),
    line20_us_income_tax: z.number().int().positive(),
    line21_limit: z.number().int().nonnegative(),
    line22_limit_increase: z.literal(0),
    line23_limit: z.number().int().nonnegative(),
    line24_allowed_credit: z.number().int().nonnegative(),
    line33_total_credit: z.number().int().nonnegative(),
    line34_boycott_reduction: z.literal(0),
    line35_credit: z.number().int().nonnegative(),
    unused_foreign_tax: z.literal(0),
    filed_document_reference: z.string().trim().min(1),
  }).strict(),
  filed_form1040: z.object({
    line15_taxable_income: z.number().int().positive(),
    line16_income_tax: z.number().int().positive(),
    line17_schedule2_tax: z.literal(0),
    line18_tax_before_credits: z.number().int().positive(),
    line19_child_and_dependent_credit: z.literal(0),
    line20_schedule3_nonrefundable_credit: z.number().int().nonnegative(),
    line21_nonrefundable_credits: z.number().int().nonnegative(),
    line22_tax_after_credits: z.number().int().nonnegative(),
    line23_other_taxes: z.number().int().nonnegative(),
    line24_total_tax: z.number().int().nonnegative(),
    filed_document_reference: z.string().trim().min(1),
  }).strict(),
  filed_schedule3: z.object({
    line1_foreign_tax_credit: z.number().int().nonnegative(),
    line8_nonrefundable_credits: z.number().int().nonnegative(),
    filed_document_reference: z.string().trim().min(1),
  }).strict(),
  revised_form1116: z.object({
    line9_foreign_tax: z.number().int().nonnegative(),
    line14_available_tax: z.number().int().nonnegative(),
    line23_limit: z.number().int().nonnegative(),
    line24_allowed_credit: z.number().int().nonnegative(),
    line33_total_credit: z.number().int().nonnegative(),
    line35_credit: z.number().int().nonnegative(),
    unused_foreign_tax: z.literal(0),
    calculation_document_reference: z.string().trim().min(1),
  }).strict(),
  revised_schedule3: z.object({
    line1_foreign_tax_credit: z.number().int().nonnegative(),
    line8_nonrefundable_credits: z.number().int().nonnegative(),
    calculation_document_reference: z.string().trim().min(1),
  }).strict(),
  revised_form1040: z.object({
    line20_schedule3_nonrefundable_credit: z.number().int().nonnegative(),
    line21_nonrefundable_credits: z.number().int().nonnegative(),
    line22_tax_after_credits: z.number().int().nonnegative(),
    line24_total_tax: z.number().int().nonnegative(),
    recalculation_document_reference: z.string().trim().min(1),
  }).strict(),
  reviewed_no_other_form1116_or_special_adjustment: z.literal(true),
  reviewed_no_qualified_dividend_or_capital_gain_rate_adjustment: z.literal(
    true,
  ),
  reviewed_income_tax_and_other_tax_lines_unchanged: z.literal(true),
  reviewed_no_later_year_tax_attribute_effect: z.literal(true),
  later_year_review_document_reference: z.string().trim().min(1),
}).strict();
export type ScheduleCFiledYearEvidence = z.infer<
  typeof scheduleCFiledYearEvidenceSchema
>;

type PayorEvent = RedeterminationDisclosure["payor_events"][number];

function isDecrease(event: PayorEvent): boolean {
  return event.event_kind !== "additional_accrued_tax";
}

function payorIdentifierKey(event: PayorEvent): string {
  return `${event.payor_identifier.kind}:${event.payor_identifier.value}`;
}

function payorFields(payor: PayorEvent): string[] {
  const decrease = isDecrease(payor);
  const payorIdentifier = payor.payor_identifier.kind === "ein"
    ? element("PayorEIN", payor.payor_identifier.value)
    : elements("ForeignEntityIdentificationGrp", [
      element("ForeignEntityReferenceIdNum", payor.payor_identifier.value),
    ]);
  return [
    element("PayorName", payor.payor_name),
    payorIdentifier,
    element("ForeignCountryOrUSPossessionCd", payor.irs_country_code),
    element(
      decrease ? "ForeignTaxRefundedDt" : "AdditionalForeignTaxPaidDt",
      payor.event_date,
    ),
    element("ForeignTaxYearEndDt", payor.foreign_tax_year_end),
    element(
      "ForeignTaxableIncomeAmt",
      wholeDollar(payor.payor_foreign_income_subject_to_tax),
    ),
    element(
      decrease
        ? "TxRefundedInForeignCurrencyAmt"
        : "AddnlTaxForeignCurrencyAmt",
      payor.tax_change_local_currency,
    ),
    element(
      decrease
        ? "TxRefdInFunctionalCurrencyAmt"
        : "AddnlTaxFunctionalCurrencyAmt",
      payor.tax_change_functional_currency,
    ),
    element("ConversionRt", payor.original_local_units_per_usd),
    element(
      decrease ? "RefundInUSDollarsAmt" : "AddnlTaxUSDollarsAmt",
      wholeDollar(payor.tax_change_usd),
    ),
    element(
      "TaxOriginalAmdRetAmt",
      wholeDollar(payor.payor_tax_usd_on_filed_return),
    ),
    element(
      decrease ? "RevisedTaxPaidAccruedAmt" : "RevisedTaxAccruedAmt",
      wholeDollar(payor.payor_revised_tax_usd),
    ),
    ...(payor.event_kind === "accrued_tax_unpaid_after_24_months"
      ? [element("Section905c2TwoYrRuleInd", "X")]
      : []),
  ];
}

function payorYearGroup(
  ledger: RedeterminationDisclosure,
  payors: readonly PayorEvent[],
): string {
  const decrease = isDecrease(payors[0]);
  const sum = (select: (payor: PayorEvent) => number): number =>
    wholeDollar(
      payors.reduce((total, payor) => total + select(payor), 0),
    );
  return decrease
    ? elements("DecrAmtFrgnTaxesPdAccruedDtl", [
      element("USTaxYearEndDt", ledger.relation_back_year_end),
      ...payors.map((payor) =>
        elements("DecrPayorRelationBackYrGrp", payorFields(payor))
      ),
      element(
        "TotalRefundInUSDollarsAmt",
        sum((payor) => payor.tax_change_usd),
      ),
      element(
        "TotalTaxOriginalAmdRetAmt",
        sum((payor) => payor.payor_tax_usd_on_filed_return),
      ),
      element(
        "TotalRevisedTaxPaidAccruedAmt",
        sum((payor) => payor.payor_revised_tax_usd),
      ),
    ])
    : elements("IncrAmtFrgnTaxesAccruedDtl", [
      element("USTaxYearEndDt", ledger.relation_back_year_end),
      ...payors.map((payor) =>
        elements("PayorRelationBackYearGrp", payorFields(payor))
      ),
      element(
        "TotalAddnlTaxUSDollarsAmt",
        sum((payor) => payor.tax_change_usd),
      ),
      element(
        "TotalTaxOriginalAmdRetAmt",
        sum((payor) => payor.payor_tax_usd_on_filed_return),
      ),
      element(
        "TotalRevisedTaxAccruedAmt",
        sum((payor) => payor.payor_revised_tax_usd),
      ),
    ]);
}

export function recomputeScheduleCAffectedYear(
  ledger: RedeterminationDisclosure,
  raw: ScheduleCFiledYearEvidence,
): {
  filedCredit: number;
  revisedCredit: number;
  filedLiability: number;
  revisedLiability: number;
  filedUnusedForeignTax: 0;
  revisedUnusedForeignTax: 0;
} {
  const evidence = scheduleCFiledYearEvidenceSchema.parse(raw);
  const f = evidence.filed_form1116;
  const u = evidence.filed_form1040;
  const s = evidence.filed_schedule3;
  const revisedForm = evidence.revised_form1116;
  const revisedSchedule3 = evidence.revised_schedule3;
  const revisedReturn = evidence.revised_form1040;
  if (
    evidence.tax_year_end !== ledger.relation_back_year_end ||
    ledger.affected_years.length !== 1 ||
    ledger.affected_years[0].tax_year_end !== evidence.tax_year_end
  ) {
    throw new Error(
      "Form 1116 Schedule C filed-year evidence must match the sole affected year",
    );
  }
  // Form 1116 lines 10/12/13/16/22/34 and other-category credit are all zero
  // in this bounded route. Tax above the line 23 limit could alter carryovers,
  // so both the filed and redetermined taxes must be within that limit.
  const ratio = Math.min(
    1,
    Math.round(
      (f.line17_foreign_taxable_income / f.line18_worldwide_taxable_income) *
        10_000,
    ) / 10_000,
  );
  const limit = Math.round(f.line20_us_income_tax * ratio);
  const filedTax = wholeDollar(
    ledger.filed_form1116.foreign_taxes_paid_or_accrued_usd,
  );
  const revisedTax = wholeDollar(
    ledger.redetermined_form1116.foreign_taxes_paid_or_accrued_usd,
  );
  if (
    filedTax > limit || revisedTax > limit ||
    f.line9_foreign_tax !== filedTax || f.line14_available_tax !== filedTax ||
    f.line18_worldwide_taxable_income !== u.line15_taxable_income ||
    f.line19_ratio !== ratio ||
    f.line20_us_income_tax !== u.line16_income_tax ||
    f.line21_limit !== limit || f.line23_limit !== limit ||
    f.line24_allowed_credit !== filedTax ||
    f.line33_total_credit !== filedTax ||
    f.line35_credit !== filedTax ||
    u.line18_tax_before_credits !== u.line16_income_tax ||
    s.line1_foreign_tax_credit !== filedTax ||
    s.line8_nonrefundable_credits !== filedTax ||
    u.line20_schedule3_nonrefundable_credit !== filedTax ||
    u.line21_nonrefundable_credits !== filedTax ||
    u.line22_tax_after_credits !==
      Math.max(0, u.line18_tax_before_credits - filedTax) ||
    u.line24_total_tax !== u.line22_tax_after_credits + u.line23_other_taxes
  ) {
    throw new Error(
      "Form 1116 Schedule C filed-year lines or no-carryover limit do not reconcile",
    );
  }
  const revisedLiability =
    Math.max(0, u.line18_tax_before_credits - revisedTax) +
    u.line23_other_taxes;
  const revisedTaxAfterCredits = Math.max(
    0,
    u.line18_tax_before_credits - revisedTax,
  );
  const affected = ledger.affected_years[0];
  if (
    revisedForm.line9_foreign_tax !== revisedTax ||
    revisedForm.line14_available_tax !== revisedTax ||
    revisedForm.line23_limit !== limit ||
    revisedForm.line24_allowed_credit !== revisedTax ||
    revisedForm.line33_total_credit !== revisedTax ||
    revisedForm.line35_credit !== revisedTax ||
    revisedSchedule3.line1_foreign_tax_credit !== revisedTax ||
    revisedSchedule3.line8_nonrefundable_credits !== revisedTax ||
    revisedReturn.line20_schedule3_nonrefundable_credit !== revisedTax ||
    revisedReturn.line21_nonrefundable_credits !== revisedTax ||
    revisedReturn.line22_tax_after_credits !== revisedTaxAfterCredits ||
    revisedReturn.line24_total_tax !== revisedLiability ||
    revisedForm.calculation_document_reference !==
      ledger.redetermined_form1116.calculation_document_reference ||
    revisedSchedule3.calculation_document_reference !==
      ledger.redetermined_form1116.calculation_document_reference ||
    revisedReturn.recalculation_document_reference !==
      affected.recalculation_document_reference ||
    affected.us_tax_liability_on_filed_return_usd !== u.line24_total_tax ||
    affected.redetermined_us_tax_liability_usd !== revisedLiability ||
    ledger.filed_form1116.foreign_tax_credit_claimed_usd !== filedTax ||
    ledger.redetermined_form1116.foreign_tax_credit_claimed_usd !== revisedTax
  ) {
    throw new Error(
      "Form 1116 Schedule C ledger disagrees with recomputed affected-year tax or revised Form 1116, Schedule 3, Form 1040 lines",
    );
  }
  return {
    filedCredit: filedTax,
    revisedCredit: revisedTax,
    filedLiability: u.line24_total_tax,
    revisedLiability,
    filedUnusedForeignTax: 0,
    revisedUnusedForeignTax: 0,
  };
}

/**
 * Produce a native Part I-IV Schedule C candidate for one category/year.
 * This is deliberately not registered for return export. Filed-year Form 1116,
 * Schedule 3, and Form 1040 lines are arithmetically recomputed and compared
 * for one narrow unchanged-tax case; documents and later-year effects still
 * require independent review before a return can be filed.
 */
export function buildScheduleCProjection(
  raw: RedeterminationDisclosure,
  filedYearEvidence: ScheduleCFiledYearEvidence,
): string {
  const ledger = redeterminationDisclosureSchema.parse(raw);
  const indicator = CATEGORY_INDICATOR[ledger.income_category];
  if (
    !indicator || ledger.payor_events.length > 3 ||
    ledger.affected_years.length !== 1 ||
    ledger.affected_years[0].tax_year_end !== ledger.relation_back_year_end ||
    new Set(ledger.payor_events.map(payorIdentifierKey)).size !==
      ledger.payor_events.length
  ) {
    throw new Error(
      "Form 1116 Schedule C staged projection supports one passive/general category, one relation-back year, and up to three distinct payors only",
    );
  }
  const affected = ledger.affected_years[0];
  const verified = recomputeScheduleCAffectedYear(ledger, filedYearEvidence);
  const increases = ledger.payor_events.filter((payor) => !isDecrease(payor));
  const decreases = ledger.payor_events.filter(isDecrease);
  const difference = wholeDollar(
    verified.revisedLiability - verified.filedLiability,
  );
  return elements("IRS1116ScheduleC", [
    element(indicator, "X"),
    ...(increases.length > 0 ? [payorYearGroup(ledger, increases)] : []),
    ...(decreases.length > 0 ? [payorYearGroup(ledger, decreases)] : []),
    elements("ChangeFrgnTxsPdAccruedGrp", [
      element("USTaxYearEndDt", ledger.relation_back_year_end),
      element(
        "RedetermFrgnTxsPdAccruedAmt",
        wholeDollar(
          ledger.redetermined_form1116.foreign_taxes_paid_or_accrued_usd,
        ),
      ),
      element(
        "FrgnTxsPdAccruedPerReturnAmt",
        wholeDollar(ledger.filed_form1116.foreign_taxes_paid_or_accrued_usd),
      ),
      element(
        "FTCClmPerReturnAmt",
        verified.filedCredit,
      ),
      element(
        "FTCClmRedetermAmt",
        verified.revisedCredit,
      ),
    ]),
    elements("ChgUSTxLiabilityGrp", [
      element("RlnBackYrOrAffectedTaxYrEndDt", affected.tax_year_end),
      element("TotRedetermUSTaxLiabilityAmt", verified.revisedLiability),
      element("TotUSTaxLiabilityPerReturnAmt", verified.filedLiability),
      element("DifferenceBetweenTotalsAmt", difference),
    ]),
  ]);
}
