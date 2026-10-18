import { z } from "zod";
import type {
  NodeOutput,
  NodeResult,
} from "../../../../../../../core/types/tax-node.ts";
import { output, TaxNode } from "../../../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../../../core/types/output-nodes.ts";
import { schedule3 } from "../../../../intermediate/aggregation/general/return-assembly/schedule3/index.ts";
import type { NodeContext } from "../../../../../../../core/types/node-context.ts";

export const extensionPaymentEvidenceSchema = z.object({
  tax_year: z.number().int().min(2025),
  primary_ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/),
  spouse_ssn: z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/).optional(),
  // January 1 through the April 15 due date of the following year.
  payment_date: z.string().regex(/^\d{4}-(0[1-3]-\d{2}|04-(0[1-9]|1[0-5]))$/),
  amount: z.number().positive().int(),
  payment_confirmation_reference: z.string().trim().min(1),
  extension_request_reference: z.string().trim().min(1),
  extension_request_accepted_confirmed: z.literal(true),
}).strict().superRefine((source, context) => {
  const date = new Date(`${source.payment_date}T00:00:00Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== source.payment_date ||
    date.getUTCFullYear() !== source.tax_year + 1 ||
    source.payment_confirmation_reference === source.extension_request_reference
  ) {
    context.addIssue({
      code: "custom",
      message:
        "Extension payment needs a valid payment date and distinct reviewed references",
    });
  }
});

export const inputSchema = z.object({
  // Drake print flag: "X" = generate Form 4868. It has no tax effect; a
  // line 7 payment reaches Schedule 3 line 10 either way.
  produce_4868: z.string().optional(),
  // Line 4: estimate of total tax liability (must be ≥ 0)
  line_4_total_tax: z.number().nonnegative().optional(),
  // Line 5: estimate of total payments (must be ≥ 0; exclude line_7 amount)
  line_5_total_payments: z.number().nonnegative().optional(),
  // Line 7: amount remitted with this extension request (must be ≥ 0; no minimum)
  line_7_amount_paying: z.number().nonnegative().optional(),
  payment_evidence: extensionPaymentEvidenceSchema.optional(),
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

// Route the extension payment to Schedule 3 Line 10 — this is the only tax output
function extensionPaymentOutput(amountPaying: number): NodeOutput[] {
  if (amountPaying <= 0) return [];
  return [output(schedule3, { line10_amount_paid_extension: amountPaying })];
}

class EXTNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "ext";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([schedule3]);

  compute(ctx: NodeContext, input: EXTInput): NodeResult {
    const parsed = inputSchema.parse(input);
    const line7 = parsed.line_7_amount_paying ?? 0;

    if (
      line7 > 0 && (parsed.payment_evidence?.amount !== line7 ||
        parsed.payment_evidence.tax_year !== ctx.taxYear)
    ) {
      throw new Error(
        `Extension payment needs matching reviewed ${ctx.taxYear} payment evidence`,
      );
    }
    if (line7 === 0 && parsed.payment_evidence !== undefined) {
      throw new Error(
        "Extension payment evidence needs a positive line 7 amount",
      );
    }

    // Only routing output: line_7 amount flows to Schedule 3 Line 10
    // when the final return is filed (line_8, line_9, and Drake flags,
    // produce_4868 among them, are informational)
    const outputs = extensionPaymentOutput(line7);

    return { outputs };
  }
}

export const ext = new EXTNode();
