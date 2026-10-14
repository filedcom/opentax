import { z } from "zod";
import { CONFIG_BY_YEAR } from "../../../../../config/index.ts";
import { FilingStatus } from "../../../../../types.ts";

export const section179EligibilitySchema = z.object({
  eligible: z.boolean(),
  eligibility_review_reference: z.string().trim().min(1),
}).strict();
export const section179ElectionSchema = z.object({
  proprietor_ssn: z.string().regex(/^\d{9}$/),
  filing_status: z.nativeEnum(FilingStatus),
  taxpayer_active_business_income: z.number().int().nonnegative(),
  active_business_income_review_reference: z.string().trim().min(1),
  taxpayer_authorized_confirmed: z.literal(true),
  original_return_election_confirmed: z.literal(true),
  election_review_reference: z.string().trim().min(1),
  no_prior_year_carryover: z.literal(true),
  prior_year_carryover_review_reference: z.string().trim().min(1),
  no_pass_through_section179: z.literal(true),
  no_special_dollar_limit_property: z.literal(true),
  reviewed_by: z.string().trim().min(1),
  reviewed_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).strict();
const assetFactsSchema = z.object({
  proprietor_ssn: z.string(),
  asset_description: z.string(),
  cost: z.number(),
  section179_deduction: z.number(),
  section179_eligibility: section179EligibilitySchema.optional(),
});
export const section179SummarySchema = z.object({
  line1_maximum_dollar_limitation: z.number().int().nonnegative(),
  line2_total_cost: z.number().int().nonnegative(),
  line3_threshold_cost: z.number().int().nonnegative(),
  line4_reduction: z.number().int().nonnegative(),
  line5_dollar_limitation: z.number().int().nonnegative(),
  properties: z.array(z.object({
    description: z.string(),
    cost: z.number().int().positive(),
    elected: z.number().int().positive(),
  })).min(1),
  line8_total_elected_cost: z.number().int().nonnegative(),
  line9_tentative_deduction: z.number().int().nonnegative(),
  line10_prior_carryover: z.literal(0),
  line11_business_income_limitation: z.number().int().nonnegative(),
  line12_section179_expense_deduction: z.number().int().nonnegative(),
  line13_next_year_carryover: z.literal(0),
});

export function calculateInventorySection179(
  assets: readonly z.infer<typeof assetFactsSchema>[],
  election?: z.infer<typeof section179ElectionSchema>,
) {
  const elected = assets.reduce((sum, a) => sum + a.section179_deduction, 0);
  if (!election) {
    if (elected > 0 || assets.some((a) => a.section179_eligibility)) {
      throw new Error(
        "Section 179 inventory needs its complete taxpayer election review",
      );
    }
    return undefined;
  }
  const date = new Date(`${election.reviewed_on}T00:00:00Z`);
  if (
    elected <= 0 || election.filing_status === FilingStatus.MFS ||
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== election.reviewed_on ||
    assets.some((a) =>
      a.proprietor_ssn !== election.proprietor_ssn ||
      !a.section179_eligibility || a.section179_deduction > a.cost ||
      (a.section179_deduction > 0 && !a.section179_eligibility.eligible)
    )
  ) {
    throw new Error(
      "Section 179 needs eligible owned property, complete eligibility review and a real election date; MFS allocation remains guarded",
    );
  }
  const cost = assets.filter((a) => a.section179_eligibility?.eligible).reduce(
    (sum, a) => sum + a.cost,
    0,
  );
  const cfg = CONFIG_BY_YEAR[2025];
  const maximum = Math.min(cost, cfg.section179Limit);
  const reduction = Math.max(0, cost - cfg.section179PhaseoutThreshold);
  const limitation = Math.max(0, maximum - reduction);
  const income = Math.min(election.taxpayer_active_business_income, limitation);
  if (elected > limitation || elected > income) {
    throw new Error(
      "Section 179 inventory allocation exceeds the taxpayer dollar or active-income limit; disallowed carryover allocation needs a separate source route",
    );
  }
  return section179SummarySchema.parse({
    line1_maximum_dollar_limitation: maximum,
    line2_total_cost: cost,
    line3_threshold_cost: cfg.section179PhaseoutThreshold,
    line4_reduction: reduction,
    line5_dollar_limitation: limitation,
    properties: assets.filter((a) => a.section179_deduction > 0).map((a) => ({
      description: a.asset_description,
      cost: a.cost,
      elected: a.section179_deduction,
    })),
    line8_total_elected_cost: elected,
    line9_tentative_deduction: elected,
    line10_prior_carryover: 0,
    line11_business_income_limitation: income,
    line12_section179_expense_deduction: elected,
    line13_next_year_carryover: 0,
  });
}
