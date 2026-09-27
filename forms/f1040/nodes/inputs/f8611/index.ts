import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule2 } from "../../intermediate/aggregation/schedule2/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 8611, Recapture of Low-Income Housing Credit. One item is one building.
// The IRS form's lines 2, 11, and pass-through line 8 require source records
// that cannot be derived from a credit-year total or a generic event label.

export enum RecaptureEventType {
  DISPOSITION = "DISPOSITION",
  REDUCED_QUALIFIED_BASIS = "REDUCED_QUALIFIED_BASIS",
  NONCOMPLIANCE = "NONCOMPLIANCE",
}

const money = z.number().finite().nonnegative();
const ratio = z.number().finite().min(0).max(1);

const line2WorksheetSchema = z.object({
  source_form8609a_reference: z.string().trim().min(1),
  prior_tax_year: z.number().int(),
  form8609a_line10: money,
  form8609a_line11: money,
  form8609a_line14_step1_ratio: ratio,
  form8609a_line15: money.positive(),
  form8609a_line16: money,
}).superRefine((worksheet, ctx) => {
  if (worksheet.form8609a_line11 > worksheet.form8609a_line10 * 2) {
    ctx.addIssue({
      code: "custom",
      message: "Form 8611 line 2 worksheet step d cannot be negative",
    });
  }
});

type Line2Worksheet = z.infer<typeof line2WorksheetSchema>;

export function calculateLine2Worksheet(worksheet: Line2Worksheet): number {
  const source = line2WorksheetSchema.parse(worksheet);
  const stepD = source.form8609a_line10 * 2 - source.form8609a_line11;
  const stepG = stepD * (1 - source.form8609a_line14_step1_ratio);
  return stepG * (source.form8609a_line16 / source.form8609a_line15);
}

const common = z.object({
  source_document_reference: z.string().trim().min(1),
  recapture_year: z.number().int(),
  building_bin: z.string().trim().min(1).max(9),
  building_us_address: z.object({
    line1: z.string().trim().min(1),
    line2: z.string().trim().min(1).optional(),
    city: z.string().trim().min(1),
    state: z.string().regex(/^[A-Z]{2}$/),
    zip: z.string().regex(/^\d{5}(?:\d{4}|\d{7})?$/),
  }),
  placed_in_service_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  financed_with_tax_exempt_bonds: z.boolean(),
  tax_exempt_bond: z.object({
    issuer_name: z.string().trim().min(1),
    issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    issue_name: z.string().trim().min(1).max(35),
    cusip: z.string().trim().min(1).optional(),
    no_cusip: z.literal(true).optional(),
  }).superRefine((bond, ctx) => {
    if (Boolean(bond.cusip) === Boolean(bond.no_cusip)) {
      ctx.addIssue({
        code: "custom",
        message:
          "Form 8611 tax-exempt bond needs a CUSIP or an explicit no-CUSIP answer",
      });
    }
  }).optional(),
});

const ownCredit = z.object({
  source_type: z.literal("own_credit"),
  recapture_event_type: z.nativeEnum(RecaptureEventType),
  credit_period_start_year: z.number().int(),
  recapture_required_after_exceptions: z.literal(true),
  line1_prior_form8586_credits: money,
  line2_worksheets: z.array(line2WorksheetSchema),
  line6_qualified_basis_decrease_ratio: ratio,
  line7_prior_accelerated_recapture_amount: money,
  line11_interest_from_prior_years: money,
  prior_unused_credits: money,
  unused_additions_to_qualified_basis_credits: money,
}).superRefine((source, ctx) => {
  if (
    source.line2_worksheets.reduce(
      (sum, worksheet) => sum + calculateLine2Worksheet(worksheet),
      0,
    ) > source.line1_prior_form8586_credits
  ) {
    ctx.addIssue({
      code: "custom",
      message: "Form 8611 line 2 cannot exceed line 1",
    });
  }
  if (
    source.unused_additions_to_qualified_basis_credits >
      source.prior_unused_credits
  ) {
    ctx.addIssue({
      code: "custom",
      message: "Form 8611 unused additions cannot exceed unused credits",
    });
  }
  if (
    source.recapture_event_type === RecaptureEventType.DISPOSITION &&
    source.line6_qualified_basis_decrease_ratio !== 1
  ) {
    ctx.addIssue({
      code: "custom",
      message: "Form 8611 taxable building disposition needs line 6 equal to 1",
    });
  }
});

const passThroughCredit = z.object({
  source_type: z.literal("pass_through"),
  line8_flow_through_recapture: money,
  line9_unused_accelerated_credit: money,
  line11_interest_from_prior_years: money,
  prior_unused_credits: money,
  section42j5_partnership_interest_included: z.boolean(),
}).superRefine((source, ctx) => {
  if (
    source.section42j5_partnership_interest_included &&
    source.line11_interest_from_prior_years !== 0
  ) {
    ctx.addIssue({
      code: "custom",
      message:
        "Form 8611 section 42(j)(5) interest is included in line 8; line 11 must be zero",
    });
  }
  if (source.line9_unused_accelerated_credit > source.prior_unused_credits) {
    ctx.addIssue({
      code: "custom",
      message: "Form 8611 line 9 cannot exceed prior unused credits",
    });
  }
});

export const itemSchema = common.extend({
  calculation: z.union([ownCredit, passThroughCredit]),
}).superRefine((source, ctx) => {
  if (
    source.financed_with_tax_exempt_bonds !== Boolean(source.tax_exempt_bond)
  ) {
    ctx.addIssue({
      code: "custom",
      message: "Form 8611 bond-financing answer and bond details must agree",
    });
  }
  if (source.calculation.source_type === "own_credit") {
    const years = source.calculation.line2_worksheets.map((row) =>
      row.prior_tax_year
    );
    if (
      years.some((year) => year >= source.recapture_year) ||
      new Set(years).size !== years.length
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Form 8611 line 2 worksheets need distinct prior tax years",
      });
    }
  }
});

export const inputSchema = z.object({
  f8611s: z.array(itemSchema).min(1),
});

export type F8611Item = z.infer<typeof itemSchema>;

export type F8611Lines = {
  readonly line1?: number;
  readonly line2?: number;
  readonly line3?: number;
  readonly line4?: number;
  readonly line5?: number;
  readonly line6?: number;
  readonly line7?: number;
  readonly line8?: number;
  readonly line9: number;
  readonly line10: number;
  readonly line11: number;
  readonly line12: number;
  readonly line13: number;
  readonly line14: number;
  readonly line15: number;
};

/** The exact three-decimal recapture percentages printed in Form 8611. */
export function recapturePercentage(creditPeriodYear: number): number {
  if (
    !Number.isInteger(creditPeriodYear) || creditPeriodYear < 2 ||
    creditPeriodYear > 15
  ) {
    throw new Error(
      "Form 8611 recapture event must be in credit-period years 2 through 15",
    );
  }
  if (creditPeriodYear <= 11) return 0.333;
  return ({ 12: 0.267, 13: 0.200, 14: 0.133, 15: 0.067 } as Record<
    number,
    number
  >)[
    creditPeriodYear
  ];
}

export function calculateForm8611(raw: F8611Item): F8611Lines {
  const item = itemSchema.parse(raw);
  const source = item.calculation;
  let own: Pick<
    F8611Lines,
    "line1" | "line2" | "line3" | "line4" | "line5" | "line6" | "line7"
  > = {};
  let line8: number | undefined;
  let line9: number;
  if (source.source_type === "own_credit") {
    const creditPeriodYear = item.recapture_year -
      source.credit_period_start_year + 1;
    const line4 = recapturePercentage(creditPeriodYear);
    const line2 = source.line2_worksheets.reduce(
      (sum, worksheet) => sum + calculateLine2Worksheet(worksheet),
      0,
    );
    const line3 = source.line1_prior_form8586_credits - line2;
    const line5 = line3 * line4;
    const line6 = source.line6_qualified_basis_decrease_ratio;
    const accelerated = line5 * line6;
    const line7 = Math.max(
      0,
      accelerated - source.line7_prior_accelerated_recapture_amount,
    );
    line9 = (source.prior_unused_credits -
      source.unused_additions_to_qualified_basis_credits) * line4 * line6;
    own = {
      line1: source.line1_prior_form8586_credits,
      line2,
      line3,
      line4,
      line5,
      line6,
      line7,
    };
  } else {
    line8 = source.line8_flow_through_recapture;
    line9 = source.line9_unused_accelerated_credit;
  }
  const line10 = Math.max(0, (own.line7 ?? line8 ?? 0) - line9);
  const line11 = source.line11_interest_from_prior_years;
  const line12 = line10 + line11;
  const line13 = source.prior_unused_credits - line9;
  return {
    ...own,
    line8,
    line9,
    line10,
    line11,
    line12,
    line13,
    line14: Math.max(0, line12 - line13),
    line15: Math.max(0, line13 - line12),
  };
}

class F8611Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8611";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule2]);

  compute(ctx: NodeContext, rawInput: z.infer<typeof inputSchema>): NodeResult {
    const input = inputSchema.parse(rawInput);
    for (const item of input.f8611s) {
      if (item.recapture_year !== ctx.taxYear) {
        throw new Error("Form 8611 recapture year must match the return year");
      }
    }
    const line16 = input.f8611s.reduce(
      (sum, item) => sum + calculateForm8611(item).line14,
      0,
    );
    return {
      outputs: line16 > 0
        ? [output(schedule2, { line16_lihtc_recapture: line16 })]
        : [],
    };
  }
}

export const f8611 = new F8611Node();
