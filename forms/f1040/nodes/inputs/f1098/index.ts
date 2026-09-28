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

export const itemSchema = z.object({
  // Required per context.md
  box1_mortgage_interest: z.number().nonnegative(),
  for_routing: z.nativeEnum(ForRouting).optional(),
  // Informational / routing helpers
  lender_name: z.string().optional(),
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
  box6_points_paid: z.number().nonnegative().optional(),
  // Box 6 is a source amount, not necessarily the current-year deduction.
  // The reviewed Pub. 936 workpaper determines the deductible portion.
  box6_current_year_deductible_points: z.number().nonnegative().optional(),
  box6_deduction_workpaper_reference: z.string().trim().min(1).optional(),
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
  // Refinance flag: box6 points must be amortized, not fully deducted in year paid
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
  if (points === 0) {
    if ((deductible ?? 0) > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["box6_current_year_deductible_points"],
        message: "Form 1098 box 6 deduction cannot exceed zero reported points",
      });
    }
    return;
  }
  if (
    (item.for_routing ?? ForRouting.A) !== ForRouting.A ||
    item.refinance === true || item.dedm_override === true
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["box6_points_paid"],
      message:
        "Form 1098 box 6 points need an unambiguous Schedule A purchase route; business, rental, refinance, and DEDM allocations are unsupported",
    });
  }
  if (deductible === undefined || deductible > points) {
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
});

export const inputSchema = z.object({
  f1098s: z.array(itemSchema),
});

type F1098Item = z.infer<typeof itemSchema>;
type F1098Items = F1098Item[];

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

// Aggregate Schedule A purchase points across all for_routing=A items
function aggregateScheduleAPoints(items: F1098Items): number {
  return items
    .filter((item) => (item.for_routing ?? ForRouting.A) === ForRouting.A)
    .reduce(
      (sum, item) => sum + (item.box6_current_year_deductible_points ?? 0),
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
