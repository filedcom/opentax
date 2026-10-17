import { z } from "zod";
import {
  computeCOGS,
  computeNetProfit,
  inputSchema as scheduleCSchema,
  isSeExempt,
  itemSchema as scheduleCItemSchema,
} from "../../../income/business/schedule_c/model.ts";
import { scheduleSELines } from "../../../../intermediate/forms/taxes/self-employment/schedule_se/calculation.ts";
import { CONFIG_BY_YEAR } from "../../../../config/index.ts";

const reference = z.string().trim().min(1);
export const businessCostFields = [
  "line_2_returns_allowances",
  "line_8_advertising",
  "line_9_car_truck_expenses",
  "line_10_commissions_fees",
  "line_11_contract_labor",
  "line_12_depletion",
  "line_13_depreciation",
  "line_14_employee_benefits",
  "line_15_insurance",
  "line_16a_interest_mortgage",
  "line_16b_interest_other",
  "line_17_professional_services",
  "line_18_office_expense",
  "line_19_pension_plans",
  "line_20a_rent_vehicles",
  "line_20b_rent_other",
  "line_21_repairs",
  "line_22_supplies",
  "line_23_taxes_licenses",
  "line_24a_travel",
  "line_24b_meals",
  "line_25_utilities",
  "line_26_wages",
  "line_27a_energy_efficient",
  "line_27b_other_expenses",
] as const;
const businessReviewBase = z.object({
  tax_year: z.literal(2025),
  owner_ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/),
  business_reference: reference,
  ownership_record_reference: reference,
  personal_services_record_reference: reference,
  capital_review_record_reference: reference,
  schedule_c_source: scheduleCItemSchema,
  receipt_sources: z.array(
    z.object({
      source_document_reference: reference,
      owner_ssn: z.string(),
      business_reference: reference,
      schedule_c_field: z.enum([
        "line_1_gross_receipts",
        "line_6_other_income",
      ]),
      amount: z.number().int().nonnegative(),
    }).strict(),
  ).min(1),
  cost_sources: z.array(
    z.object({
      source_document_reference: reference,
      owner_ssn: z.string(),
      business_reference: reference,
      schedule_c_field: z.enum(businessCostFields),
      amount: z.number().int().nonnegative(),
    }).strict(),
  ),
}).strict();
// Support evidence retains cents; filed business and SE amounts remain whole dollars.
export const supportMoney = z.number().nonnegative().refine(
  (amount) =>
    Number.isSafeInteger(Math.round(amount * 100)) &&
    Math.abs(amount * 100 - Math.round(amount * 100)) < 1e-7,
  "Support evidence must have no fractional cents",
);
export const evidenceCents = (amount: number): number => {
  supportMoney.parse(amount);
  return Math.round(amount * 100);
};
export const businessReviewSchema = z.discriminatedUnion(
  "income_producing_factors",
  [
    businessReviewBase.extend({
      income_producing_factors: z.literal(
        "personal_services_without_material_capital",
      ),
    }).strict(),
    businessReviewBase.extend({
      income_producing_factors: z.literal(
        "personal_services_and_material_capital",
      ),
      material_capital_review: z.object({
        reasonableness_record_reference: reference,
        capital_sources: z.array(
          z.object({
            source_document_reference: reference,
            owner_ssn: reference,
            business_reference: reference,
            asset_reference: reference,
            deployment_record_reference: reference,
            cost_source_reference: reference,
            capital_usage_cost_field: z.enum([
              "line_20a_rent_vehicles",
              "line_20b_rent_other",
              "line_13_depreciation",
            ]),
            receipt_source_references: z.array(reference).min(1),
            income_producing_use: z.literal(true),
          }).strict(),
        ).min(1),
        compensation_benchmarks: z.array(
          z.object({
            source_document_reference: reference,
            tax_year: z.literal(2025),
            service_description: reference,
            hourly_rate: supportMoney.refine((amount) => amount > 0),
          }).strict(),
        ).min(1),
        personal_service_sources: z.array(
          z.object({
            source_document_reference: reference,
            owner_ssn: reference,
            business_reference: reference,
            receipt_source_references: z.array(reference).min(1),
            compensation_benchmark_reference: reference,
            service_description: reference,
            hours_performed: z.number().int().positive(),
          }).strict(),
        ).min(1),
      }).strict(),
    }).strict(),
  ],
);
export type BusinessReview = z.infer<typeof businessReviewSchema>;
export interface WageReview {
  box1_wages: number;
  box3_ss_wages?: number;
  box7_ss_tips?: number;
}
const tin = (value: string) => value.replaceAll("-", "");
function reviewedCompensationCents(review: BusinessReview): number | undefined {
  if (
    review.income_producing_factors !== "personal_services_and_material_capital"
  ) return;
  const capital = review.material_capital_review;
  const receipts = new Set(
    review.receipt_sources.map((r) => r.source_document_reference),
  );
  const costs = new Set(
    review.cost_sources.map((r) => r.source_document_reference),
  );
  const usedCapital = new Set<string>();
  const usedServices = new Set<string>();
  const records = new Set([...receipts, ...costs]);
  const assets = new Set<string>();
  const identity = (
    record: { owner_ssn: string; business_reference: string },
  ) => {
    if (
      tin(record.owner_ssn) !== tin(review.owner_ssn) ||
      record.business_reference !== review.business_reference
    ) {
      throw new Error(
        "Form 8863 capital/service evidence must belong to the claimant and reviewed business",
      );
    }
  };
  const distinct = (reference: string) => {
    if (records.has(reference)) {
      throw new Error(
        "Form 8863 capital/service/benchmark evidence needs distinct source references",
      );
    }
    records.add(reference);
  };
  const joinedReceipts = (references: string[], used: Set<string>) => {
    if (
      new Set(references).size !== references.length ||
      references.some((ref) => !receipts.has(ref))
    ) {
      throw new Error(
        "Form 8863 capital and personal services must join actual reviewed business receipt sources",
      );
    }
    references.forEach((ref) => used.add(ref));
  };
  for (const record of capital.capital_sources) {
    identity(record);
    distinct(record.source_document_reference);
    distinct(record.deployment_record_reference);
    if (
      assets.has(record.asset_reference) ||
      !costs.has(record.cost_source_reference) ||
      review.cost_sources.find((cost) =>
          cost.source_document_reference === record.cost_source_reference
        )?.schedule_c_field !== record.capital_usage_cost_field
    ) {
      throw new Error(
        "Form 8863 material capital requires distinct deployed assets joined to actual business costs",
      );
    }
    assets.add(record.asset_reference);
    joinedReceipts(record.receipt_source_references, usedCapital);
  }
  const benchmarks = new Map(
    capital.compensation_benchmarks.map((
      b,
    ) => [b.source_document_reference, b]),
  );
  for (const benchmark of capital.compensation_benchmarks) {
    distinct(benchmark.source_document_reference);
  }
  const usedBenchmarks = new Set<string>();
  let allowance = 0;
  for (const record of capital.personal_service_sources) {
    identity(record);
    distinct(record.source_document_reference);
    joinedReceipts(record.receipt_source_references, usedServices);
    const benchmark = benchmarks.get(record.compensation_benchmark_reference);
    if (
      !benchmark || benchmark.service_description !== record.service_description
    ) {
      throw new Error(
        "Form 8863 performed-service compensation must join the matching reviewed pay benchmark",
      );
    }
    usedBenchmarks.add(record.compensation_benchmark_reference);
    allowance += record.hours_performed * evidenceCents(benchmark.hourly_rate);
  }
  if (
    usedCapital.size !== receipts.size || usedServices.size !== receipts.size ||
    usedBenchmarks.size !== benchmarks.size || !Number.isSafeInteger(allowance)
  ) {
    throw new Error(
      "Form 8863 material capital and performed services must inventory all receipt and compensation sources",
    );
  }
  return allowance;
}
export function reviewedBusinessIncome(
  businesses: readonly BusinessReview[],
  wages: readonly WageReview[],
  ownerSsn: string,
) {
  const identities = new Set<string>();
  const records = new Set<string>();
  let profit = 0;
  let nonSstb = 0;
  let sstb = 0;
  let reasonableCompensationCents: number | undefined;
  for (const review of businesses) {
    const source = scheduleCItemSchema.parse(review.schedule_c_source);
    if (
      identities.has(review.business_reference) ||
      tin(review.owner_ssn) !== tin(ownerSsn) ||
      source.business_reference !== review.business_reference ||
      source.proprietor_recipient !== "T" ||
      source.line_g_material_participation !== true ||
      source.statutory_employee === true || isSeExempt(source) ||
      source.line_32_at_risk === "b" || source.at_risk_simplified ||
      computeCOGS(source) !== 0 || source.home_office_method ||
      source.line_30_home_office || source.home_office_sq_ft ||
      (source.part_v_other_expenses?.length ?? 0) > 0 ||
      (source.line_26_other_employment_credits ?? 0) > 0
    ) {
      throw new Error(
        "Form 8863 earned-support business needs distinct claimant-owned personal-service Schedule C sources and reviewed ordinary costs",
      );
    }
    if (
      review.income_producing_factors ===
        "personal_services_and_material_capital" && businesses.length !== 1
    ) {
      throw new Error(
        "Form 8863 material-capital review needs a single business for the retained half-SE-tax attribution",
      );
    }
    reasonableCompensationCents = reviewedCompensationCents(review) ??
      reasonableCompensationCents;
    identities.add(review.business_reference);
    const totals = new Map<string, number>();
    for (const record of [...review.receipt_sources, ...review.cost_sources]) {
      if (
        records.has(record.source_document_reference) ||
        tin(record.owner_ssn) !== tin(ownerSsn) ||
        record.business_reference !== review.business_reference
      ) {
        throw new Error(
          "Form 8863 business receipts and costs need distinct references and the claimant/business identity",
        );
      }
      records.add(record.source_document_reference);
      totals.set(
        record.schedule_c_field,
        (totals.get(record.schedule_c_field) ?? 0) + record.amount,
      );
    }
    for (
      const key of [
        "line_1_gross_receipts",
        "line_6_other_income",
        ...businessCostFields,
      ] as const
    ) {
      if ((totals.get(key) ?? 0) !== (source[key] ?? 0)) {
        throw new Error(
          "Form 8863 business receipt/cost inventory must reconcile every Schedule C income and ordinary expense field",
        );
      }
    }
    const net = computeNetProfit(source);
    profit += net;
    if (source.qbi_specified_service === true) sstb += net;
    else nonSstb += net;
  }
  let ssWages = 0;
  if (businesses.length) {
    for (const wage of wages) {
      if (wage.box3_ss_wages === undefined || wage.box7_ss_tips === undefined) {
        throw new Error(
          "Form 8863 W-2/business earned-support review needs issued W-2 Social Security wages and tips for Schedule SE",
        );
      }
      ssWages += wage.box3_ss_wages + wage.box7_ss_tips;
    }
  }
  const se = businesses.length
    ? scheduleSELines(
      { net_profit_schedule_c: profit, w2_ss_wages: ssWages },
      CONFIG_BY_YEAR[2025].ssWageBase,
    )
    : undefined;
  const deduction = se?.line13 ?? 0;
  const businessNetAfterDeduction = profit - deduction;
  const businessEarnedCents = reasonableCompensationCents === undefined
    ? businessNetAfterDeduction * 100
    : Math.min(
      reasonableCompensationCents,
      Math.max(0, businessNetAfterDeduction * 30),
    );
  return {
    profit,
    seTax: se?.line12 ?? 0,
    deduction,
    ssWages,
    nonSstb,
    sstb,
    businessNetAfterDeduction,
    reasonableCompensation: reasonableCompensationCents === undefined
      ? undefined
      : reasonableCompensationCents / 100,
    businessEarned: businessEarnedCents / 100,
    earned: wages.reduce((sum, wage) => sum + wage.box1_wages, 0) +
      businessEarnedCents / 100,
  };
}
const sum = (value: unknown): number =>
  Array.isArray(value)
    ? value.reduce((n, v) => n + Number(v), 0)
    : Number(value ?? 0);
export function assertReviewedBusinessIncome(
  businesses: readonly BusinessReview[],
  wages: readonly WageReview[],
  owner: string,
  pending: Readonly<Record<string, unknown>> | undefined,
) {
  const calculated = reviewedBusinessIncome(businesses, wages, owner);
  const copies = pending?.schedule_c === undefined
    ? []
    : scheduleCSchema.parse(pending.schedule_c).schedule_cs;
  if (copies.length !== businesses.length) {
    throw new Error(
      "Form 8863 earned-support review must inventory all retained Schedule C businesses",
    );
  }
  for (const review of businesses) {
    const matching = copies.filter((copy) =>
      copy.business_reference === review.business_reference
    );
    if (
      matching.length !== 1 ||
      JSON.stringify(scheduleCItemSchema.parse(matching[0])) !==
        JSON.stringify(scheduleCItemSchema.parse(review.schedule_c_source))
    ) {
      throw new Error(
        "Form 8863 earned-support business copy must match the retained Schedule C source",
      );
    }
  }
  if (!businesses.length) return calculated;
  const se = pending?.schedule_se as Record<string, unknown> | undefined;
  const schedule = pending?.schedule1 as Record<string, unknown> | undefined;
  const agi = pending?.agi_aggregator as Record<string, unknown> | undefined;
  const qbi = pending?.form8995 as Record<string, unknown> | undefined;
  const schedule2 = pending?.schedule2 as Record<string, unknown> | undefined;
  if (
    !se || !schedule || !agi || !qbi ||
    se.net_profit_schedule_c !== calculated.profit ||
    sum(se.net_profit_schedule_f) !== 0 ||
    se.farm_optional_method_elected === true ||
    sum(se.w2_ss_wages) !== calculated.ssWages ||
    sum(se.unreported_tips_4137) !== 0 || sum(se.wages_8919) !== 0 ||
    sum(schedule.line3_schedule_c) !== calculated.profit ||
    sum(schedule.line15_se_deduction) !== calculated.deduction ||
    sum(agi.line3_schedule_c) !== calculated.profit ||
    sum(agi.line15_se_deduction) !== calculated.deduction ||
    sum(schedule2?.line4_se_tax) !== calculated.seTax ||
    sum(qbi.qbi_from_schedule_c) !== calculated.nonSstb ||
    sum(qbi.sstb_qbi) !== calculated.sstb ||
    sum(qbi.se_tax_deduction) !== calculated.deduction
  ) {
    throw new Error(
      "Form 8863 business earned support must reconcile actual Schedule C, SE, Schedule 1/2, AGI and QBI source amounts",
    );
  }
  return calculated;
}
