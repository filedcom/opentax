import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule_d } from "../schedule_d/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// ─── Constants — TY2025 ───────────────────────────────────────────────────────

// IRC §1256(a)(3) — 60/40 rule: 60% of net §1256 gain/loss is treated as
// long-term capital gain/loss; 40% is treated as short-term, regardless of
// the actual holding period.
const LONG_TERM_RATE = 0.60;
const SHORT_TERM_RATE = 0.40;

// ─── Schema ───────────────────────────────────────────────────────────────────

// Form 6781 — Gains and Losses From Section 1256 Contracts and Straddles
// IRC §1256; TY2025 instructions.
//
// Section 1256 contracts (regulated futures contracts, foreign currency
// contracts, non-equity options, etc.) are marked to market at year end
// and subject to the 60% long-term / 40% short-term rule.
//
// Wash sale rules do NOT apply to §1256 contracts (IRC §1256(f)(1)).

export const inputSchema = z.object({
  // Part I — Net gain or loss from all §1256 contracts (Form 6781 line 4).
  // This is the aggregate mark-to-market gain/loss for the year.
  // IRC §1256(a)(1)
  net_section_1256_gain: z.number().optional(),

  // Prior-year §1256 net loss carryback or carryforward (Form 6781 line 5).
  // Under IRC §1256(f)(2), a net §1256 loss may be carried back 3 years.
  // The carryback/forward reduces the current-year net before the 60/40 split.
  prior_year_loss_carryover: z.number().nonnegative().optional(),
});

type Form6781Input = z.infer<typeof inputSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

// Net §1256 amount after applying prior-year loss carryover (line 6).
function netAmount(input: Form6781Input): number {
  const gross = input.net_section_1256_gain ?? 0;
  const carryover = input.prior_year_loss_carryover ?? 0;
  // Prior-year loss carryover reduces net gain (or increases net loss)
  return gross - carryover;
}

// Long-term portion: 60% of net §1256 amount.
// IRC §1256(a)(3)(A)
function longTermAmount(net: number): number {
  return net * LONG_TERM_RATE;
}

// Short-term portion: 40% of net §1256 amount.
// IRC §1256(a)(3)(B)
function shortTermAmount(net: number): number {
  return net * SHORT_TERM_RATE;
}

// ─── Node class ───────────────────────────────────────────────────────────────

class Form6781Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form6781";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule_d]);

  compute(_ctx: NodeContext, rawInput: Form6781Input): NodeResult {
    const input = inputSchema.parse(rawInput);

    const net = netAmount(input);

    // No net §1256 activity → no outputs
    if (net === 0) {
      return { outputs: [] };
    }

    const ltAmount = longTermAmount(net);
    const stAmount = shortTermAmount(net);

    const outputs: NodeOutput[] = [];

    // Long-term portion → Schedule D line 11 (Form 4797/2439 column).
    // We use line_11_form2439 as the long-term §1256 line.
    // IRC §1256(a)(3)(A); Schedule D instructions for Form 6781.
    if (ltAmount !== 0) {
      outputs.push(output(schedule_d, { line_11_form2439: ltAmount }));
    }

    // Short-term portion → Schedule D line 1a (short-term aggregate).
    // Reported as proceeds adjustment (positive gain = proceeds > 0, cost = 0;
    // negative loss = 0 proceeds, cost > 0 — but using signed proceeds/cost=0 for simplicity).
    if (stAmount !== 0) {
      outputs.push(output(schedule_d, { line_1a_proceeds: stAmount, line_1a_cost: 0 }));
    }

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const form6781 = new Form6781Node();
