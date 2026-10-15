import { z } from "zod";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import { f1040_2026_node } from "./f1040.ts";
import { FilingStatus } from "../../nodes/types.ts";
import { childCredit2026 } from "../../nodes/config/2026-child-credit.ts";
import { roundWholeDollars } from "../../whole-dollars.ts";
import {
  calculateSchedule8812LinesWithConfig,
  type EarnedIncomeWorksheet,
} from "../../nodes/inputs/credits/child/f8812/index.ts";

/** Scope answers are source reviews, never caller-supplied credit totals. */
export const childCreditClaim2026Schema = z.object({
  tax_year: z.literal(2026),
  review_reference: z.string().trim().min(1),
  prior_disallowance: z.enum(["none", "math_or_clerical_only"]),
  do_not_claim_actc: z.boolean(),
  no_other_nonrefundable_credits: z.literal(true),
  no_foreign_or_territory_exclusions: z.literal(true),
  not_bona_fide_puerto_rico_resident: z.literal(true),
  no_self_employment_or_statutory_employee_income: z.literal(true),
  no_medicaid_waiver_payments: z.literal(true),
}).strict();
const amount = z.number().finite().nonnegative();
export const inputSchema = childCreditClaim2026Schema.partial().extend({
  auto_qualifying_children: z.number().int().nonnegative(),
  auto_other_dependents: z.number().int().nonnegative(),
  auto_filing_status: z.nativeEnum(FilingStatus),
  auto_agi: z.number().finite(),
  auto_income_tax_liability: amount,
  // Older wage emitters also deposit these facts; the worksheet uses the
  // normalized 1040 wage lines instead, including tips and Form 8919 wages.
  auto_earned_income: z.union([amount, z.array(amount)]).optional(),
  auto_se_earned_income: amount.optional(),
  wage_income_from_agi: amount,
  unsupported_earned_income_activity: z.boolean(),
  nontaxable_combat_pay_from_w2: amount.optional(),
  statutory_employee_from_w2: z.boolean().optional(),
  schedule2_part1_tax: amount.default(0),
}).strict();
export type ChildCreditInput2026 = z.input<typeof inputSchema>;

export function calculateChildCredit2026(raw: ChildCreditInput2026) {
  const input = inputSchema.parse(raw);
  const children = input.auto_qualifying_children;
  const others = input.auto_other_dependents;
  if (children + others === 0) {
    return {
      source_input: input,
      lines: null,
      file_schedule8812: false,
      do_not_claim_actc: input.do_not_claim_actc ?? false,
    };
  }
  const review = childCreditClaim2026Schema.parse(Object.fromEntries(
    Object.keys(childCreditClaim2026Schema.shape).map((
      key,
    ) => [key, input[key as keyof typeof input]]),
  ));
  if (
    input.unsupported_earned_income_activity ||
    input.statutory_employee_from_w2 ||
    (input.auto_se_earned_income ?? 0) !== 0
  ) {
    throw new Error(
      "2026 child credit needs the self-employment, statutory-employee or foreign-income worksheet owner",
    );
  }
  const earned: EarnedIncomeWorksheet = {
    form1040_line1z_wages: input.wage_income_from_agi,
    nontaxable_combat_pay: roundWholeDollars(
      input.nontaxable_combat_pay_from_w2 ?? 0,
    ),
    schedule_c_statutory_employee_income: 0,
    nonfarm_schedule_c_and_k1_net: 0,
    farm_schedule_f_and_k1_net: 0,
    farm_optional_method_used: false,
    excluded_medicaid_waiver_payments: 0,
    schedule1_line15_se_deduction: 0,
  };
  // The source review proves these credits are absent. When their source
  // owners are connected, replace this adapter with their finalized values.
  // The old 5b field is deliberately zero: 2026 Worksheet A no longer uses it.
  const calculated = calculateSchedule8812LinesWithConfig(childCredit2026, {
    f8812s: [{
      qualifying_children_count: children,
      other_dependents_count: others,
      filing_status: input.auto_filing_status,
      agi: input.auto_agi,
      income_tax_liability: input.auto_income_tax_liability +
        input.schedule2_part1_tax,
      do_not_claim_actc: review.do_not_claim_actc,
    }],
    earned_income_worksheet: earned,
    credit_limit_worksheet: {
      schedule3_line1: 0,
      schedule3_line2: 0,
      schedule3_line3: 0,
      schedule3_line4: 0,
      schedule3_line5b: 0,
      schedule3_line6d: 0,
      schedule3_line6f: 0,
      schedule3_line6l: 0,
      schedule3_line6m: 0,
      worksheet_b_applies: false,
    },
    // Part II-B is intentionally absent until payroll and EIC are finalized.
    // The shared calculator fails explicitly only when that method is needed.
  }, { roundActcEarnedIncome: true });
  const lines = calculated && {
    ...calculated,
    // ODC-only filers still follow line 16a before stopping at zero children.
    line16a: Math.max(0, calculated.line12 - calculated.line14),
    line20: roundWholeDollars(calculated.line20),
    line27: roundWholeDollars(calculated.line27),
  };
  return {
    source_input: input,
    earned_income_worksheet: earned,
    lines,
    do_not_claim_actc: review.do_not_claim_actc,
    file_schedule8812: !!lines && (lines.line14 > 0 || lines.line27 > 0),
  };
}

class ChildCreditNode2026 extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f8812";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040_2026_node]);
  compute(ctx: NodeContext, raw: ChildCreditInput2026): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("Schedule 8812 needs f1040:2026 context");
    }
    const calculation = calculateChildCredit2026(raw);
    return {
      outputs: [
        { nodeType: "f8812", fields: { calculation_2026: calculation } },
        {
          nodeType: "f1040",
          fields: {
            schedule8812_finalized: true,
            line19_child_tax_credit: calculation.lines?.line14 ?? 0,
            line28_actc: calculation.lines?.line27 ?? 0,
            line28_declines_actc: calculation.do_not_claim_actc,
          },
        },
      ],
    };
  }
}
export const f8812_2026 = new ChildCreditNode2026();
