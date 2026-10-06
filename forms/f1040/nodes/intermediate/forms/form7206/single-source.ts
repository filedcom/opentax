import { z } from "zod";
import { TS } from "../../../types.ts";

// ─── Schema ───────────────────────────────────────────────────────────────────

export const money = z.number().finite().nonnegative();

const premiumMonthSchema = z.object({
  month: z.number().int().min(1).max(12),
  paid_premium: money,
  policy_source_reference: z.string().trim().min(1),
  payment_source_reference: z.string().trim().min(1),
  // Each month identifies the person covered by this one policy.
  covered_person: z.enum(["taxpayer", "spouse"]),
  eligible_for_subsidized_employer_plan: z.boolean(),
  employer_plan_review_reference: z.string().trim().min(1),
  marketplace_policy: z.boolean(),
  long_term_care_policy: z.boolean(),
  public_safety_officer_excluded_amount: money,
  public_safety_officer_exclusion_source_reference: z.string().trim().min(1)
    .optional(),
}).strict();

export const singleScheduleCPlanSchema = z.object({
  business_reference: z.string().trim().min(1),
  plan_identifier: z.string().trim().min(1),
  recipient: z.nativeEnum(TS),
  taxpayer_identity: z.object({
    name: z.string().trim().min(1),
    ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/),
  }).strict(),
  spouse_identity: z.object({
    name: z.string().trim().min(1),
    ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/),
  }).strict().optional(),
  premium_months: z.array(premiumMonthSchema).length(12).refine(
    (months) => months.every((record, index) => record.month === index + 1),
    "Form 7206 needs January through December premium records in order",
  ),
  schedule_c_line31_net_profit: money.positive(),
  schedule1_line15_se_tax_deduction: money,
  schedule1_line16_retirement_deduction: money,
  plan_established_under_business: z.literal(true),
  sole_positive_business_verified: z.literal(true),
  no_form2555: z.literal(true),
  no_schedule_se_optional_method: z.literal(true),
  no_other_earned_income: z.literal(true),
}).strict().superRefine((plan, ctx) => {
  const coversSpouse = plan.premium_months.some((month) =>
    month.covered_person === "spouse"
  );
  if (
    (coversSpouse || plan.recipient === TS.S
      ? !plan.spouse_identity ||
        plan.spouse_identity.ssn.replaceAll("-", "") ===
          plan.taxpayer_identity.ssn.replaceAll("-", "")
      : plan.spouse_identity !== undefined)
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["premium_months"],
      message:
        "Form 7206 one-plan coverage needs an identified spouse for each spouse-covered month",
    });
  }
});

export type SingleScheduleCPlan = z.infer<typeof singleScheduleCPlanSchema>;

export const form7206LinesSchema = z.object({
  line1: money,
  line2: money,
  line3: money,
  line4: money,
  line5: money,
  line6: z.number().min(0).max(1),
  line7: money,
  line8: money,
  line9: money,
  line10: money,
  line12: money,
  line13: money,
  line14: money,
});

export type Form7206Lines = z.infer<typeof form7206LinesSchema>;

// ─── Pure Helpers ─────────────────────────────────────────────────────────────

export function calculateSingleScheduleCForm7206(
  raw: SingleScheduleCPlan,
): Form7206Lines {
  const source = singleScheduleCPlanSchema.parse(raw);
  const totalPublicSafetyExclusion = source.premium_months.reduce(
    (sum, month) => sum + month.public_safety_officer_excluded_amount,
    0,
  );
  if (totalPublicSafetyExclusion > 3_000) {
    throw new Error(
      "Form 7206 public-safety-officer exclusion exceeds the annual $3,000 limit",
    );
  }
  const eligiblePremiums = source.premium_months.reduce((sum, month) => {
    if (month.marketplace_policy || month.long_term_care_policy) {
      throw new Error(
        "Form 7206 bounded one-plan calculation excludes Marketplace and long-term-care premiums",
      );
    }
    if (month.public_safety_officer_excluded_amount > month.paid_premium) {
      throw new Error(
        "Form 7206 public-safety-officer exclusion exceeds the paid monthly premium",
      );
    }
    if (
      month.public_safety_officer_excluded_amount > 0 &&
      !month.public_safety_officer_exclusion_source_reference
    ) {
      throw new Error(
        "Form 7206 public-safety-officer exclusion needs a source reference",
      );
    }
    return sum +
      (month.eligible_for_subsidized_employer_plan
        ? 0
        : month.paid_premium - month.public_safety_officer_excluded_amount);
  }, 0);
  if (
    eligiblePremiums === 0 &&
    !source.premium_months.every((month) =>
      month.eligible_for_subsidized_employer_plan
    )
  ) {
    throw new Error(
      "Form 7206 zero eligible premiums need a reviewed employer-plan exclusion for every month",
    );
  }
  const profit = source.schedule_c_line31_net_profit;
  const seTax = source.schedule1_line15_se_tax_deduction;
  const retirement = source.schedule1_line16_retirement_deduction;
  if (seTax > profit || retirement > profit - seTax) {
    throw new Error(
      "Form 7206 Schedule 1 lines 15-16 exceed the establishing business income",
    );
  }
  const line10 = profit - seTax - retirement;
  return form7206LinesSchema.parse({
    line1: eligiblePremiums,
    line2: 0,
    line3: eligiblePremiums,
    line4: profit,
    line5: profit,
    line6: 1,
    line7: seTax,
    line8: profit - seTax,
    line9: retirement,
    line10,
    line12: 0,
    line13: line10,
    line14: Math.min(eligiblePremiums, line10),
  });
}
