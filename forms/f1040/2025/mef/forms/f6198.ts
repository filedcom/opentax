import { element, elements } from "../../../mef/xml.ts";
import {
  calculateScheduleCAtRiskNet,
  inputSchema as scheduleCInputSchema,
  projectForm8829ScheduleCItems,
  wotcReductionsByBusiness,
} from "../../../nodes/inputs/schedule_c/model.ts";
import {
  calculateScheduleFAtRiskNet,
  inputSchema as scheduleFInputSchema,
  wotcReductionsByFarm,
} from "../../../nodes/intermediate/forms/schedule_f/index.ts";
import type { SimplifiedAtRiskFacts } from "../../../nodes/intermediate/forms/form6198/simplified.ts";
import type { MefFormDescriptor } from "../form-descriptor.ts";

export function buildSimplifiedIRS6198(
  activityDescription: string,
  preliminaryNet: number,
  facts: SimplifiedAtRiskFacts,
  atRiskNet: number,
  amountAtRisk: number,
): string {
  return elements("IRS6198", [
    element("ActivityDescriptionTxt", activityDescription),
    element("OrdinaryIncomeLossAmt", preliminaryNet),
    element("CurrentYearProfitOrLossAmt", preliminaryNet),
    element("AdjustedBasisAmt", facts.opening_adjusted_basis),
    element("CurrentYearIncreaseRiskAmt", facts.current_year_increases),
    element(
      "SumAdjBasisAndIncreaseRiskAmt",
      facts.opening_adjusted_basis + facts.current_year_increases,
    ),
    element(
      "CurrentYearDecreaseRiskAmt",
      facts.line9_decreases_and_exclusions,
    ),
    element("SumAdjBasisIncrLessDecrRiskAmt", amountAtRisk),
    element("SimplifiedComputationRiskAmt", amountAtRisk),
    element("AmountAtRiskAmt", amountAtRisk),
    element("DeductibleLossAmt", atRiskNet),
  ]);
}

export const form6198: MefFormDescriptor<
  "form6198",
  Record<string, unknown>,
  readonly string[]
> = {
  pendingKey: "form6198",
  sourcePendingKeys: ["form6198", "schedule_c", "schedule_f"],
  FIELD_MAP: [],
  pdfUrl: "https://www.irs.gov/pub/irs-pdf/f6198.pdf",
  build(fields, context) {
    if (Object.keys(fields).length > 0) {
      throw new Error(
        "Form 6198 cannot be filed from aggregate loss fields; each source activity needs its own calculation",
      );
    }
    const scheduleC = context?.pending?.schedule_c;
    const businessSource = scheduleC === undefined || scheduleC === null ||
        typeof scheduleC !== "object" ||
        !("schedule_cs" in scheduleC)
      ? undefined
      : scheduleCInputSchema.parse(scheduleC);
    const businesses = businessSource
      ? projectForm8829ScheduleCItems(businessSource)
      : [];
    const businessReductions = businessSource
      ? wotcReductionsByBusiness({
        ...businessSource,
        schedule_cs: businesses,
      })
      : new Map<string, number>();
    const scheduleF = context?.pending?.schedule_f;
    const farmSource = scheduleF === undefined || scheduleF === null ||
        typeof scheduleF !== "object" ||
        !("schedule_fs" in scheduleF)
      ? undefined
      : scheduleFInputSchema.parse(scheduleF);
    const farms = farmSource?.schedule_fs ?? [];
    const farmReductions = farmSource
      ? wotcReductionsByFarm(farmSource)
      : new Map<string, number>();
    const businessForms = businesses.flatMap((item) => {
      const result = calculateScheduleCAtRiskNet(
        item,
        businessReductions.get(item.business_reference ?? "") ?? 0,
      );
      if (result.preliminaryNet >= 0 || item.line_32_at_risk !== "b") return [];
      if (!item.at_risk_simplified || result.amountAtRisk === undefined) {
        throw new Error("Schedule C line 32b needs Form 6198 facts");
      }
      return [buildSimplifiedIRS6198(
        item.line_c_business_name || item.line_a_principal_business,
        result.preliminaryNet,
        item.at_risk_simplified,
        result.atRiskNet,
        result.amountAtRisk,
      )];
    });
    const farmForms = farms.flatMap((item) => {
      const result = calculateScheduleFAtRiskNet(
        item,
        farmReductions.get(item.farm_id ?? "") ?? 0,
      );
      if (result.preliminaryNet >= 0 || item.line36_at_risk !== "b") return [];
      if (!item.at_risk_simplified || result.amountAtRisk === undefined) {
        throw new Error("Schedule F line 36b needs Form 6198 facts");
      }
      return [buildSimplifiedIRS6198(
        item.line_c_farm_name || item.line_b_agricultural_activity_code,
        result.preliminaryNet,
        item.at_risk_simplified,
        result.atRiskNet,
        result.amountAtRisk,
      )];
    });
    return [...businessForms, ...farmForms];
  },
};
