import { z } from "zod";
import { element, elements } from "../../../mef/xml.ts";
import {
  computeVehiclePersonalCredit,
  type F8936Input,
  type F8936MagiYear,
  inputSchema,
  modifiedAgi,
} from "../../../nodes/inputs/f8936/index.ts";
import { FilingStatus } from "../../../nodes/types.ts";
import type { MefBuildContext, MefFormDescriptor } from "../form-descriptor.ts";

type Input = Partial<F8936Input> & Record<string, unknown>;

const priorStatusCode: Readonly<Record<FilingStatus, string>> = {
  [FilingStatus.Single]: "1",
  [FilingStatus.MFJ]: "2",
  [FilingStatus.MFS]: "3",
  [FilingStatus.HOH]: "4",
  [FilingStatus.QSS]: "5",
};

const pendingLimitSchema = z.object({
  f1040: z.object({
    line11_agi: z.number(),
    line18_total_tax_before_credits: z.number(),
  }),
  schedule3: z.object({
    line1_total: z.number().optional(),
    line2_childcare_credit: z.number().optional(),
    line3_education_credit: z.number().optional(),
    line4_retirement_savings_credit: z.number().optional(),
    line5b_energy_efficient_home: z.number().optional(),
    line6d_elderly_disabled_credit: z.number().optional(),
    line6i_qualified_electric_vehicle_credit: z.number().optional(),
    line6f_total: z.number().optional(),
    line6m_total: z.number().optional(),
  }),
});

function magiGroup(tag: string, year: F8936MagiYear): string {
  return elements(tag, [
    element("AdjustedGrossIncomeAmt", year.adjusted_gross_income),
    element("ExcldSect933PuertoRicoIncmAmt", year.excluded_puerto_rico_income),
    (year.foreign_earned_income_exclusion ?? 0) > 0
      ? element("TotalIncomeExclusionAmt", year.foreign_earned_income_exclusion)
      : "",
    element("HousingDeductionAmt", year.foreign_housing_deduction),
    element("GrossIncomeExclusionAmt", year.excluded_american_samoa_income),
    element("NetIncomeAmt", modifiedAgi(year)),
  ]);
}

function buildIRS8936(input: F8936Input, context?: MefBuildContext): string {
  const active = input.f8936s.filter((item) =>
    item.transferred_to_dealer === true ||
    computeVehiclePersonalCredit(item, input) > 0
  );
  if (active.length === 0) return "";
  if (active.some((item) => item.transferred_to_dealer)) {
    throw new Error(
      "Form 8936 dealer-transfer reconciliation and recapture are not implemented",
    );
  }
  if (active.some((item) => (item.business_use_pct ?? 0) > 0)) {
    throw new Error("Form 8936 business-use credit needs Form 3800 routing");
  }

  const pending = pendingLimitSchema.parse(context?.pending);
  const line18 = pending.f1040.line18_total_tax_before_credits;
  if (
    pending.f1040.line11_agi !== input.current_year_magi.adjusted_gross_income
  ) {
    throw new Error(
      "Form 8936 current-year AGI does not match Form 1040 line 11",
    );
  }
  const schedule3 = pending.schedule3;
  const otherCredits = (schedule3.line1_total ?? 0) +
    (schedule3.line2_childcare_credit ?? 0) +
    (schedule3.line3_education_credit ?? 0) +
    (schedule3.line4_retirement_savings_credit ?? 0) +
    (schedule3.line5b_energy_efficient_home ?? 0) +
    (schedule3.line6d_elderly_disabled_credit ?? 0) +
    (schedule3.line6i_qualified_electric_vehicle_credit ?? 0);
  const tentativeNew = active.filter((item) => item.is_new_vehicle === true)
    .reduce((sum, item) => sum + computeVehiclePersonalCredit(item, input), 0);
  const tentativeUsed = active.filter((item) => item.is_new_vehicle === false)
    .reduce((sum, item) => sum + computeVehiclePersonalCredit(item, input), 0);
  const usedAvailable = Math.max(0, line18 - otherCredits);
  const usedCredit = Math.min(tentativeUsed, usedAvailable);
  const newAvailable = Math.max(0, line18 - otherCredits - usedCredit);
  const newCredit = Math.min(tentativeNew, newAvailable);
  if (
    (schedule3.line6f_total ?? 0) !== newCredit ||
    (schedule3.line6m_total ?? 0) !== usedCredit
  ) {
    throw new Error(
      "Form 8936 credit does not reconcile with Schedule 3 lines 6f and 6m",
    );
  }

  return elements("IRS8936", [
    magiGroup("CurrentYrMAGIAmountGrp", input.current_year_magi),
    magiGroup("PriorYrMAGIAmountGrp", input.prior_year_magi),
    element(
      "PYIndivReturnFilingStatusCd",
      priorStatusCode[input.prior_year_filing_status],
    ),
    tentativeNew > 0
      ? elements("CrPrsnlUsePartNewCleanVehGrp", [
        element("PrsnlUseNewCleanVehicleCrAmt", tentativeNew),
        element("TotalTaxBeforeCrAndOthTaxesAmt", line18),
        element("PersonalTaxCreditsAmt", otherCredits + usedCredit),
        element("AdjustedPersonalTaxCreditsAmt", newAvailable),
        element("CleanVehPrsnlUsePartCrAmt", newCredit),
      ])
      : "",
    tentativeUsed > 0
      ? elements("CrPreviouslyOwnedCleanVehGrp", [
        element("PrevOwnedCleanVehCreditAmt", tentativeUsed),
        element("TotalTaxBeforeCrAndOthTaxesAmt", line18),
        element("PersonalTaxCreditsAmt", otherCredits),
        element("AdjustedPersonalTaxCreditsAmt", usedAvailable),
        element("MaxPrevOwnedCleanVehCrAmt", usedCredit),
      ])
      : "",
  ]);
}

export const form8936: MefFormDescriptor<"f8936", Input> = {
  pendingKey: "f8936",
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-prior/f8936--2025.pdf",
  build(fields, context) {
    if (!fields.f8936s || fields.f8936s.length === 0) return "";
    return buildIRS8936(inputSchema.parse(fields), context);
  },
};
