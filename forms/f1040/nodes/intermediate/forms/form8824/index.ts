import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { schedule_d } from "../../aggregation/schedule_d/index.ts";
import { form4797 } from "../form4797/index.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";
import { calculateLikeKindExchange } from "./calculation.ts";

// ─── Form 8824 — Like-Kind Exchanges (IRC §1031) ──────────────────────────────
//
// Computes deferred gain, recognized gain, and basis of replacement property
// for §1031 like-kind exchanges. Only real property qualifies after TCJA 2017.
//
// Part III lines 15-25 use the shared calculation also used by the MeF builder.
// Related-party and recapture cases need separate tax treatment.

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
  other_property_description: z.string().min(1).max(250).optional(),

  // Liabilities assumed by buyer (increases amount realized)
  liabilities_assumed_by_buyer: z.number().nonnegative().optional(),

  // Liabilities taxpayer assumed on received property (reduces amount realized)
  liabilities_taxpayer_assumed: z.number().nonnegative().optional(),
  cash_paid: z.number().nonnegative().optional(),
  exchange_expenses: z.number().nonnegative().optional(),

  relinquished_description: z.string().min(1).max(250).optional(),
  received_description: z.string().min(1).max(250).optional(),
  replacement_property_category: z.enum([
    "nondepreciable_land",
    "section_1250",
    "section_1245",
    "other_real_property",
  ]).optional(),
  date_acquired: z.string().date().optional(),
  date_transferred: z.string().date().optional(),
  date_identified: z.string().date().optional(),
  date_received: z.string().date().optional(),
  return_due_date_including_extensions: z.string().date().optional(),
  related_party: z.boolean().optional(),
  recapture_applies: z.boolean().optional(),
  multiple_like_kind_properties: z.boolean().optional(),
  installment_method_applies: z.boolean().optional(),
  property_used_as_home: z.boolean().optional(),

  // Whether the unrecognized gain portion is §1231 (business) or capital (investment)
  // "section_1231" → routes recognized gain to form4797
  // "capital" → routes recognized gain to schedule_d
  gain_type: z.enum(["section_1231", "capital"]).optional(),
});

export type Form8824Input = z.infer<typeof inputSchema>;

function buildOutputs(
  recognized: number,
  gainType: "section_1231" | "capital" | undefined,
): NodeOutput[] {
  if (recognized <= 0) return [];
  if (gainType === undefined) {
    throw new Error(
      "Form 8824 recognized gain needs explicit capital or section 1231 classification",
    );
  }

  if (gainType === "section_1231") {
    // §1231 gain from like-kind exchange flows through Form 4797
    return [output(form4797, {
      section_1231_gain: recognized,
      gain_form8824: recognized,
    })];
  }

  // Capital gain from investment property exchange flows to Schedule D
  // as a long-term gain (§1231 property held > 1 year, capital gain property)
  return [output(schedule_d, {
    line_11_form2439: recognized,
    gain_form8824_lt: recognized,
  })];
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

    if (
      input.related_party === true || input.recapture_applies === true ||
      input.multiple_like_kind_properties === true ||
      input.installment_method_applies === true ||
      input.property_used_as_home === true
    ) {
      throw new Error(
        "Form 8824 related-party, recapture, multi-property, installment, and home-use exchanges need additional tax treatment",
      );
    }

    const lines = calculateLikeKindExchange(input);
    const recognized = lines.line22;
    const replacementBasis = lines.line25;

    return {
      outputs: buildOutputs(recognized, input.gain_type),
      ...(replacementBasis > 0
        ? {
          carryforwards: { replacement_property_basis_8824: replacementBasis },
        }
        : {}),
    };
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const form8824 = new Form8824Node();
