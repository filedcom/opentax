import { z } from "zod";
import type { NodeResult } from "../../../../../../core/types/tax-node.ts";
import { TaxNode, UnimplementedTaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { normalizeArray } from "../../../utils.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";

// schedule_d cannot be imported directly — it imports f1099div which imports this node,
// creating a circular dependency. Use a typed stub to preserve the at-least-one constraint
// while avoiding the circular import.
const scheduleDStubSchema = z.object({
  line19_unrecaptured_1250: z.number().nonnegative().optional(),
});

class ScheduleDStubNode extends UnimplementedTaxNode {
  override readonly inputSchema = scheduleDStubSchema;
}

const scheduleDRef = new ScheduleDStubNode("schedule_d");

// ─── Schemas ─────────────────────────────────────────────────────────────────

// Per-property schema — each sold real property contributes independently.
// §1250 gain per property = min(prior_depreciation_allowed, gain_on_sale).
const propertySchema = z.object({
  // Cumulative straight-line depreciation allowed/allowable on the property.
  prior_depreciation_allowed: z.number().nonnegative(),
  // Realized gain on the sale (amount realized minus adjusted basis).
  gain_on_sale: z.number().nonnegative(),
});

// Executor accumulation pattern: multiple upstream nodes may each deposit a
// `property` entry; the executor merges scalar → array.
const accumulable = <T extends z.ZodTypeAny>(schema: T) =>
  z.union([schema, z.array(schema)]);

// Unrecaptured Section 1250 Gain Worksheet
//
// Inputs arrive from:
//   • f1099div (box 2b): unrecaptured §1250 gain distributions from REITs/funds.
//   • Property sale nodes: prior depreciation + realized gain per property.
//
// The worksheet aggregates all sources to produce Schedule D line 19.
export const inputSchema = z.object({
  // From f1099div box 2b: pre-computed unrecaptured §1250 gain distributions.
  unrecaptured_1250_gain: z.number().nonnegative().optional(),

  // From property sale nodes: per-property depreciation and gain data.
  // Accumulates from scalar to array when multiple properties are present.
  property: accumulable(propertySchema).optional(),
});

type Unrecaptured1250Input = z.infer<typeof inputSchema>;
type PropertyItem = z.infer<typeof propertySchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────


// §1250 gain for a single property = min(prior depreciation, realized gain).
// Cannot exceed actual gain — only gain attributable to depreciation is captured.
function propertyUnrecapturedGain(item: PropertyItem): number {
  return Math.min(item.prior_depreciation_allowed, item.gain_on_sale);
}

// Aggregate §1250 gain across all property dispositions.
function propertiesUnrecapturedGain(properties: PropertyItem[]): number {
  return properties.reduce((sum, item) => sum + propertyUnrecapturedGain(item), 0);
}

// Total worksheet amount = property dispositions + distributions.
function totalUnrecapturedGain(input: Unrecaptured1250Input): number {
  const properties = normalizeArray(input.property);
  const fromProperties = propertiesUnrecapturedGain(properties);
  const fromDistributions = input.unrecaptured_1250_gain ?? 0;
  return fromProperties + fromDistributions;
}

// ─── Node class ───────────────────────────────────────────────────────────────

class Unrecaptured1250WorksheetNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "unrecaptured_1250_worksheet";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([scheduleDRef]);

  compute(_ctx: NodeContext, rawInput: Unrecaptured1250Input): NodeResult {
    const input = inputSchema.parse(rawInput);

    const line19 = totalUnrecapturedGain(input);

    if (line19 === 0) {
      return { outputs: [] };
    }

    return {
      outputs: [
        this.outputNodes.output(scheduleDRef, { line19_unrecaptured_1250: line19 }),
      ],
    };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const unrecaptured_1250_worksheet = new Unrecaptured1250WorksheetNode();
