import { z } from "zod";
import { element, elements } from "../../../mef/xml.ts";
import {
  filedForm4562Schema,
  singleAssetSchema,
} from "../../../nodes/intermediate/forms/form4562/index.ts";
import {
  computeNetProfit,
  inputSchema as scheduleCInputSchema,
} from "../../../nodes/inputs/schedule_c/model.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

type Fields = z.infer<typeof filedForm4562Schema>;
type Input = Fields | readonly [];

export const FIELD_MAP: ReadonlyArray<readonly [keyof Fields, string]> = [
  ["activity_description", "BusinessOrActivityTxt"],
  ["line1_maximum_dollar_limitation", "MaximumDollarLimitationAmt"],
  ["line2_total_cost", "TotalCostOfSection179PropAmt"],
  ["line3_threshold_cost", "ThresholdCostOfSect179PropAmt"],
  ["line4_reduction", "ReductionInLimitationAmt"],
  ["line5_dollar_limitation", "DollarLimitationForTaxYearAmt"],
  ["line8_total_elected_cost", "TotalElectedCostSect179PropAmt"],
  ["line9_tentative_deduction", "TentativeDeductionAmt"],
  ["line10_prior_carryover", "DisallowedDeductionCyovAmt"],
  ["line11_business_income_limitation", "BusinessIncomeLimitationAmt"],
  ["line12_section179_expense_deduction", "Section179ExpenseDeductionAmt"],
  ["line13_next_year_carryover", "NextYearCarryoverAmt"],
  ["line22_total_depreciation", "TotalDepreciationAmt"],
];

function scheduleCItems(context?: MefBuildContext): readonly unknown[] {
  const pending = context?.pending?.schedule_c;
  if (!pending || typeof pending !== "object") {
    throw new Error(
      "Form 4562 Schedule C asset needs a filed Schedule C source",
    );
  }
  const items = "schedule_cs" in pending ? pending.schedule_cs : undefined;
  if (!Array.isArray(items)) {
    throw new Error(
      "Form 4562 cannot reconcile its asset without Schedule C items",
    );
  }
  return items;
}

function reconcileScheduleC(fields: Fields, context?: MefBuildContext): void {
  const source = scheduleCItems(context);
  const items = z.array(
    z.object({
      business_reference: z.string().optional(),
      line_13_depreciation: z.number().nonnegative().optional(),
    }).passthrough(),
  ).parse(source);
  const matching = items.filter((item) =>
    item.business_reference === fields.business_reference
  );
  if (matching.length !== 1) {
    throw new Error(
      "Form 4562 needs exactly one matching Schedule C activity reference",
    );
  }
  if (
    (matching[0].line_13_depreciation ?? 0) !==
      fields.line22_total_depreciation
  ) {
    throw new Error(
      "Form 4562 line 22 does not reconcile to Schedule C line 13 depreciation",
    );
  }
  if (
    items.some((item) =>
      item.business_reference !== fields.business_reference &&
      (item.line_13_depreciation ?? 0) > 0
    )
  ) {
    throw new Error(
      "Form 4562 single-asset path cannot cover another Schedule C depreciation activity",
    );
  }
}

function reconcileActiveBusinessIncome(
  fields: Fields,
  context?: MefBuildContext,
): void {
  const pending = context?.pending;
  if (!pending?.schedule_c || !pending.f1040 || !pending.schedule1) {
    throw new Error(
      "Form 4562 active-business limit needs filed Schedule C, Schedule 1, and Form 1040 sources",
    );
  }
  const scheduleC = scheduleCInputSchema.parse(pending.schedule_c);
  if (scheduleC.schedule_cs.length !== 1) {
    throw new Error(
      "Form 4562 active-business limit needs one Schedule C business",
    );
  }
  const item = scheduleC.schedule_cs[0];
  if (
    item.business_reference !== fields.business_reference ||
    item.line_g_material_participation !== true ||
    item.line_32_at_risk !== "a" ||
    item.professional_gambler === true ||
    (item.line_30_home_office ?? 0) !== 0 ||
    (item.home_office_sq_ft ?? 0) !== 0 ||
    item.home_office_method !== undefined ||
    (scheduleC.line_30_home_office ?? 0) !== 0 ||
    (scheduleC.wotc_wage_reductions?.length ?? 0) !== 0 ||
    (scheduleC.line1_gross_receipts ?? 0) !== 0 ||
    (scheduleC.statutory_wages ?? 0) !== 0 ||
    (scheduleC.line16a_interest_mortgage ?? 0) !== 0 ||
    (scheduleC.line_9_car_truck_expenses ?? 0) !== 0 ||
    (scheduleC.line_12_depletion ?? 0) !== 0
  ) {
    throw new Error(
      "Form 4562 active-business limit needs one fully sourced, active Schedule C without passthrough or home-office adjustments",
    );
  }
  const unsupportedSources = [
    "schedule_f",
    "schedule_e",
    "form4797",
    "form6252",
    "form8824",
    "form7206",
    "form8829",
    "form461",
  ] as const;
  if (unsupportedSources.some((key) => pending[key] !== undefined)) {
    throw new Error(
      "Form 4562 active-business limit cannot include another business-income or deduction source",
    );
  }
  const f1040 = z.record(z.unknown()).parse(pending.f1040);
  const wageLines = [
    f1040.line1a_wages,
    f1040.line1b_household_wages,
    f1040.line1c_unreported_tips,
    f1040.line1d_medicaid_waiver,
    f1040.line1e_taxable_dep_care,
    f1040.line1f_taxable_adoption_benefits,
    f1040.line1g_wages_8919,
    f1040.line1h_other_earned,
    f1040.line1z_total_wages,
  ];
  if (wageLines.some((amount) => (amount ?? 0) !== 0)) {
    throw new Error(
      "Form 4562 active-business limit needs employee compensation included; the no-wages route cannot use it",
    );
  }
  const schedule1 = z.record(z.unknown()).parse(pending.schedule1);
  if (
    (schedule1.line4_other_gains ?? 0) !== 0 ||
    (schedule1.line6_schedule_f ?? 0) !== 0 ||
    (schedule1.line5_schedule_e ?? 0) !== 0 ||
    (schedule1.line8p_excess_business_loss ?? 0) !== 0
  ) {
    throw new Error(
      "Form 4562 active-business limit cannot reconcile other Schedule 1 business items",
    );
  }
  const currentProfit = computeNetProfit(item);
  const profitWithoutSection179 = computeNetProfit({
    ...item,
    line_13_depreciation: 0,
  });
  if (
    schedule1.line3_schedule_c !== currentProfit ||
    Math.max(0, profitWithoutSection179) !==
      fields.taxpayer_active_business_income
  ) {
    throw new Error(
      "Form 4562 line 11 active-business income does not reconcile to filed Schedule C before section 179",
    );
  }
}

function validateLines(fields: Fields, context?: MefBuildContext): void {
  const pendingForm = context?.pending?.form4562;
  if (
    !pendingForm || typeof pendingForm !== "object" ||
    !("asset" in pendingForm)
  ) {
    throw new Error("Form 4562 native filing needs its source asset record");
  }
  const asset = singleAssetSchema.parse(pendingForm.asset);
  if (
    asset.business_reference !== fields.business_reference ||
    asset.activity_description !== fields.activity_description ||
    asset.asset_description !== fields.asset_description ||
    asset.source_document_ref !== fields.source_document_ref ||
    asset.filing_status !== fields.filing_status ||
    asset.cost !== fields.line2_total_cost ||
    asset.elected_cost !== fields.line6_elected_cost ||
    asset.taxpayer_active_business_income !==
      fields.taxpayer_active_business_income ||
    asset.taxpayer_active_business_income_source_ref !==
      fields.taxpayer_active_business_income_source_ref
  ) {
    throw new Error("Form 4562 filed lines do not match the source asset");
  }
  const general = context?.pending?.general;
  if (
    !general || typeof general !== "object" ||
    !("filing_status" in general) ||
    general.filing_status !== fields.filing_status
  ) {
    throw new Error("Form 4562 filing status does not reconcile to the return");
  }
  if (fields.filing_status === "mfs") {
    throw new Error("Form 4562 MFS section 179 allocation is not supported");
  }
  if (
    fields.line1_maximum_dollar_limitation !==
      Math.min(fields.line2_total_cost, 2_500_000) ||
    fields.line3_threshold_cost !== 4_000_000 ||
    fields.line4_reduction !==
      Math.max(0, fields.line2_total_cost - fields.line3_threshold_cost) ||
    fields.line5_dollar_limitation !==
      Math.max(
        0,
        fields.line1_maximum_dollar_limitation - fields.line4_reduction,
      ) ||
    fields.line2_total_cost !== fields.line6_elected_cost ||
    fields.line8_total_elected_cost !== fields.line6_elected_cost ||
    fields.line9_tentative_deduction !==
      Math.min(
        fields.line5_dollar_limitation,
        fields.line8_total_elected_cost,
      ) ||
    fields.line11_business_income_limitation !==
      Math.min(
        fields.taxpayer_active_business_income,
        fields.line5_dollar_limitation,
      ) ||
    fields.line12_section179_expense_deduction !==
      Math.min(
        fields.line9_tentative_deduction,
        fields.line11_business_income_limitation,
      ) ||
    fields.line13_next_year_carryover !==
      fields.line9_tentative_deduction -
        fields.line12_section179_expense_deduction ||
    fields.line22_total_depreciation !==
      fields.line12_section179_expense_deduction
  ) {
    throw new Error("Form 4562 source asset and filed lines do not reconcile");
  }
}

function buildIRS4562(rawFields: Input, context?: MefBuildContext): string {
  // The MeF builder passes [] when this optional form has no pending slot.
  if (Array.isArray(rawFields) && rawFields.length === 0) return "";
  const fields = filedForm4562Schema.parse(rawFields);
  validateLines(fields, context);
  reconcileScheduleC(fields, context);
  reconcileActiveBusinessIncome(fields, context);
  return elements("IRS4562", [
    ...FIELD_MAP.slice(0, 6).map(([key, tag]) => element(tag, fields[key])),
    elements("ElectedProperty", [
      element("PropertyDesc", fields.asset_description),
      element("CostForBusinessUseOnlyAmt", fields.line2_total_cost),
      element("ElectedCostAmt", fields.line6_elected_cost),
    ]),
    ...FIELD_MAP.slice(6).map(([key, tag]) => element(tag, fields[key])),
  ]);
}

export const form4562: MefFormDescriptor<"form4562", Input> = {
  pendingKey: "form4562",
  FIELD_MAP,
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f4562.pdf",
  build(fields, context) {
    return buildIRS4562(fields, context);
  },
};
