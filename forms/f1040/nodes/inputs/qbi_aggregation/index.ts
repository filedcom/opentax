import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import {
  aggregationFilingDetailsSchema,
  form8995a,
} from "../../intermediate/forms/form8995a/index.ts";
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
// This node forwards the election to Form 8995-A. Until Schedule B has a
// source-backed filing route, Form 8995-A rejects it rather than dropping it.
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
  business_names: z.array(z.string().min(1)).min(2),

  // True when this group is aggregated to meet the W-2 wage / UBIA limitation
  // (the most common aggregation purpose per IRC §199A(b)(1)).
  combined_for_limitation: z.boolean(),
});

export const itemSchema = aggregationGroupSchema;

export const inputSchema = z.object({
  // At least one aggregation group must be declared on the BAN screen
  aggregation_groups: z.array(aggregationGroupSchema).min(1),
  aggregation_filing_details: aggregationFilingDetailsSchema.optional(),
  qbi_no_prior_loss_or_suspended_loss_confirmed: z.literal(true).optional(),
});

type QbiAggregationInput = z.infer<typeof inputSchema>;

// ── Node class ────────────────────────────────────────────────────────────────

class QbiAggregationNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "qbi_aggregation";
  readonly inputSchema = inputSchema;
  // Aggregation elections are forwarded to form8995a so it can apply
  // Schedule B grouped §199A treatment.
  readonly outputNodes = new OutputNodes([form8995a]);

  compute(_ctx: NodeContext, rawInput: QbiAggregationInput): NodeResult {
    const input = inputSchema.parse(rawInput);

    return {
      outputs: [this.outputNodes.output(form8995a, {
        aggregation_groups: input.aggregation_groups,
        ...(input.aggregation_filing_details && {
          aggregation_filing_details: input.aggregation_filing_details,
        }),
        ...(input.qbi_no_prior_loss_or_suspended_loss_confirmed && {
          qbi_no_prior_loss_or_suspended_loss_confirmed: true,
        }),
      })],
    };
  }
}

export const qbiAggregation = new QbiAggregationNode();
