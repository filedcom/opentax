import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { agi_aggregator } from "../../aggregation/agi_aggregator/index.ts";
import { schedule_d } from "../../aggregation/schedule_d/index.ts";
import { schedule1 } from "../../../outputs/schedule1/index.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";

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
  // prior-loss offset. Negative = net §1231 LOSS treated as ordinary income
  // under IRC §1231(a)(2) — NOT routed to Schedule D.
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

  // Unrecaptured §1250 gain from the Unrecaptured §1250 Gain Worksheet.
  // This is the portion of §1250 gain subject to the 25% rate (IRC §1(h)(1)(D))
  // — distinct from recapture_1250 (which is ordinary income already in ordinary_gain).
  // Routes to Schedule D line 19 → income_tax_calculation for 25% rate tier.
  unrecaptured_section_1250_gain: z.number().nonnegative().optional(),
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

// Build Schedule D output for Part I §1231 net gain only.
// A positive net gain (after prior loss recapture) flows to Sch D line 11.
// A §1231 LOSS is ordinary income per IRC §1231(a)(2) — NOT routed here.
function scheduleDOutput(grossGain: number, priorLoss: number): NodeOutput | null {
  if (grossGain <= 0) return null;
  const ltGain = netSection1231GainForScheduleD(grossGain, priorLoss);
  if (ltGain === 0) return null;
  return output(schedule_d, { line_11_form2439: ltGain });
}

// Compute total ordinary income/loss for Schedule 1 and agi_aggregator.
// Two sources:
//   1. §1231 net LOSS — fully ordinary per IRC §1231(a)(2)
//   2. Portion of §1231 net GAIN recaptured as ordinary (prior §1231 loss rule)
//   3. Part II net ordinary gain or loss
function ordinaryAmount(
  grossGain: number,
  priorLoss: number,
  ordinaryGain: number,
): number {
  if (grossGain < 0) {
    // Net §1231 loss: treated as ordinary under IRC §1231(a)(2)
    return grossGain + ordinaryGain;
  }
  // Net §1231 gain: only the recaptured portion is ordinary here
  return recapturedAsOrdinary(grossGain, priorLoss) + ordinaryGain;
}

// ─── Node class ───────────────────────────────────────────────────────────────

class Form4797IntermediateNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form4797";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule_d, schedule1, agi_aggregator]);

  compute(_ctx: NodeContext, rawInput: Form4797Input): NodeResult {
    const input = inputSchema.parse(rawInput);

    if (!hasSaleData(input)) {
      return { outputs: [] };
    }

    const grossGain = input.section_1231_gain ?? 0;
    const priorLoss = input.nonrecaptured_1231_loss ?? 0;
    const partIIOrdinaryGain = input.ordinary_gain ?? 0;
    const unrecaptured1250 = input.unrecaptured_section_1250_gain ?? 0;

    const outputs: NodeOutput[] = [];

    // Schedule D: §1231 net gain → LT capital gain (line 11)
    const sdOut = scheduleDOutput(grossGain, priorLoss);
    if (sdOut !== null) outputs.push(sdOut);

    // Schedule 1 / AGI: §1231 net loss (ordinary) + recaptured gain + Part II
    const ordinary = ordinaryAmount(grossGain, priorLoss, partIIOrdinaryGain);
    if (ordinary !== 0) {
      outputs.push(output(schedule1, { line4_other_gains: ordinary }));
      outputs.push(output(agi_aggregator, { line4_other_gains: ordinary }));
    }

    // Unrecaptured §1250 gain → Schedule D line 19 → 25% rate tier in QDCGT worksheet
    // IRC §1(h)(1)(D); Form 4797 / Unrecaptured §1250 Gain Worksheet
    if (unrecaptured1250 > 0) {
      outputs.push(output(schedule_d, { line19_unrecaptured_1250: unrecaptured1250 }));
    }

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const form4797 = new Form4797IntermediateNode();
