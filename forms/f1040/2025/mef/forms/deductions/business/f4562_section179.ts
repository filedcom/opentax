import { z } from "zod";
import { filedCurrentYearSchema } from "../../../../../nodes/intermediate/forms/deductions/business/form4562/current-year.ts";
import { section179SummarySchema } from "../../../../../nodes/intermediate/forms/deductions/business/form4562/section179-inventory.ts";
import {
  computeNetProfit,
  inputSchema as scheduleCSchema,
} from "../../../../../nodes/inputs/income/business/schedule_c/model.ts";
import { inputSchema as w2Schema } from "../../../../../nodes/inputs/income/wages/w2/index.ts";
import { FilingStatus } from "../../../../../nodes/types.ts";
import { roundWholeDollars } from "../../../../../whole-dollars.ts";
import { element, elements } from "../../../../../mef/xml.ts";

export function reconcileInventorySection179Income(
  filed: z.infer<typeof filedCurrentYearSchema>,
  pending: Readonly<Record<string, unknown>>,
) {
  const review = filed.current_year_inventory.section179_election;
  if (!review) return;
  const f1040 = z.object({
    filing_status: z.nativeEnum(FilingStatus),
    taxpayer_ssn: z.string(),
    line1a_wages: z.number().optional(),
    line1z_total_wages: z.number().optional(),
  }).passthrough().parse(pending.f1040);
  const schedule1 = z.record(z.unknown()).parse(pending.schedule1);
  const scheduleC = scheduleCSchema.parse(pending.schedule_c);
  if (
    review.filing_status !== f1040.filing_status ||
    review.proprietor_ssn !== f1040.taxpayer_ssn.replaceAll("-", "") ||
    [
      "schedule_e",
      "schedule_f",
      "form4835",
      "form4797",
      "form6252",
      "form8824",
      "form8829",
    ].some((key) => pending[key] !== undefined) ||
    [
      "line4_other_gains",
      "line5_schedule_e",
      "line6_schedule_f",
      "line8p_excess_business_loss",
    ].some((key) => (schedule1[key] ?? 0) !== 0) ||
    [
      "line1b_household_wages",
      "line1c_unreported_tips",
      "line1d_medicaid_waiver",
      "line1e_taxable_dep_care",
      "line1f_taxable_adoption_benefits",
      "line1g_wages_8919",
      "line1h_other_earned",
    ].some((key) => (f1040[key] ?? 0) !== 0) ||
    [
      "line_30_home_office",
      "line1_gross_receipts",
      "statutory_wages",
      "line16a_interest_mortgage",
      "line_9_car_truck_expenses",
      "line_12_depletion",
    ].some((key) => (z.record(z.unknown()).parse(scheduleC)[key] ?? 0) !== 0) ||
    (scheduleC.wotc_wage_reductions?.length ?? 0) > 0 ||
    scheduleC.schedule_cs.some((c) =>
      c.proprietor_recipient !== "T" || !c.line_g_material_participation ||
      c.line_32_at_risk === "b" ||
      c.professional_gambler || c.statutory_employee ||
      c.disposed_of_business || (c.line_30_home_office ?? 0) !== 0 ||
      (c.home_office_sq_ft ?? 0) !== 0 || c.home_office_method !== undefined
    )
  ) {
    throw new Error(
      "Section 179 inventory active-income limit needs matching ownership/status and fully sourced active Schedule C activities",
    );
  }
  const health = pending.form7206 === undefined
    ? undefined
    : z.record(z.unknown()).parse(pending.form7206);
  if (health?.line13 !== undefined) {
    throw new Error(
      "Section 179 inventory needs separate self-employed health deduction reconciliation",
    );
  }
  const wages = pending.w2 === undefined
    ? undefined
    : w2Schema.parse(pending.w2);
  const totalWages = wages?.w2s.reduce((sum, w) => sum + w.box1_wages, 0) ?? 0;
  const eins =
    wages?.w2s.map((w) => w.employer_ein?.replaceAll("-", "") ?? "") ?? [];
  if (
    wages?.f8958_allocation !== undefined ||
    new Set(eins).size !== eins.length ||
    eins.some((ein) => !/^\d{9}$/.test(ein)) ||
    wages?.w2s.some((w) =>
      w.employee_ssn?.replaceAll("-", "") !== review.proprietor_ssn ||
      w.box13_statutory_employee ||
      !Number.isSafeInteger(w.box1_wages) || w.box1_wages <= 0
    ) ||
    totalWages !== (f1040.line1a_wages ?? 0) ||
    totalWages !== (f1040.line1z_total_wages ?? 0)
  ) {
    throw new Error(
      "Section 179 inventory wages need distinct ordinary taxpayer-owned W-2 sources matching Form 1040",
    );
  }
  const profits = scheduleC.schedule_cs.reduce(
    (sum, c) => sum + computeNetProfit(c),
    0,
  );
  const deduction =
    filed.section179_summary!.line12_section179_expense_deduction;
  if (
    roundWholeDollars(profits) !== (schedule1.line3_schedule_c ?? 0) ||
    Math.max(0, roundWholeDollars(profits + deduction + totalWages)) !==
      review.taxpayer_active_business_income
  ) {
    throw new Error(
      "Section 179 active income must reconcile after other depreciation but before section 179 and half-SE deduction",
    );
  }
}

const partIFields = [
  ["line1_maximum_dollar_limitation", "MaximumDollarLimitationAmt"],
  ["line2_total_cost", "TotalCostOfSection179PropAmt"],
  ["line3_threshold_cost", "ThresholdCostOfSect179PropAmt"],
  ["line4_reduction", "ReductionInLimitationAmt"],
  ["line5_dollar_limitation", "DollarLimitationForTaxYearAmt"],
  ["line8_total_elected_cost", "TotalElectedCostSect179PropAmt"],
  ["line9_tentative_deduction", "TentativeDeductionAmt"],
  ["line10_prior_carryover", "DisallowedDeductionCyovAmt"],
  ["line11_business_income_limitation", "BusinessIncomeLimitationAmt"],
] as const;
export function section179PartIXml(
  summary: z.infer<typeof section179SummarySchema>,
  isSummary: boolean,
) {
  return [
    ...partIFields.slice(0, 5).map(([key, tag]) => element(tag, summary[key])),
    ...summary.properties.map((p) =>
      elements("ElectedProperty", [
        element("PropertyDesc", p.description),
        element("CostForBusinessUseOnlyAmt", p.cost),
        element("ElectedCostAmt", p.elected),
      ])
    ),
    ...partIFields.slice(5).map(([key, tag]) => element(tag, summary[key])),
    element(
      "Section179ExpenseDeductionAmt",
      summary.line12_section179_expense_deduction,
      isSummary ? { section179ExpnsDedSummaryCd: "SUMMARY" } : undefined,
    ),
    element("NextYearCarryoverAmt", summary.line13_next_year_carryover),
  ];
}
