import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule_d } from "../schedule_d/index.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// ─── Schema ───────────────────────────────────────────────────────────────────

// Form 4797 accepts pre-computed amounts from Drake screen 4797 and from
// schedule_e (disposed_properties indicator). The engine does not re-derive
// per-line recapture arithmetic — that computation happens outside and the
// results are passed in as the appropriate aggregates.

export const inputSchema = z.object({
  // Indicator from schedule_e: count of rental properties marked disposed_of=true.
  // Does not drive computation on its own — actual sale data must also be present.
  disposed_properties: z.number().int().nonnegative().optional(),

  // Part I — Section 1231 net gain or loss (Form 4797, line 7 / line 9 after
  // nonrecaptured §1231 loss recapture). Positive = net §1231 gain before
  // prior-loss offset. Negative = net §1231 loss (routes to Schedule D as LT loss).
  section_1231_gain: z.number().optional(),

  // Part I line 8 — prior-year nonrecaptured §1231 losses that must be
  // recaptured as ordinary income before any remaining §1231 gain is treated
  // as long-term capital gain. Always entered as a non-negative value.
  nonrecaptured_1231_loss: z.number().nonnegative().optional(),

  // Part II line 18b / line 20 — total ordinary gain (or loss) from Part II.
  // Includes Part III §1245/§1250 depreciation recapture amounts and any
  // ordinary gains/losses from property held ≤ 1 year.
  ordinary_gain: z.number().optional(),

  // Informational — §1245 depreciation recapture (Part III, line 25).
  // Included in ordinary_gain; retained for audit trail.
  recapture_1245: z.number().nonnegative().optional(),

  // Informational — §1250 additional depreciation recapture (Part III, line 26).
  // Included in ordinary_gain; retained for audit trail.
  recapture_1250: z.number().nonnegative().optional(),
});

type Form4797Input = z.infer<typeof inputSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

// Returns true if the input contains any computable sale data.
function hasSaleData(input: Form4797Input): boolean {
  return (
    (input.section_1231_gain !== undefined && input.section_1231_gain !== 0) ||
    (input.ordinary_gain !== undefined && input.ordinary_gain !== 0)
  );
}

// Compute the amount of §1231 gain recaptured as ordinary income under IRC
// §1231(c) due to prior-year nonrecaptured §1231 losses (Part I, line 8).
// Returns the lesser of the gross §1231 gain or the prior loss balance.
// Only applies when the gross gain is positive.
function recapturedAsOrdinary(grossGain: number, priorLoss: number): number {
  if (grossGain <= 0 || priorLoss <= 0) return 0;
  return Math.min(grossGain, priorLoss);
}

// Compute the net §1231 gain that flows to Schedule D line 11 as a long-term
// capital gain. Returns 0 when the entire gain is recaptured as ordinary income
// or when the gross gain is non-positive.
function netSection1231GainForScheduleD(grossGain: number, priorLoss: number): number {
  if (grossGain <= 0) return 0;
  return Math.max(0, grossGain - priorLoss);
}

// Build Schedule D output for Part I §1231 net gain/loss.
// A positive net gain flows to Sch D line 11 (LT gain from Form 4797/2439).
// A §1231 loss (grossGain < 0) also flows to Sch D line 11 as a negative number.
function scheduleDOutput(grossGain: number, priorLoss: number): NodeOutput | null {
  if (grossGain < 0) {
    // Net §1231 loss — report on Schedule D line 11 as a negative LT amount
    return output(schedule_d, { line_11_form2439: grossGain });
  }
  const ltGain = netSection1231GainForScheduleD(grossGain, priorLoss);
  if (ltGain === 0) return null;
  return output(schedule_d, { line_11_form2439: ltGain });
}

// Build Schedule 1 output for ordinary gain/loss.
// Combines two sources:
//   1. Portion of §1231 gain recaptured as ordinary income (prior §1231 loss rule)
//   2. Part II net ordinary gain or loss
function schedule1Output(
  grossGain: number,
  priorLoss: number,
  ordinaryGain: number,
): NodeOutput | null {
  const recaptured = recapturedAsOrdinary(grossGain, priorLoss);
  const total = recaptured + ordinaryGain;
  if (total === 0) return null;
  return output(schedule1, { line4_other_gains: total });
}

// ─── Node class ───────────────────────────────────────────────────────────────

class Form4797IntermediateNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form4797";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule_d, schedule1]);

  compute(_ctx: NodeContext, rawInput: Form4797Input): NodeResult {
    const input = inputSchema.parse(rawInput);

    if (!hasSaleData(input)) {
      return { outputs: [] };
    }

    const grossGain = input.section_1231_gain ?? 0;
    const priorLoss = input.nonrecaptured_1231_loss ?? 0;
    const ordinaryGain = input.ordinary_gain ?? 0;

    const outputs: NodeOutput[] = [];

    const sdOut = scheduleDOutput(grossGain, priorLoss);
    if (sdOut !== null) outputs.push(sdOut);

    const s1Out = schedule1Output(grossGain, priorLoss, ordinaryGain);
    if (s1Out !== null) outputs.push(s1Out);

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const form4797 = new Form4797IntermediateNode();
