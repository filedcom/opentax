import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { FilingStatus } from "../../types.ts";
import { normalizeArray } from "../../utils.ts";
import { schedule1 } from "../../outputs/schedule1/index.ts";

// ─── Schema ───────────────────────────────────────────────────────────────────

// Accumulation pattern: multiple upstream nodes (schedule_c, schedule_e, schedule_f)
// may each contribute an excess_business_loss. The executor merges them into a scalar
// or array before calling compute().
const accumulable = <T extends z.ZodTypeAny>(schema: T) =>
  z.union([schema, z.array(schema)]);

export const inputSchema = z.object({
  // Pre-computed excess business loss from each upstream source (IRC §461(l))
  excess_business_loss: accumulable(z.number().nonnegative()).optional(),
  // Filing status — informational; threshold check is done upstream
  filing_status: z.nativeEnum(FilingStatus).optional(),
});

type Form461Input = z.infer<typeof inputSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────


function totalExcessLoss(input: Form461Input): number {
  return normalizeArray(input.excess_business_loss).reduce((sum, n) => sum + n, 0);
}

// ─── Node class ───────────────────────────────────────────────────────────────

class Form461Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form461";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule1]);

  compute(rawInput: Form461Input): NodeResult {
    const input = inputSchema.parse(rawInput);
    const total = totalExcessLoss(input);

    if (total === 0) {
      return { outputs: [] };
    }

    // Per IRC §461(l) and IRS Form 461 Line 16 instructions:
    // The excess business loss is reported as positive "other income" on
    // Schedule 1 Line 8p (with "ELA" notation), increasing taxable income.
    // It then becomes an NOL carryforward via Form 172 for subsequent years.
    return {
      outputs: [
        this.outputNodes.output(schedule1, { line8p_excess_business_loss: total }),
      ],
    };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const form461 = new Form461Node();
