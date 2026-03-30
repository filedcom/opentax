import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../schedule3/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// ─── Constants — TY2025 ───────────────────────────────────────────────────────

// IRC §25(a)(1) — maximum annual mortgage interest credit when MCC rate > 20%.
// Rev. Proc. 2024-40 / Form 8396 instructions (TY2025).
const MAX_CREDIT_HIGH_RATE = 2_000;

// MCC rate threshold above which the $2,000 cap applies (IRC §25(a)(2)).
const HIGH_RATE_THRESHOLD = 0.20;

// ─── Schema ───────────────────────────────────────────────────────────────────

// Form 8396 — Mortgage Interest Credit
// IRC §25; TY2025 instructions.
//
// Homeowners who received a Mortgage Credit Certificate (MCC) from a state or
// local government may claim a nonrefundable credit equal to:
//   credit = mortgage interest paid × MCC rate
// capped at $2,000 when the MCC rate exceeds 20%.
//
// The allowed credit reduces the deductible mortgage interest on Schedule A.

export const inputSchema = z.object({
  // Mortgage interest paid during the year on the certified indebtedness.
  // Form 8396 line 1 — sourced from Form 1098 box 1 or equivalent.
  mortgage_interest_paid: z.number().nonnegative().optional(),

  // Credit rate stated on the Mortgage Credit Certificate (e.g., 0.20 = 20%).
  // Form 8396 line 2; IRC §25(a).
  mcc_rate: z.number().min(0).max(1).optional(),

  // Prior-year mortgage interest credit carryforward (Form 8396 line 3).
  // Unused prior-year credits can be carried forward up to 3 years.
  // IRC §25(e)(1)
  prior_year_credit_carryforward: z.number().nonnegative().optional(),
});

type Form8396Input = z.infer<typeof inputSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

// Current-year tentative credit: interest paid × MCC rate.
// Form 8396 line 3 (before cap).
// IRC §25(a)(1)
function tentativeCredit(
  interest: number,
  rate: number,
): number {
  return interest * rate;
}

// Apply $2,000 cap when MCC rate > 20%.
// IRC §25(a)(2)
function applyRateCap(tentative: number, rate: number): number {
  if (rate > HIGH_RATE_THRESHOLD) {
    return Math.min(tentative, MAX_CREDIT_HIGH_RATE);
  }
  return tentative;
}

// Total credit including any carryforward.
function totalCredit(capped: number, carryforward: number): number {
  return capped + carryforward;
}

// ─── Node class ───────────────────────────────────────────────────────────────

class Form8396Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8396";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3]);

  compute(_ctx: NodeContext, rawInput: Form8396Input): NodeResult {
    const input = inputSchema.parse(rawInput);

    const interest = input.mortgage_interest_paid ?? 0;
    const rate = input.mcc_rate ?? 0;
    const carryforward = input.prior_year_credit_carryforward ?? 0;

    // No interest, no rate, no carryforward → no credit
    if (interest === 0 && carryforward === 0) {
      return { outputs: [] };
    }

    const tentative = tentativeCredit(interest, rate);
    const capped = applyRateCap(tentative, rate);
    const total = totalCredit(capped, carryforward);

    if (total <= 0) {
      return { outputs: [] };
    }

    const outputs: NodeOutput[] = [
      output(schedule3, { line6f_mortgage_interest_credit: total }),
    ];

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const form8396 = new Form8396Node();
