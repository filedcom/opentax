import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { qdcgtw } from "../qdcgtw/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// line18_28pct_gain routes to the QDCGTW node.

// ─── Schema ───────────────────────────────────────────────────────────────────

// 28% Rate Gain Worksheet — IRC §1(h)(5) collectibles and §1(h)(7) Section 1202
//
// Inputs arrive from two upstream nodes:
//   • schedule_d: LT gains with Form 8949 adjustment codes C (collectibles) or
//     Q (QOF / Section 1202 partial exclusion). Pre-filtered to positive gains only.
//   • f1099div: Collectibles gain distributions from 1099-DIV box 2d.
//
// The worksheet aggregates both sources to produce the net 28% rate gain amount
// (Schedule D Tax Worksheet line 18).

export const inputSchema = z.object({
  // From schedule_d: net long-term collectibles/1202 gains from Form 8949
  // (adjustment codes C or Q). Always positive when present — schedule_d only
  // routes this field when compute28PctGain > 0.
  collectibles_gain_from_8949: z.number().nonnegative().optional(),

  // From f1099div: collectibles gain distributions (1099-DIV box 2d).
  collectibles_gain: z.number().nonnegative().optional(),
});

type Rate28GainInput = z.infer<typeof inputSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

// Worksheet line 3: net 28% rate gain = line 1 (8949) + line 2 (1099-DIV)
function netGain(input: Rate28GainInput): number {
  return (input.collectibles_gain_from_8949 ?? 0) + (input.collectibles_gain ?? 0);
}

function hasAnyGain(input: Rate28GainInput): boolean {
  return (input.collectibles_gain_from_8949 ?? 0) > 0 || (input.collectibles_gain ?? 0) > 0;
}

// ─── Node class ───────────────────────────────────────────────────────────────

class Rate28GainWorksheetNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "rate_28_gain_worksheet";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([qdcgtw]);

  compute(_ctx: NodeContext, rawInput: Rate28GainInput): NodeResult {
    const input = inputSchema.parse(rawInput);

    if (!hasAnyGain(input)) {
      return { outputs: [] };
    }

    return {
      outputs: [
        {
          nodeType: qdcgtw.nodeType,
          fields: { line18_28pct_gain: netGain(input) },
        },
      ],
    };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const rate_28_gain_worksheet = new Rate28GainWorksheetNode();
