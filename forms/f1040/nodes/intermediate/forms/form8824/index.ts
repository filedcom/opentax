import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { schedule_d } from "../../aggregation/schedule_d/index.ts";
import { form4797 } from "../form4797/index.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";

// ─── Form 8824 — Like-Kind Exchanges (IRC §1031) ──────────────────────────────
//
// Computes deferred gain, recognized gain, and basis of replacement property
// for §1031 like-kind exchanges. Only real property qualifies after TCJA 2017.
//
// Key computations:
//   Gain realized = FMV received - adjusted basis given
//   Boot received = cash + net liabilities transferred + FMV of other property
//   Gain recognized = lesser of gain realized or boot received (never negative)
//   Deferred gain = gain realized - gain recognized
//   Basis of replacement = cost of replacement - deferred gain

// ─── Schema ───────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // FMV of relinquished (given up) property
  relinquished_fmv: z.number().nonnegative().optional(),

  // Adjusted basis of relinquished property
  relinquished_basis: z.number().nonnegative().optional(),

  // FMV of like-kind property received
  received_fmv: z.number().nonnegative().optional(),

  // Cash received (boot) — includes money received
  cash_received: z.number().nonnegative().optional(),

  // FMV of non-like-kind property received (other boot)
  other_property_fmv: z.number().nonnegative().optional(),

  // Liabilities assumed by buyer (increases amount realized)
  liabilities_assumed_by_buyer: z.number().nonnegative().optional(),

  // Liabilities taxpayer assumed on received property (reduces amount realized)
  liabilities_taxpayer_assumed: z.number().nonnegative().optional(),

  // Whether the unrecognized gain portion is §1231 (business) or capital (investment)
  // "section_1231" → routes recognized gain to form4797
  // "capital" → routes recognized gain to schedule_d
  // Default: "capital"
  gain_type: z.enum(["section_1231", "capital"]).optional(),
});

type Form8824Input = z.infer<typeof inputSchema>;

// ─── Pure Helpers ─────────────────────────────────────────────────────────────

// Line 12: Amount realized = FMV received + liabilities assumed by buyer
//   - liabilities taxpayer assumed (reduces amount realized)
function amountRealized(input: Form8824Input): number {
  return (
    (input.received_fmv ?? 0) +
    (input.cash_received ?? 0) +
    (input.other_property_fmv ?? 0) +
    (input.liabilities_assumed_by_buyer ?? 0) -
    (input.liabilities_taxpayer_assumed ?? 0)
  );
}

// Line 13: Adjusted basis of relinquished property (plus expenses of exchange)
function adjustedBasis(input: Form8824Input): number {
  return input.relinquished_basis ?? 0;
}

// Line 19: Gain realized = amount realized - adjusted basis (can be loss, but
// §1031 losses are NOT recognized — they are deferred)
function gainRealized(input: Form8824Input): number {
  return amountRealized(input) - adjustedBasis(input);
}

// Boot received = cash + other property FMV + net liabilities transferred
// IRC §1031(b): boot = cash + other property + liabilities assumed by buyer
// If taxpayer assumes more liabilities than buyer, the excess is "negative boot"
// (reduces recognized gain indirectly through lower amount realized),
// but cash/other-property boot is independent and cannot be offset by liability assumptions.
function bootReceived(input: Form8824Input): number {
  const cashBoot = (input.cash_received ?? 0) + (input.other_property_fmv ?? 0);
  // Net liability boot: only positive (buyer assuming more than taxpayer) adds to boot
  const liabilityBuyerAssumed = input.liabilities_assumed_by_buyer ?? 0;
  const liabilityTaxpayerAssumed = input.liabilities_taxpayer_assumed ?? 0;
  const netLiabilityBoot = Math.max(0, liabilityBuyerAssumed - liabilityTaxpayerAssumed);
  return cashBoot + netLiabilityBoot;
}

// Line 20: Gain recognized = lesser of gain realized or boot received
// Cannot be negative — if gain realized is negative (loss), gain recognized = 0
function gainRecognized(realized: number, boot: number): number {
  if (realized <= 0) return 0;
  return Math.min(realized, boot);
}

function buildOutputs(recognized: number, gainType: "section_1231" | "capital"): NodeOutput[] {
  if (recognized <= 0) return [];

  if (gainType === "section_1231") {
    // §1231 gain from like-kind exchange flows through Form 4797
    return [output(form4797, { section_1231_gain: recognized })];
  }

  // Capital gain from investment property exchange flows to Schedule D
  // as a long-term gain (§1231 property held > 1 year, capital gain property)
  return [output(schedule_d, { line_11_form2439: recognized })];
}

// ─── Node Class ───────────────────────────────────────────────────────────────

class Form8824Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form8824";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule_d, form4797]);

  compute(_ctx: NodeContext, rawInput: Form8824Input): NodeResult {
    const input = inputSchema.parse(rawInput);

    // No exchange data → no output
    if (
      (input.relinquished_fmv ?? 0) === 0 &&
      (input.received_fmv ?? 0) === 0 &&
      (input.relinquished_basis ?? 0) === 0
    ) {
      return { outputs: [] };
    }

    const realized = gainRealized(input);
    const boot = bootReceived(input);
    const recognized = gainRecognized(realized, boot);

    const gainType = input.gain_type ?? "capital";

    return { outputs: buildOutputs(recognized, gainType) };
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const form8824 = new Form8824Node();
