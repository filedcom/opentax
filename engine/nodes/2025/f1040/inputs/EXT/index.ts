import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../intermediate/schedule3/index.ts";

export const inputSchema = z.object({
  // Master switch — "X" = generate Form 4868; any other value or absent = do not generate
  produce_4868: z.string().optional(),
  // Line 4: estimate of total tax liability (must be ≥ 0)
  line_4_total_tax: z.number().nonnegative().optional(),
  // Line 5: estimate of total payments (must be ≥ 0; exclude line_7 amount)
  line_5_total_payments: z.number().nonnegative().optional(),
  // Line 7: amount remitted with this extension request (must be ≥ 0; no minimum)
  line_7_amount_paying: z.number().nonnegative().optional(),
  // Line 8: out-of-country checkbox — informational only, no tax routing
  line_8_out_of_country: z.boolean().optional(),
  // Line 9: 1040-NR filer with no U.S. wage withholding — informational only
  line_9_1040nr_no_wages: z.boolean().optional(),
  // Drake EF flag: switches from 4868 transmission mode to 1040 mode — no tax effect
  extension_previously_filed: z.boolean().optional(),
  // Drake print flag: generate Form 1040-V payment voucher — no tax effect
  produce_1040v: z.boolean().optional(),
  // Override amount shown on 1040-V voucher — does NOT affect Form 4868 or schedule3
  amount_on_1040v: z.number().nonnegative().optional(),
});

type EXTInput = z.infer<typeof inputSchema>;

// line_6_balance_due = MAX(0, line_4 - line_5) — display-only computed field
function balanceDue(line4: number, line5: number): number {
  return Math.max(0, line4 - line5);
}

// Route the extension payment to Schedule 3 Line 10 — this is the only tax output
function extensionPaymentOutput(amountPaying: number): NodeOutput[] {
  if (amountPaying <= 0) return [];
  return [{
    nodeType: schedule3.nodeType,
    fields: { line10_amount_paid_extension: amountPaying },
  }];
}

class EXTNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "ext";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3]);

  compute(input: EXTInput): NodeResult {
    const parsed = inputSchema.parse(input);

    // Master switch: without produce_4868 = "X", nothing is generated
    if (parsed.produce_4868 !== "X") {
      return { outputs: [] };
    }

    const line4 = parsed.line_4_total_tax ?? 0;
    const line5 = parsed.line_5_total_payments ?? 0;
    const line7 = parsed.line_7_amount_paying ?? 0;

    // line_6 is computed for display purposes; not emitted as a tax output
    const _line6 = balanceDue(line4, line5);

    // Only routing output: line_7 amount flows to Schedule 3 Line 10
    // when the final return is filed (line_8, line_9, and Drake flags are informational)
    const outputs = extensionPaymentOutput(line7);

    return { outputs };
  }
}

export const ext = new EXTNode();
