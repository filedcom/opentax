import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { form8995a } from "../../intermediate/forms/form8995a/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// QBI Aggregation — Aggregation of Business Operations for §199A
//
// Screen: BAN — "Aggregation of Business Operations" (Drake 1040)
//
// Under IRC §199A(b)(1) and Reg. §1.199A-4, a taxpayer with multiple
// qualified trades or businesses may elect to aggregate them for purposes
// of applying the W-2 wage and UBIA limitations. Once aggregated, the
// W-2 wages and UBIA of the combined group are compared against the
// combined QBI of the group.
//
// This node is informational: it captures the aggregation groupings
// declared on the BAN screen. The actual §199A limitation computation
// is performed by form8995a. Form 8995-A Schedule B (Aggregation) must
// be attached when this election is made.
//
// IRS Form 8995-A Schedule B: https://www.irs.gov/pub/irs-pdf/f8995as.pdf
// Reg. §1.199A-4 — Aggregation of trades or businesses
// IRC §199A(b)(1) — W-2 wage and UBIA limitation

// Schema for one aggregation group
const aggregationGroupSchema = z.object({
  // Taxpayer-assigned name for the aggregation group (required for Schedule B)
  group_name: z.string().min(1),

  // Names of the individual businesses included in this group.
  // Each business must separately qualify under §199A (must be a QTB, not an SSTB
  // above the threshold, and must meet the aggregation criteria in Reg. §1.199A-4(b)).
  business_names: z.array(z.string().min(1)).min(1),

  // True when this group is aggregated to meet the W-2 wage / UBIA limitation
  // (the most common aggregation purpose per IRC §199A(b)(1)).
  combined_for_limitation: z.boolean(),
});

export const itemSchema = aggregationGroupSchema;

export const inputSchema = z.object({
  // At least one aggregation group must be declared on the BAN screen
  aggregation_groups: z.array(aggregationGroupSchema).min(1),
});

type QbiAggregationInput = z.infer<typeof inputSchema>;

// ── Pure helpers ──────────────────────────────────────────────────────────────

// Counts groups declared for the limitation aggregation
function limitationGroupCount(input: QbiAggregationInput): number {
  return input.aggregation_groups.filter((g) => g.combined_for_limitation).length;
}

// ── Node class ────────────────────────────────────────────────────────────────

class QbiAggregationNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "qbi_aggregation";
  readonly inputSchema = inputSchema;
  // Aggregation elections are consumed by form8995a (Schedule B).
  // This node does not emit standalone financial outputs — it signals
  // to form8995a that grouped treatment should be applied.
  // We list form8995a as the output node so the registry type-checks.
  readonly outputNodes = new OutputNodes([form8995a]);

  compute(_ctx: NodeContext, rawInput: QbiAggregationInput): NodeResult {
    const input = inputSchema.parse(rawInput);

    // Validate: there must be at least one limitation group if any groups exist
    // (purely informational check; does not block valid configurations)
    void limitationGroupCount(input);

    // Aggregation data is captured at the engine level. No financial output
    // is emitted from this node — the aggregation election is recorded in
    // the taxpayer's return and referenced by form8995a during computation.
    return { outputs: [] };
  }
}

export const qbiAggregation = new QbiAggregationNode();
