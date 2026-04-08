import { z } from "zod";
import type { NodeOutput, NodeResult } from "../../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../core/types/output-nodes.ts";
import { income_tax_calculation } from "../income_tax_calculation/index.ts";
import type { NodeContext } from "../../../../../../core/types/node-context.ts";

// Qualified Dividends and Capital Gain Tax Worksheet (QDCGTW)
//
// Receives 28% rate gain (collectibles) and unrecaptured §1250 gain from
// upstream worksheets and forwards them to income_tax_calculation so the
// Schedule D Tax Worksheet rates (25%/28%) are applied per IRC §1(h).
//
// income_tax_calculation already implements the full QDCGT/Schedule D
// Tax Worksheet internally, including the 25% and 28% tiers.

// ─── Schema ───────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // From rate_28_gain_worksheet: net 28% rate gain (Schedule D Tax Worksheet line 18).
  line18_28pct_gain: z.number().nonnegative().optional(),
  // Unrecaptured §1250 gain (Schedule D Tax Worksheet line 19).
  line19_unrecaptured_1250: z.number().nonnegative().optional(),
});

type QdcgtwInput = z.infer<typeof inputSchema>;

// ─── Node class ───────────────────────────────────────────────────────────────

class QdcgtwNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "qdcgtw";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([income_tax_calculation]);

  compute(_ctx: NodeContext, rawInput: QdcgtwInput): NodeResult {
    const input = inputSchema.parse(rawInput);

    const rate28 = input.line18_28pct_gain ?? 0;
    const unrecaptured1250 = input.line19_unrecaptured_1250 ?? 0;

    if (rate28 === 0 && unrecaptured1250 === 0) {
      return { outputs: [] };
    }

    const outputs: NodeOutput[] = [];
    if (rate28 > 0) {
      outputs.push(output(income_tax_calculation, { rate_28_gain: rate28 }));
    }
    if (unrecaptured1250 > 0) {
      outputs.push(output(income_tax_calculation, { unrecaptured_1250_gain: unrecaptured1250 }));
    }

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const qdcgtw = new QdcgtwNode();
