import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";
import { f3800 } from "../f3800/index.ts";
import { form8582cr } from "../../intermediate/forms/form8582cr/index.ts";

// Form 8874 line 1 is one row per qualified equity investment held on a
// current-year credit allowance date. Prior-year carryovers belong on Form
// 3800 Part IV, not in this current-year source calculation.
const money = z.number().finite().positive().refine((amount) =>
  Number.isSafeInteger(Math.round(amount * 100)) &&
  Math.abs(amount * 100 - Math.round(amount * 100)) < 0.000001
);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value;
});

export const investmentSchema = z.object({
  cde_name: z.string().trim().min(1),
  cde_ein: z.string().regex(/^\d{9}$/),
  cde_address: z.object({
    line1: z.string().trim().min(1),
    city: z.string().trim().min(1),
    state: z.string().length(2),
    zip: z.string().regex(/^\d{5}(?:\d{4})?$/),
  }),
  initial_investment_date: isoDate,
  credit_allowance_date: isoDate,
  qualified_equity_investment_amount: money,
  designation_notice_reference: z.string().trim().min(1),
  held_on_credit_allowance_date: z.literal(true),
  qualified_on_credit_allowance_date: z.literal(true),
  recapture_notice_received: z.literal(false),
  subject_to_passive_activity_limit: z.boolean(),
  passive_activity_reference: z.string().trim().min(1).optional(),
  passive_source_document_reference: z.string().trim().min(1).optional(),
}).superRefine((investment, ctx) => {
  const initial = investment.initial_investment_date;
  const allowance = investment.credit_allowance_date;
  const year = Number(allowance.slice(0, 4)) - Number(initial.slice(0, 4)) + 1;
  if (
    allowance.slice(0, 4) !== "2025" || year < 1 || year > 7 ||
    allowance.slice(5) !== initial.slice(5)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["credit_allowance_date"],
      message:
        "Form 8874 needs a 2025 initial or anniversary allowance date within the seven-year credit period",
    });
  }
  const rate = year <= 3 ? 5 : 6;
  const creditCents = Math.round(
    investment.qualified_equity_investment_amount * rate,
  );
  if (creditCents <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["qualified_equity_investment_amount"],
      message: "Form 8874 investment needs a positive current-year credit",
    });
  }
  if (investment.subject_to_passive_activity_limit) {
    for (
      const key of [
        "passive_activity_reference",
        "passive_source_document_reference",
      ] as const
    ) {
      if (!investment[key]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `Passive Form 8874 investment needs ${key}`,
        });
      }
    }
    if (creditCents % 100 !== 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["qualified_equity_investment_amount"],
        message:
          "Passive Form 8874 current-year credit needs whole-dollar source precision",
      });
    }
  } else if (
    investment.passive_activity_reference ||
    investment.passive_source_document_reference
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["subject_to_passive_activity_limit"],
      message:
        "Nonpassive Form 8874 investment cannot carry passive activity references",
    });
  }
});

export const inputSchema = z.object({
  investments: z.array(investmentSchema).min(1),
}).strict().superRefine((input, ctx) => {
  const seen = new Set<string>();
  input.investments.forEach((investment, index) => {
    const key = [
      investment.cde_ein,
      investment.initial_investment_date,
      investment.designation_notice_reference,
    ].join(":");
    if (seen.has(key)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["investments", index],
        message: "Form 8874 qualified equity investment is duplicated",
      });
    }
    seen.add(key);
    if (investment.subject_to_passive_activity_limit) {
      const passiveKey = [
        investment.passive_activity_reference,
        investment.passive_source_document_reference,
      ].join(":");
      if (seen.has(`passive:${passiveKey}`)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["investments", index],
          message: "Passive Form 8874 activity source is duplicated",
        });
      }
      seen.add(`passive:${passiveKey}`);
    }
  });
});

export type F8874Input = z.infer<typeof inputSchema>;

export function calculateForm8874(raw: F8874Input) {
  const input = inputSchema.parse(raw);
  const rows = input.investments.map((investment) => {
    const creditYear = Number(investment.credit_allowance_date.slice(0, 4)) -
      Number(investment.initial_investment_date.slice(0, 4)) + 1;
    const rate = creditYear <= 3 ? 5 : 6;
    const creditAmount = Math.round(
      investment.qualified_equity_investment_amount * rate,
    ) / 100;
    return { investment, creditYear, rate, creditAmount };
  });
  const line1Cents = rows.reduce(
    (sum, row) => sum + Math.round(row.creditAmount * 100),
    0,
  );
  if (!Number.isSafeInteger(line1Cents)) {
    throw new Error("Form 8874 current-year credit exceeds safe cents");
  }
  const line1 = line1Cents / 100;
  const passiveCents = rows.reduce(
    (sum, row) =>
      sum +
      (row.investment.subject_to_passive_activity_limit
        ? Math.round(row.creditAmount * 100)
        : 0),
    0,
  );
  const nonpassiveCents = line1Cents - passiveCents;
  return {
    rows,
    line1,
    line2: 0,
    line3: line1,
    passiveCredit: passiveCents / 100,
    nonpassiveCredit: nonpassiveCents / 100,
  };
}

class F8874Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8874";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f3800, form8582cr]);

  compute(_ctx: NodeContext, rawInput: F8874Input): NodeResult {
    const lines = calculateForm8874(rawInput);
    return {
      outputs: [
        ...(lines.nonpassiveCredit > 0
          ? [output(f3800, {
            f8874_credit: {
              credit_amount: lines.nonpassiveCredit,
              subject_to_passive_activity_limit: false,
            },
          })]
          : []),
        ...lines.rows.flatMap((row) =>
          row.investment.subject_to_passive_activity_limit
            ? [output(form8582cr, {
              required_new_markets_self_credits: [{
                activity_reference: row.investment.passive_activity_reference!,
                source_document_reference: row.investment
                  .passive_source_document_reference!,
                credit_amount: row.creditAmount,
              }],
            })]
            : []
        ),
      ],
    };
  }
}

export const f8874 = new F8874Node();
