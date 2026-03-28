import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import { schedule_d } from "../../intermediate/schedule_d/index.ts";

// Annual capital loss deduction limit — excess carries forward
const CAPITAL_LOSS_LIMIT = -3_000;

export const inputSchema = z.object({
  // Line 1a — Short-term, basis reported (aggregate, no adjustments needed)
  line_1a_proceeds: z.number().optional(),
  line_1a_cost: z.number().optional(),

  // Line 8a — Long-term, basis reported (aggregate, no adjustments needed)
  line_8a_proceeds: z.number().optional(),
  line_8a_cost: z.number().optional(),

  // Carryovers from prior year (entered as positive; treated as loss)
  line_6_carryover: z.number().nonnegative().optional(),
  line_14_carryover: z.number().nonnegative().optional(),

  // Capital gain distributions from mutual funds/REITs (always LT)
  line_12_cap_gain_dist: z.number().nonnegative().optional(),

  // Undistributed LT gains (Form 2439, Form 4797 Part I, etc.)
  line_11_form2439: z.number().optional(),

  // Other short-term gains/losses (Form 6252, 4684, 6781, 8824)
  line_4_other_st: z.number().optional(),

  // K-1 short-term capital gains/losses
  line_5_k1_st: z.number().optional(),

  // K-1 long-term capital gains/losses
  line_12_k1_lt: z.number().optional(),
});

type ScheduleDInput = z.infer<typeof inputSchema>;

class ScheduleDNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "d_screen";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040, schedule_d]);

  compute(input: ScheduleDInput): NodeResult {
    const outputs: NodeOutput[] = [];

    // Short-term net
    const stNet = (input.line_1a_proceeds ?? 0) -
      (input.line_1a_cost ?? 0) +
      (input.line_4_other_st ?? 0) +
      (input.line_5_k1_st ?? 0) -
      (input.line_6_carryover ?? 0);

    // Long-term net
    const ltNet = (input.line_8a_proceeds ?? 0) -
      (input.line_8a_cost ?? 0) +
      (input.line_11_form2439 ?? 0) +
      (input.line_12_cap_gain_dist ?? 0) +
      (input.line_12_k1_lt ?? 0) -
      (input.line_14_carryover ?? 0);

    // Total net capital gain or loss
    const totalNet = stNet + ltNet;

    // Apply $3,000 capital loss limitation for f1040
    const capitalGainForReturn = totalNet >= 0
      ? totalNet
      : Math.max(CAPITAL_LOSS_LIMIT, totalNet);

    // Always emit capital gain/loss to f1040 Line 7
    outputs.push({
      nodeType: f1040.nodeType,
      input: { line7_capital_gain: capitalGainForReturn },
    });

    // If total loss exceeds $3,000, the excess carries forward to next year
    if (totalNet < CAPITAL_LOSS_LIMIT) {
      const carryforward = -(totalNet - CAPITAL_LOSS_LIMIT);
      outputs.push({
        nodeType: schedule_d.nodeType,
        input: { capital_loss_carryover: carryforward },
      });
    }

    return { outputs };
  }
}

export const scheduleD = new ScheduleDNode();
