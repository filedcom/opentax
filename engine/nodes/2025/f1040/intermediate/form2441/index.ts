import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode, output } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";

// TY2025 constant — IRC §129(a)(2)
// Maximum employer-provided dependent care benefit excludable from gross income.
// MFS limit ($2,500) is handled by the f2441 input node where filing_status is available.
const EMPLOYER_EXCLUSION_LIMIT = 5000;

// ─── Schema ───────────────────────────────────────────────────────────────────

export const inputSchema = z.object({
  // Total employer-provided dependent care benefits from W-2 Box 10
  // (aggregated across all W-2s by the w2 input node)
  dep_care_benefits: z.number().nonnegative().optional(),
});

type Form2441Input = z.infer<typeof inputSchema>;

// ─── Pure helpers ─────────────────────────────────────────────────────────────

// Returns the amount of employer dep care benefits that exceeds the §129 exclusion.
// IRC §129(a)(2): up to $5,000 excludable; excess is included in gross income.
function taxableExcess(benefits: number): number {
  return Math.max(0, benefits - EMPLOYER_EXCLUSION_LIMIT);
}

// ─── Node class ───────────────────────────────────────────────────────────────

class Form2441Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form2441";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040]);

  compute(input: Form2441Input): NodeResult {
    const parsed = inputSchema.parse(input);
    const benefits = parsed.dep_care_benefits ?? 0;

    if (benefits === 0) {
      return { outputs: [] };
    }

    const taxable = taxableExcess(benefits);

    const outputs: NodeOutput[] = [];

    if (taxable > 0) {
      outputs.push(this.outputNodes.output(f1040, { line1e_taxable_dep_care: taxable }));
    }

    return { outputs };
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const form2441 = new Form2441Node();
