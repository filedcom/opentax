import { z } from "zod";
import {
  calculateExtensionPayment,
  extensionPaymentEvidenceSchemaForYear,
} from "../../nodes/inputs/payments/estimated/ext/index.ts";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";
import type { NodeContext } from "../../../../core/types/node-context.ts";

export const extensionPaymentClaim2026Schema = z.object({
  claim: z.object({
    record_reference: z.string().trim().min(1),
    payments: z.array(
      z.object({
        evidence: extensionPaymentEvidenceSchemaForYear(2026),
        account_record_reference: z.string().trim().min(1),
      }).strict(),
    ).min(1),
  }).strict(),
}).strict();
const tin = z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/);
const inputSchema = extensionPaymentClaim2026Schema.partial().extend({
  taxpayer_ssn: tin,
  spouse_ssn: tin.optional(),
}).strict();
export function calculateExtensionPayments2026(
  raw: z.input<typeof inputSchema>,
) {
  const input = inputSchema.parse(raw);
  const references = new Set<string>();
  const normalize = (tin: string | undefined) => tin?.replaceAll("-", "");
  let total = 0;
  for (const { evidence } of input.claim?.payments ?? []) {
    if (
      normalize(evidence.primary_ssn) !== normalize(input.taxpayer_ssn) ||
      normalize(evidence.spouse_ssn) !== normalize(input.spouse_ssn)
    ) throw new Error("Extension payment evidence belongs to another return");
    if (references.has(evidence.payment_confirmation_reference)) {
      throw new Error("Duplicate extension payment confirmation");
    }
    references.add(evidence.payment_confirmation_reference);
    const shared = calculateExtensionPayment({
      produce_4868: "X",
      line_7_amount_paying: evidence.amount,
      payment_evidence: evidence,
    }, 2026);
    total += Number(
      shared.outputs[0]?.fields.line10_amount_paid_extension ?? 0,
    );
  }
  if (!Number.isSafeInteger(total * 100)) {
    throw new Error("Extension payment total exceeds safe cent precision");
  }
  return { source_input: input, line10_amount_paid_extension: total };
}
class ExtensionPayments2026 extends TaxNode<typeof inputSchema> {
  readonly nodeType = "extension_payments";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);
  override get outputNodeTypes() {
    return ["schedule3_final", "form1062"];
  }
  compute(ctx: NodeContext, raw: z.input<typeof inputSchema>): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("Extension payments need f1040:2026 context");
    }
    const calculation = calculateExtensionPayments2026(raw);
    return {
      outputs: [
        { nodeType: this.nodeType, fields: { calculation_2026: calculation } },
        {
          nodeType: "schedule3_final",
          fields: {
            line10_amount_paid_extension:
              calculation.line10_amount_paid_extension,
          },
        },
        {
          nodeType: "form1062",
          fields: {
            extension_payment_sources:
              calculation.source_input.claim?.payments ?? [],
          },
        },
      ],
    };
  }
}
export const extension_payments_2026 = new ExtensionPayments2026();
