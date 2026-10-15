import { z } from "zod";
import { roundWholeDollars } from "../../whole-dollars.ts";

const money = z.number().finite().nonnegative();
const reference = z.string().trim().min(1);
const ownerSchema = z.enum(["taxpayer", "spouse"]);
export type CareOwner2026 = z.infer<typeof ownerSchema>;
const monthlyOwnerSchema = z.object({
  record_reference: reference,
  business_allocation_review: z.object({
    record_reference: reference,
    actual_months_earned_and_se_deduction_allocation_reviewed: z.literal(true),
  }).strict().optional(),
  school_meets_full_time_student_definition: z.boolean(),
  enrollment_record_reference: reference.optional(),
  incapacity_record_reference: reference.optional(),
  months: z.array(
    z.object({
      month: z.number().int().min(1).max(12),
      w2_wages: money,
      business: z.object({
        regular_net_profit: z.number().finite(),
        statutory_gross_income: money,
        se_deduction: money,
      }).strict().optional(),
      nontaxable_combat_pay: money,
      // Allocation of the return's calculated taxable care benefits to the
      // months earned. It must reconcile to the source-derived owner and total.
      taxable_care_benefits: money.int(),
      full_time_student: z.boolean(),
      incapable_of_self_care: z.boolean(),
    }).strict(),
  ).length(12),
}).strict();
export const careEarnedIncomeReview2026Schema = z.discriminatedUnion("method", [
  z.object({
    method: z.literal("annual_w2"),
    no_student_or_disability_deemed_income: z.literal(true),
  }).strict(),
  z.object({
    method: z.literal("annual_business"),
    no_student_or_disability_deemed_income: z.literal(true),
  }).strict(),
  z.object({
    method: z.literal("monthly"),
    taxpayer: monthlyOwnerSchema,
    spouse: monthlyOwnerSchema.optional(),
    both_eligible_month_choices: z.array(
      z.object({
        month: z.number().int().min(1).max(12),
        owner: ownerSchema,
      }).strict(),
    ).max(12),
  }).strict(),
]);
export const careCombatElections2026Schema = z.object({
  benefits: z.object({ taxpayer: z.boolean(), spouse: z.boolean() }).strict(),
  credit: z.object({ taxpayer: z.boolean(), spouse: z.boolean() }).strict(),
}).strict();
export type CareEarnedIncomeReview2026 = z.input<
  typeof careEarnedIncomeReview2026Schema
>;
export type CareCombatElections2026 = z.input<
  typeof careCombatElections2026Schema
>;
export type CareAnnualEarnings2026 = Record<CareOwner2026, {
  wages: number;
  combat: number;
  taxable_care: number;
  business?: {
    regular_net_profit: number;
    statutory_gross_income: number;
    se_deduction: number;
  };
}>;

/** Form 2441 instructions, lines 4/5 and 18/19 (2026 draft pp.4/6).
 * Actual income is compared with the monthly floor before adding the months.
 * Deemed income and elected combat pay never alter Form 1040 income or EIC.
 */
export function calculateCareEarnedIncome2026(
  raw: CareEarnedIncomeReview2026,
  elections: CareCombatElections2026,
  annual: CareAnnualEarnings2026,
  qualifyingPeople: number,
  joint: boolean,
  stage: "benefits" | "credit",
) {
  const review = careEarnedIncomeReview2026Schema.parse(raw);
  const elected = careCombatElections2026Schema.parse(elections)[stage];
  if (!Number.isInteger(qualifyingPeople) || qualifyingPeople < 0) {
    throw new Error(
      "Care earned income needs a nonnegative qualifying-person count",
    );
  }
  if (!joint && (elections.benefits.spouse || elections.credit.spouse)) {
    throw new Error("Spouse care combat election needs a joint return");
  }
  const owners: CareOwner2026[] = joint ? ["taxpayer", "spouse"] : ["taxpayer"];
  const result = { taxpayer: 0, spouse: 0 };
  const combat = { taxpayer: 0, spouse: 0 };
  for (const owner of owners) {
    combat[owner] = elected[owner] ? annual[owner].combat : 0;
  }
  const hasBusiness = owners.some((owner) =>
    annual[owner].business !== undefined
  );
  if (
    (review.method === "annual_w2" && hasBusiness) ||
    (review.method === "annual_business" && !hasBusiness)
  ) {
    throw new Error(
      "Care annual income method must match the business sources",
    );
  }
  if (review.method !== "monthly") {
    for (const owner of owners) {
      const business = annual[owner].business;
      result[owner] = Math.max(
        0,
        roundWholeDollars(
          annual[owner].wages + combat[owner] +
            (business
              ? business.regular_net_profit + business.statutory_gross_income -
                business.se_deduction
              : 0) +
            (stage === "credit" ? annual[owner].taxable_care : 0),
        ),
      );
    }
    return {
      ...result,
      deemed_income_used: false,
      elected_combat: combat,
      monthly: null,
    };
  }
  if (joint !== !!review.spouse) {
    throw new Error(
      "Monthly care ledger needs exactly the return's taxpayer and spouse",
    );
  }
  const minimum = qualifyingPeople === 0
    ? 0
    : qualifyingPeople >= 2
    ? 500
    : 250;
  const rows = new Map<
    CareOwner2026,
    { month: number; actual: number; eligible: boolean }[]
  >();
  for (const owner of owners) {
    const source = review[owner]!;
    const months = [...source.months].sort((a, b) => a.month - b.month);
    if (months.some((m, i) => m.month !== i + 1)) {
      throw new Error(
        "Care ledger must contain each calendar month exactly once",
      );
    }
    const studentMonths = months.filter((m) => m.full_time_student).length;
    if (studentMonths && !source.enrollment_record_reference) {
      throw new Error("Student care income needs enrollment records");
    }
    if (
      months.some((m) => m.incapable_of_self_care) &&
      !source.incapacity_record_reference
    ) throw new Error("Disability care income needs incapacity records");
    const studentQualifies = source.school_meets_full_time_student_definition &&
      studentMonths >= 5;
    const wages = months.reduce((n, m) => n + m.w2_wages, 0);
    const pay = months.reduce((n, m) => n + m.nontaxable_combat_pay, 0);
    const taxable = months.reduce((n, m) => n + m.taxable_care_benefits, 0);
    const business = annual[owner].business;
    if (business) {
      if (
        !source.business_allocation_review || months.some((m) => !m.business)
      ) {
        throw new Error(
          "Monthly care business income needs all twelve months and an allocation review",
        );
      }
      for (
        const key of [
          "regular_net_profit",
          "statutory_gross_income",
          "se_deduction",
        ] as const
      ) {
        const total = months.reduce((n, m) => n + m.business![key], 0);
        if (Math.abs(total - business[key]) > .000001) {
          throw new Error(
            "Monthly care business amounts disagree with the owner's Schedule C/SE sources",
          );
        }
      }
    } else if (
      source.business_allocation_review || months.some((m) => m.business)
    ) {
      throw new Error(
        "Monthly care business allocations need actual business sources",
      );
    }
    if (
      Math.abs(wages - annual[owner].wages) > .000001 ||
      Math.abs(pay - annual[owner].combat) > .000001
    ) {
      throw new Error(
        "Monthly care wages/combat pay disagree with issued W-2 sources",
      );
    }
    if (stage === "credit" && taxable !== annual[owner].taxable_care) {
      throw new Error(
        "Monthly taxable care benefits disagree with calculated benefits and owner",
      );
    }
    rows.set(
      owner,
      months.map((m) => ({
        month: m.month,
        actual: m.w2_wages + (elected[owner] ? m.nontaxable_combat_pay : 0) +
          (m.business
            ? m.business.regular_net_profit +
              m.business.statutory_gross_income - m.business.se_deduction
            : 0) +
          (stage === "credit" ? m.taxable_care_benefits : 0),
        eligible: qualifyingPeople > 0 && (m.incapable_of_self_care ||
          (studentQualifies && m.full_time_student)),
      })),
    );
  }
  const choices = new Map<number, CareOwner2026>();
  for (const c of review.both_eligible_month_choices) {
    if (choices.has(c.month)) {
      throw new Error("Duplicate choice for a joint deemed-income month");
    }
    choices.set(c.month, c.owner);
  }
  let deemedUsed = false;
  const monthly = Array.from({ length: 12 }, (_, i) => {
    const t = rows.get("taxpayer")![i], s = rows.get("spouse")?.[i];
    let chosen: CareOwner2026 | undefined;
    if (t.eligible && s?.eligible) {
      chosen = choices.get(i + 1);
      if (!chosen) {
        throw new Error(
          "Both spouses qualify for deemed income; choose one for each overlapping month",
        );
      }
    } else {
      if (choices.has(i + 1)) {
        throw new Error(
          "Joint deemed-income choice refers to a month without two eligible spouses",
        );
      }
      chosen = t.eligible ? "taxpayer" : s?.eligible ? "spouse" : undefined;
    }
    const taxpayer = chosen === "taxpayer"
      ? Math.max(minimum, t.actual)
      : t.actual;
    const spouse = chosen === "spouse"
      ? Math.max(minimum, s!.actual)
      : s?.actual ?? 0;
    if (taxpayer > t.actual || spouse > (s?.actual ?? 0)) deemedUsed = true;
    result.taxpayer += taxpayer;
    result.spouse += spouse;
    return {
      month: i + 1,
      taxpayer_actual: t.actual,
      spouse_actual: s?.actual ?? 0,
      taxpayer,
      spouse,
      deemed_owner: chosen ?? null,
    };
  });
  return {
    taxpayer: Math.max(0, roundWholeDollars(result.taxpayer)),
    spouse: Math.max(0, roundWholeDollars(result.spouse)),
    deemed_income_used: deemedUsed,
    elected_combat: combat,
    monthly,
  };
}
