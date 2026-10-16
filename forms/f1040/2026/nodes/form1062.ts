import { z } from "zod";
import { OutputNodes } from "../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../core/types/node-context.ts";
import { type NodeResult, TaxNode } from "../../../../core/types/tax-node.ts";
import { form1062TaxSource2026Schema } from "../inputs/form1062-tax.ts";
import {
  calculateForm1062Installments2026,
  form1062InstallmentSource2026Schema,
} from "../inputs/form1062-installments.ts";
import type { Form1062Covenants2026 } from "../inputs/form1062-documents.ts";
import { extensionPaymentClaim2026Schema } from "../inputs/extension-payments.ts";

export const form1062Claim2026Schema = z.object({
  claim: z.object({
    election: form1062TaxSource2026Schema.shape.election,
    review: form1062TaxSource2026Schema.shape.review,
    installment_records: form1062InstallmentSource2026Schema,
  }).strict(),
}).strict();
// Retained sources and return destinations come only from preceding graph nodes.
const electionInputSchema = form1062TaxSource2026Schema.omit({
  election: true,
  review: true,
  return_lines: true,
}).merge(form1062TaxSource2026Schema.shape.return_lines).merge(
  form1062Claim2026Schema,
).partial().extend({
  marketplace_sources_present: z.literal(true).optional(),
  extension_payment_sources: extensionPaymentClaim2026Schema.shape.claim.shape
    .payments.element.array().optional(),
}).strict();
// An absent election must not impose its narrower audited tax scope on ordinary
// returns as additional source families are connected to the graph.
const inputSchema = z.union([
  z.object({ claim: z.undefined() }).passthrough(),
  // Preserve this known combination until compute can report the missing replay,
  // even when its newly enabled Schedule 2 amount exceeds the zero-only contract.
  z.object({
    claim: form1062Claim2026Schema.shape.claim,
    marketplace_sources_present: z.literal(true),
  }).passthrough(),
  electionInputSchema,
]);

/** Internal draft route. The unbound registry cannot post an election. */
export class Form1062Node2026 extends TaxNode<typeof inputSchema> {
  readonly nodeType = "form1062";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);
  override get outputNodeTypes() {
    return ["schedule3_final", "f1040"];
  }
  constructor(private readonly covenants?: Form1062Covenants2026) {
    super();
  }
  compute(ctx: NodeContext, raw: z.input<typeof inputSchema>): NodeResult {
    if (ctx.taxYear !== 2026 || ctx.formType !== "f1040") {
      throw new Error("Form 1062 needs f1040:2026 context");
    }
    const parsed = inputSchema.parse(raw);
    if (!parsed.claim) return { outputs: [] };
    if (parsed.marketplace_sources_present) {
      throw new Error(
        "Form 1062 Marketplace sources need a hypothetical-income and premium-deduction replay",
      );
    }
    const input = electionInputSchema.required({ claim: true }).parse(parsed);
    if (!this.covenants) {
      throw new Error("Form 1062 needs execution-bound covenant PDF copies");
    }
    const {
      claim,
      income_tax,
      amt,
      care,
      education,
      child,
      schedule2,
      schedule_r,
      extension_payment_sources,
      ...return_lines
    } = input;
    const source = form1062TaxSource2026Schema.parse({
      election: claim.election,
      review: claim.review,
      income_tax,
      amt,
      care,
      education,
      child,
      schedule2,
      schedule_r,
      return_lines,
    });
    const ledger = calculateForm1062Installments2026(
      source,
      claim.installment_records,
    );
    const tax = ledger.tax;
    this.covenants.assertMatches(tax.qualification.covenant_claims);
    if (ledger.election.status === "late_review_required") {
      throw new Error(
        "Form 1062 late election needs review before draft settlement",
      );
    }
    if (ledger.payment_or_acceleration_review_required) {
      throw new Error(
        "Form 1062 payment or acceleration review must precede draft settlement",
      );
    }
    if (ledger.rounding_reconciliation_required) {
      throw new Error(
        "Form 1062 installment rounding needs reconciliation before draft settlement",
      );
    }
    // An allocation in the tax account is not itself a return payment category.
    // Match supported first-installment payments to actual extension receipts;
    // the extension owner credits the FULL receipt once on Schedule 3 line 10.
    if (
      extension_payment_sources?.some((p) =>
        p.evidence.payment_date > ledger.source_input.as_of
      )
    ) {
      throw new Error(
        "Form 1062 payment sources are later than the ledger review",
      );
    }
    for (const payment of ledger.source_input.payments) {
      const receipt = extension_payment_sources?.find((p) =>
        p.evidence.payment_confirmation_reference === payment.record_reference
      );
      if (
        !receipt || payment.allocations.some((a) => a.installment !== 1) ||
        receipt.account_record_reference !== payment.account_record_reference ||
        receipt.evidence.payment_date !== payment.effective_on ||
        receipt.evidence.amount * 100 < payment.amount_cents ||
        receipt.evidence.extension_request_reference !==
          ledger.source_input.extension?.record_reference
      ) {
        throw new Error(
          "Form 1062 paid installments need reconciled current-return payment sources",
        );
      }
    }
    return {
      outputs: [
        {
          nodeType: this.nodeType,
          fields: {
            calculation_2026: tax,
            installment_ledger_2026: ledger,
            file_form1062: true,
          },
        },
        {
          nodeType: "schedule3_final",
          fields: { line13e_section1062_tax: tax.lines.line14 },
        },
        { nodeType: "f1040", fields: { form1062_line15: tax.lines.line15 } },
      ],
    };
  }
}
export const form1062_2026 = new Form1062Node2026();
