import { z } from "zod";

const reference = z.string().trim().min(1);
const money = z.number().finite().nonnegative().multipleOf(0.01);
const date2025 = z.string().date().refine((d) => d.startsWith("2025-"));
const state = z.enum([
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "DC",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
]);

export enum AbleBusinessKind {
  ScheduleC = "schedule_c",
  ScheduleF = "schedule_f",
}
export const ableSelfEmploymentSchema = z.object({
  compensation_review_ref: reference,
  complete_sole_proprietor_inventory_confirmed: z.literal(true),
  no_other_self_employment_or_excluded_income_confirmed: z.literal(true),
  no_self_employed_retirement_deduction_confirmed: z.literal(true),
  deductible_se_tax: money,
  businesses: z.array(
    z.object({
      business_reference: reference,
      income_record_ref: reference,
      owner_ssn: z.string().regex(/^\d{9}$/),
      kind: z.nativeEnum(AbleBusinessKind),
      net_profit: z.number().finite().multipleOf(0.01),
      personal_services_material_income_factor_confirmed: z.literal(true),
    }).strict(),
  ).min(1),
}).strict();

/** Reviewed compensation and a complete, dated residence/plan review. */
const employmentFactsSchema = z.object({
  eligibility_review_ref: reference,
  no_401a_403a_defined_contribution_403b_or_457b_contributions_confirmed: z
    .literal(true),
  only_wage_compensation_confirmed: z.literal(true).optional(),
  self_employment: ableSelfEmploymentSchema.optional(),
  complete_w2_inventory_confirmed: z.literal(true),
  wages: z.array(
    z.object({
      source_document_ref: reference,
      employer_plan_review_ref: reference,
      employee_ssn: z.string().regex(/^\d{9}$/),
      employer_ein: z.string().regex(/^\d{9}$/),
      box1_wages: money.positive(),
      wages_for_current_services_confirmed: z.literal(true),
    }).strict(),
  ),
  residence_periods: z.array(
    z.object({
      source_document_ref: reference,
      state,
      from: date2025,
      through: date2025,
    }).strict(),
  ).min(1),
}).strict();

export const ableEmploymentReviewSchema = employmentFactsSchema.superRefine(
  (review, context) => {
    if (
      (review.only_wage_compensation_confirmed !== undefined) ===
        (review.self_employment !== undefined) ||
      (!review.self_employment && review.wages.length === 0)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "ABLE compensation needs either wage-only evidence or a complete self-employment review",
      });
    }
    const periods = [...review.residence_periods].sort((a, b) =>
      a.from.localeCompare(b.from)
    );
    const day = 86400000;
    if (
      periods[0]?.from !== "2025-01-01" ||
      periods.at(-1)?.through !== "2025-12-31" ||
      periods.some((p, i) =>
        p.from > p.through || (i > 0 &&
          Date.parse(p.from) !== Date.parse(periods[i - 1].through) + day)
      )
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "ABLE employment review needs a complete nonoverlapping 2025 residence calendar",
      });
    }
    const days = residenceDays(review);
    const longest = Math.max(...Object.values(days));
    if (Object.values(days).filter((count) => count === longest).length !== 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ABLE employment review needs one longest-residence state",
      });
    }
    const employers = review.wages.map((w) => w.employer_ein);
    if (new Set(employers).size !== employers.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ABLE employment review needs distinct employer wage records",
      });
    }
  },
);

function residenceDays(
  review: z.infer<typeof employmentFactsSchema>,
): Partial<Record<z.infer<typeof state>, number>> {
  return review.residence_periods.reduce((totals, p) => ({
    ...totals,
    [p.state]: (totals[p.state] ?? 0) +
      (Date.parse(p.through) - Date.parse(p.from)) / 86400000 + 1,
  }), {} as Partial<Record<z.infer<typeof state>, number>>);
}

export function ableEmploymentLimit(
  review: z.infer<typeof ableEmploymentReviewSchema>,
): number {
  const days = residenceDays(review);
  const longest = Object.entries(days).sort((a, b) => b[1] - a[1])[0]?.[0];
  // 2025 Form1099-QA instructions and 26 CFR1.529A-2(g)(2)(ii)(B): 2024 guidelines.
  const poverty = longest === undefined
    ? 0
    : longest === "AK"
    ? 18810
    : longest === "HI"
    ? 17310
    : 15060;
  const wageCents = review.wages.reduce(
    (sum, w) => sum + Math.round(w.box1_wages * 100),
    0,
  );
  const businessCents = review.self_employment
    ? Math.max(
      0,
      review.self_employment.businesses.reduce(
        (sum, b) => sum + Math.round(b.net_profit * 100),
        0,
      ) - Math.round(review.self_employment.deductible_se_tax * 100),
    )
    : 0;
  return Math.min(wageCents + businessCents, poverty * 100) / 100;
}
