import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { scheduleA as schedule_a } from "../schedule_a/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import { agi_aggregator } from "../../intermediate/aggregation/agi_aggregator/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// FOR dropdown: destination schedule/form
// A = Schedule A, C = Schedule C, E = Schedule E. Positive C/E box 1 and
// Form 8829 claims fail until business/property allocation facts are modeled.
export enum ForRouting {
  A = "A",
  C = "C",
  E = "E",
  F8829 = "8829",
}

const constructionRefinanceReviewSchema = z.object({
  construction_loan_record_reference: z.string().trim().min(1),
  closing_disclosure_reference: z.string().trim().min(1),
  original_construction_debt: z.number().finite().positive(),
  refinanced_principal: z.number().finite().positive(),
  loan_term_months: z.number().int().min(1).max(600),
  monthly_payment_records: z.array(z.object({
    month: z.number().int().min(1).max(12),
    document_reference: z.string().trim().min(1),
  }))
    .min(1).max(12),
  principal_residence_when_complete_verified: z.literal(true),
  points_paid_directly_verified: z.literal(true),
  reportable_points_within_acquisition_limit_verified: z.literal(true),
});

export const mortgageLimitReviewSchema = z.object({
  table1_workpaper_reference: z.string().trim().min(1),
  all_qualified_home_mortgages_included_verified: z.literal(true),
  all_post_2017_acquisition_debt_verified: z.literal(true),
  single_filing_status_verified: z.literal(true),
  loans: z.array(
    z.object({
      source_document_reference: z.string().trim().min(1),
      monthly_balance_records: z.array(
        z.object({
          month: z.number().int().min(1).max(12),
          closing_balance: z.number().finite().positive(),
          lender_statement_reference: z.string().trim().min(1),
        }).strict(),
      ).length(12),
    }).strict(),
  ).length(2),
}).strict();

export const itemSchema = z.object({
  // Required per context.md
  box1_mortgage_interest: z.number().nonnegative(),
  for_routing: z.nativeEnum(ForRouting).optional(),
  // Informational / routing helpers
  lender_name: z.string().optional(),
  recipient_tin: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/).optional(),
  source_document_reference: z.string().trim().min(1).optional(),
  box2_outstanding_principal: z.number().nonnegative().optional(),
  box3_origination_date: z.string().optional(),
  // Reviewed Pub. 936 amount before any separate Form 8396 credit reduction.
  box1_current_year_deductible_interest: z.number().nonnegative().optional(),
  box1_deduction_workpaper_reference: z.string().trim().min(1).optional(),
  box4_refund_overpaid: z.number().nonnegative().optional(),
  // Form 1098 box 4 is a recovery of earlier-year interest, not a reduction
  // of the current-year box 1 deduction. A Pub. 525 tax-benefit workpaper
  // determines any income included in 2025.
  box4_prior_year_refund: z.boolean().optional(),
  box4_taxable_recovery_verified_amount: z.number().nonnegative().optional(),
  box4_recovery_workpaper_reference: z.string().trim().min(1).optional(),
  // box5: MIP — NOT deductible for TY2025. Collected for informational purposes only.
  box5_mip: z.number().nonnegative().optional(),
  box6_points_paid: z.number().finite().nonnegative().optional(),
  // Box 6 is a source amount, not necessarily the current-year deduction.
  // The reviewed Pub. 936 workpaper determines the deductible purchase portion.
  box6_current_year_deductible_points: z.number().finite().nonnegative()
    .optional(),
  box6_deduction_workpaper_reference: z.string().trim().min(1).optional(),
  // The 2025 Form 1098 box 6 refinance exception covers qualifying
  // construction-debt refinancing. Its points are amortized over this loan.
  box6_construction_refinance_review: constructionRefinanceReviewSchema
    .optional(),
  // box7–box11: informational only, no tax routing
  box7_property_address_same: z.boolean().optional(),
  box8_property_address: z.string().optional(),
  box9_number_of_properties: z.number().nonnegative().optional(),
  // box10_other is a STRING (lender free-text) — NOT a dollar amount, NOT auto-routed
  box10_other: z.string().optional(),
  box11_acquisition_date: z.string().optional(),
  // Drake-specific: no tax effect for TY2025
  qualified_premiums_checkbox: z.boolean().optional(),
  // DEDM override: when true, box1 from this 1098 entry is ignored (DEDM screen provides deductible amount)
  dedm_override: z.boolean().optional(),
  // Binding contract exception: pre-2017 $1M limit applies even if box3 >= 12/16/2017
  binding_contract_exception: z.boolean().optional(),
  // Ordinary refinancing points do not belong in Form 1098 box 6.
  refinance: z.boolean().optional(),
}).superRefine((item, ctx) => {
  const reportedInterest = item.box1_mortgage_interest;
  const deductibleInterest = item.box1_current_year_deductible_interest;
  const personalRoute = (item.for_routing ?? ForRouting.A) === ForRouting.A;
  if (
    reportedInterest > 0 &&
    (item.for_routing === ForRouting.C || item.for_routing === ForRouting.E)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["box1_mortgage_interest"],
      message:
        "Form 1098 business or rental box 1 needs a business/property-linked current-year interest and allocation workpaper",
    });
  }
  if (item.dedm_override === true && reportedInterest > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["dedm_override"],
      message:
        "Form 1098 DEDM override has no linked deductible-interest source and cannot silently suppress box 1",
    });
  }
  if (reportedInterest > 0 && personalRoute) {
    if (
      deductibleInterest === undefined || deductibleInterest > reportedInterest
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["box1_current_year_deductible_interest"],
        message:
          "Form 1098 box 1 needs reviewed TY2025 Schedule A deductible interest from zero through reported interest",
      });
    }
    if (!item.box1_deduction_workpaper_reference) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["box1_deduction_workpaper_reference"],
        message:
          "Form 1098 box 1 needs a reviewed Pub. 936 deduction workpaper reference",
      });
    }
  } else if ((deductibleInterest ?? 0) > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["box1_current_year_deductible_interest"],
      message:
        "Form 1098 Schedule A box 1 deduction needs positive box 1 interest and personal routing",
    });
  }
  const refund = item.box4_refund_overpaid ?? 0;
  const taxableRecovery = item.box4_taxable_recovery_verified_amount;
  if (refund > 0) {
    if (
      !item.lender_name?.trim() || !item.recipient_tin ||
      !item.source_document_reference
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["source_document_reference"],
        message:
          "Form 1098 box 4 needs lender, recipient TIN, and distinct payer-copy reference",
      });
    }
    if ((item.for_routing ?? ForRouting.A) !== ForRouting.A) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["box4_refund_overpaid"],
        message:
          "Form 1098 box 4 business or rental recovery needs its own prior-year tax-benefit route",
      });
    }
    if (item.box4_prior_year_refund !== true) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["box4_prior_year_refund"],
        message:
          "Form 1098 box 4 reports an earlier-year interest refund; same-year netting is unsupported",
      });
    }
    if (taxableRecovery === undefined || taxableRecovery > refund) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["box4_taxable_recovery_verified_amount"],
        message:
          "Form 1098 box 4 needs a reviewed taxable recovery amount from zero through the refund",
      });
    }
    if (!item.box4_recovery_workpaper_reference) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["box4_recovery_workpaper_reference"],
        message:
          "Form 1098 box 4 needs a reviewed Pub. 525 prior-year tax-benefit workpaper reference",
      });
    }
  } else if ((taxableRecovery ?? 0) > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["box4_taxable_recovery_verified_amount"],
      message:
        "Form 1098 box 4 taxable recovery cannot exceed zero reported refund",
    });
  }
  const points = item.box6_points_paid ?? 0;
  const deductible = item.box6_current_year_deductible_points;
  const construction = item.box6_construction_refinance_review;
  if (points === 0) {
    if ((deductible ?? 0) > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["box6_current_year_deductible_points"],
        message: "Form 1098 box 6 deduction cannot exceed zero reported points",
      });
    }
    if (construction) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["box6_construction_refinance_review"],
        message:
          "Form 1098 construction-refinance review needs positive box 6 points",
      });
    }
    return;
  }
  if (
    (item.for_routing ?? ForRouting.A) !== ForRouting.A ||
    (item.refinance === true && !construction) ||
    item.dedm_override === true
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["box6_points_paid"],
      message:
        "Form 1098 box 6 points need a personal purchase or reviewed construction-refinance route; ordinary refinance, business, rental, and DEDM allocations are unsupported",
    });
  }
  if (construction && item.refinance !== true) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["box6_construction_refinance_review"],
      message:
        "Form 1098 construction-refinance review requires the refinance flag",
    });
  }
  if (construction) {
    const records = construction.monthly_payment_records;
    const months = records.length;
    const monthNumbers = records.map((record) => record.month);
    const references = records.map((record) => record.document_reference);
    const expectedMonths = Array.from(
      { length: months },
      (_, index) => 13 - months + index,
    );
    if (
      construction.refinanced_principal >
        construction.original_construction_debt ||
      monthNumbers.sort((a, b) => a - b).some((month, index) =>
        month !== expectedMonths[index]
      ) ||
      new Set(references).size !== references.length ||
      construction.loan_term_months < months
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["box6_construction_refinance_review"],
        message:
          "Form 1098 construction-refinance points need construction debt covering the new loan and one distinct payment record per 2025 amortization month",
      });
    }
    if (deductible !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["box6_current_year_deductible_points"],
        message:
          "Form 1098 construction-refinance deduction is calculated from the loan term and 2025 payment records",
      });
    }
  } else if (deductible === undefined || deductible > points) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["box6_current_year_deductible_points"],
      message:
        "Form 1098 box 6 needs a current-year deductible amount from zero through the reported points",
    });
  }
  if (!item.box6_deduction_workpaper_reference) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["box6_deduction_workpaper_reference"],
      message:
        "Form 1098 box 6 needs a reviewed Pub. 936 deduction workpaper reference",
    });
  }
  if (
    !item.lender_name?.trim() || !item.recipient_tin ||
    !item.source_document_reference
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["source_document_reference"],
      message:
        "Form 1098 box 6 needs lender, recipient TIN, and distinct payer-copy reference",
    });
  }
});

export const inputSchema = z.object({
  f1098s: z.array(itemSchema),
  mortgage_limit_review: mortgageLimitReviewSchema.optional(),
}).superRefine(({ f1098s, mortgage_limit_review }, ctx) => {
  const sources = new Set<string>();
  f1098s.forEach((item, index) => {
    const reference = item.source_document_reference?.trim();
    if (!reference) return;
    if (sources.has(reference)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["f1098s", index, "source_document_reference"],
        message: "The same payer-issued Form 1098 cannot be entered twice",
      });
    }
    sources.add(reference);
  });
  if (!mortgage_limit_review) return;
  const loans = mortgage_limit_review.loans;
  const sameSources = f1098s.length === 2 && loans.every((loan) =>
    f1098s.some((item) =>
      item.source_document_reference === loan.source_document_reference
    )
  ) && new Set(loans.map((loan) =>
        loan.source_document_reference
      )).size === 2;
  const sourceEligible = f1098s.every((item) => {
    const date = /^([0-9]{2})\/([0-9]{2})\/([0-9]{4})$/.exec(
      item.box3_origination_date ?? "",
    );
    if (!date) return false;
    const month = Number(date[1]);
    const day = Number(date[2]);
    const year = Number(date[3]);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    const validDate = parsed.getUTCFullYear() === year &&
      parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
    return validDate && parsed >= new Date("2017-12-16T00:00:00Z") &&
      parsed < new Date("2025-01-01T00:00:00Z") &&
      (item.for_routing ?? ForRouting.A) === ForRouting.A &&
      (item.box1_mortgage_interest ?? 0) > 0 &&
      (item.box6_points_paid ?? 0) === 0 &&
      item.refinance !== true && item.binding_contract_exception !== true &&
      item.dedm_override !== true && !!item.lender_name?.trim() &&
      !!item.recipient_tin && !!item.source_document_reference;
  });
  const recordsValid = loans.every((loan) => {
    const months = loan.monthly_balance_records.map((row) => row.month)
      .sort((a, b) => a - b);
    return months.every((month, index) => month === index + 1) &&
      new Set(
          loan.monthly_balance_records.map((row) =>
            row.lender_statement_reference
          ),
        ).size === 12;
  });
  const averageTotal = loans.reduce(
    (sum, loan) =>
      sum + loan.monthly_balance_records.reduce(
          (loanSum, row) => loanSum + row.closing_balance,
          0,
        ) / 12,
    0,
  );
  const ratio = Math.round(750_000 / averageTotal * 1_000) / 1_000;
  const expectedInterest = Math.round(
    f1098s.reduce((sum, item) => sum + item.box1_mortgage_interest, 0) * ratio,
  );
  const claimedInterest = f1098s.reduce(
    (sum, item) => sum + (item.box1_current_year_deductible_interest ?? 0),
    0,
  );
  if (
    !sameSources || !sourceEligible || !recordsValid ||
    averageTotal <= 750_000 || claimedInterest !== expectedInterest
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["mortgage_limit_review"],
      message:
        "Two full-year post-2017 acquisition loans need 12 distinct monthly lender balances each and one Pub. 936 Table 1 allocation matching the sourced Schedule A interest",
    });
  }
});

type F1098Item = z.infer<typeof itemSchema>;
type F1098Items = F1098Item[];

function deductibleBox6Points(item: F1098Item): number {
  const review = item.box6_construction_refinance_review;
  if (!review) return item.box6_current_year_deductible_points ?? 0;
  const months = review.monthly_payment_records.length;
  return Math.round(
    (item.box6_points_paid ?? 0) * months /
      review.loan_term_months,
  );
}

export function assertForm1098MortgageLimitSources(
  source: unknown,
  recipientTins: readonly string[],
  singleFiler: boolean,
  filedLine8a: number,
  filedLine8b: number,
  filedLine8c: number,
  hasUnreportedRefinancePoints: boolean,
  hasMortgageInterestCredit: boolean,
): void {
  if (source === undefined) return;
  const parsed = inputSchema.parse(source);
  if (!parsed.mortgage_limit_review) return;
  const allowed = new Set(recipientTins.map((tin) => tin.replaceAll("-", "")));
  const expectedLine8a = parsed.f1098s.reduce(
    (sum, item) => sum + (item.box1_current_year_deductible_interest ?? 0),
    0,
  );
  if (
    !singleFiler ||
    parsed.f1098s.some((item) =>
      !item.recipient_tin ||
      !allowed.has(item.recipient_tin.replaceAll("-", ""))
    ) ||
    filedLine8a !== expectedLine8a || filedLine8b !== 0 ||
    filedLine8c !== 0 || hasUnreportedRefinancePoints ||
    hasMortgageInterestCredit
  ) {
    throw new Error(
      "Schedule A two-loan mortgage-limit allocation needs the same single filer, sourced line 8a interest, and no other mortgage-interest or points routes",
    );
  }
}

export function assertForm1098Box6Sources(
  source: unknown,
  recipientTins: readonly string[],
  filedLine8a: number,
): void {
  if (source === undefined) return;
  const items = inputSchema.parse(source).f1098s;
  const claimed = items.filter((item) => deductibleBox6Points(item) > 0);
  if (claimed.length === 0) return;
  const allowed = new Set(recipientTins.map((tin) => tin.replaceAll("-", "")));
  if (
    claimed.some((item) =>
      !item.recipient_tin ||
      !allowed.has(item.recipient_tin.replaceAll("-", ""))
    )
  ) {
    throw new Error(
      "Schedule A Form 1098 box 6 recipient must match the taxpayer or joint-filing spouse",
    );
  }
  const points = claimed.reduce(
    (sum, item) => sum + deductibleBox6Points(item),
    0,
  );
  if (filedLine8a < points) {
    throw new Error(
      "Schedule A line 8a is less than sourced Form 1098 box 6 deductible points",
    );
  }
}

export function assertForm1098Box4Sources(
  source: unknown,
  recipientTins: readonly string[],
  filedRecovery: number,
): void {
  if (source === undefined) {
    if (filedRecovery > 0) {
      throw new Error("Schedule 1 Form 1098 box 4 needs payer source rows");
    }
    return;
  }
  const items = inputSchema.parse(source).f1098s;
  const claimed = items.filter((item) =>
    (item.box4_taxable_recovery_verified_amount ?? 0) > 0
  );
  const allowed = new Set(recipientTins.map((tin) => tin.replaceAll("-", "")));
  if (
    claimed.some((item) =>
      !item.recipient_tin ||
      !allowed.has(item.recipient_tin.replaceAll("-", ""))
    )
  ) {
    throw new Error(
      "Schedule 1 Form 1098 box 4 recipient must match the taxpayer or joint-filing spouse",
    );
  }
  const recovery = claimed.reduce(
    (sum, item) => sum + (item.box4_taxable_recovery_verified_amount ?? 0),
    0,
  );
  if (filedRecovery !== recovery) {
    throw new Error(
      "Schedule 1 Form 1098 box 4 recovery must match sourced taxable recovery",
    );
  }
}

// Interest routed to Schedule A from a single item
function scheduleAInterestForItem(item: F1098Item): number {
  return item.box1_current_year_deductible_interest ?? 0;
}

// Aggregate Schedule A mortgage interest across all for_routing=A items
function aggregateScheduleAInterest(items: F1098Items): number {
  return items
    .filter((item) => (item.for_routing ?? ForRouting.A) === ForRouting.A)
    .reduce((sum, item) => sum + scheduleAInterestForItem(item), 0);
}

// Aggregate current-year Schedule A points reported in box 6.
function aggregateScheduleAPoints(items: F1098Items): number {
  return items
    .filter((item) => (item.for_routing ?? ForRouting.A) === ForRouting.A)
    .reduce(
      (sum, item) => sum + deductibleBox6Points(item),
      0,
    );
}

// Aggregate prior-year refund income (Scenario B → Schedule 1 line 8z)
function aggregatePriorYearRefundIncome(items: F1098Items): number {
  return items
    .reduce(
      (sum, item) => sum + (item.box4_taxable_recovery_verified_amount ?? 0),
      0,
    );
}

function scheduleAOutput(items: F1098Items): NodeOutput[] {
  const interest = aggregateScheduleAInterest(items);
  const points = aggregateScheduleAPoints(items);
  const reportedInterestAndPoints = interest + points;
  return reportedInterestAndPoints > 0
    ? [
      output(schedule_a, {
        line_8a_mortgage_interest_1098: reportedInterestAndPoints,
      }),
    ]
    : [];
}

function schedule1Output(items: F1098Items): NodeOutput[] {
  const income = aggregatePriorYearRefundIncome(items);
  if (income <= 0) return [];
  return [output(schedule1, { line8z_f1098_interest_recovery: income })];
}

class F1098Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f1098";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([
    schedule_a,
    schedule1,
    agi_aggregator,
  ]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const { f1098s } = inputSchema.parse(input);
    if (f1098s.some((item) => item.for_routing === ForRouting.F8829)) {
      throw new Error(
        "Form 1098 mortgage interest routed to Form 8829 needs homeowner interest and Schedule A allocation facts",
      );
    }

    const outputs: NodeOutput[] = [
      ...scheduleAOutput(f1098s),
      ...schedule1Output(f1098s),
    ];

    const taxableRecovery = aggregatePriorYearRefundIncome(f1098s);
    if (taxableRecovery > 0) {
      outputs.push(output(agi_aggregator, {
        line8z_f1098_interest_recovery: taxableRecovery,
      }));
    }

    return { outputs };
  }
}

export const f1098 = new F1098Node();
