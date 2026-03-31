import { z } from "zod";
import type { NodeResult } from "../../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";

// Qualified Dividends and Capital Gain Tax Worksheet (QDCGTW)
// Stub node — accepts line18_28pct_gain from rate_28_gain_worksheet.
// Full preferential rate computation deferred to a future phase.

// ─── Schema ───────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // From rate_28_gain_worksheet: net 28% rate gain (Schedule D Tax Worksheet line 18).
  line18_28pct_gain: z.number().nonnegative().optional(),
});

type QdcgtwInput = z.infer<typeof inputSchema>;

// ─── Node class ───────────────────────────────────────────────────────────────

class QdcgtwNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "qdcgtw";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, rawInput: QdcgtwInput): NodeResult {
    inputSchema.parse(rawInput);
    return { outputs: [] };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const qdcgtw = new QdcgtwNode();
