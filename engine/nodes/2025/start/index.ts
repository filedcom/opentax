import { z } from "zod";
import type { NodeResult } from "../../../core/types/tax-node.ts";
import { TaxNode } from "../../../core/types/tax-node.ts";
import { w2 } from "../source-docs/w2/index.ts";

const inputSchema = z.object({
  w2s: z.array(z.object({ box1: z.number() })).optional(),
});

class StartNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "start";
  readonly inputSchema = inputSchema;
  readonly outputNodeTypes = [w2.nodeType] as const;

  compute(input: z.infer<typeof inputSchema>): NodeResult {
    const w2s = input.w2s ?? [];
    if (w2s.length === 0) {
      return { outputs: [] };
    }
    if (w2s.length === 1) {
      return {
        outputs: [{ nodeType: w2.nodeType, input: w2s[0] }],
      };
    }
    // Multiple W-2s: emit suffixed nodeType IDs so planner+executor route correctly
    return {
      outputs: w2s.map((w2Data, i) => ({
        nodeType: `${w2.nodeType}_${String(i + 1).padStart(2, "0")}`,
        input: w2Data,
      })),
    };
  }
}

export const start = new StartNode();
