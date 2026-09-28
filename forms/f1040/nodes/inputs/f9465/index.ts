import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Bounded Form 9465 request attached to this TY2025 Form 1040. The old
// all-optional payment-instruction shape is replaced, not accepted as an alias.
const positiveWholeDollar = z.number().refine(
  (amount) => Number.isSafeInteger(amount) && amount > 0,
  "Form 9465 amount must be a positive safe whole-dollar amount",
);
const reviewDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(
  (value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(date.getTime()) &&
      date.toISOString().slice(0, 10) === value;
  },
  "Form 9465 review date must be a valid calendar date",
);

export const inputSchema = z.object({
  filing_mode: z.literal("attached_2025_1040"),
  tax_year: z.literal(2025),
  reviewed_source: z.object({
    reviewed_by: z.string().trim().min(1),
    reviewed_on: reviewDate,
    final_form1040_reference: z.string().trim().min(1),
    irs_account_review_reference: z.string().trim().min(1),
    // This bound handles only the current return, not older notices or debts.
    no_other_tax_period_balance_confirmed: z.literal(true),
    no_payment_with_request_confirmed: z.literal(true),
    cannot_pay_in_full_within_180_days_confirmed: z.literal(true),
    no_existing_installment_agreement_confirmed: z.literal(true),
    no_default_in_last_12_months_confirmed: z.literal(true),
    no_bankruptcy_or_offer_in_compromise_confirmed: z.literal(true),
    address_unchanged_since_last_return_confirmed: z.literal(true),
    taxpayer_authorized_attached_request_confirmed: z.literal(true),
  }).strict(),
  final_1040_line37_amount_owed: positiveWholeDollar.refine(
    (amount) => amount <= 25_000,
    "Form 9465 bounded request cannot exceed $25,000",
  ),
  proposed_monthly_payment: positiveWholeDollar,
  payment_due_day: z.number().int().min(1).max(28),
  payment_method: z.literal("manual_monthly_payment"),
}).strict().superRefine((input, context) => {
  if (
    input.proposed_monthly_payment <
      Math.ceil(input.final_1040_line37_amount_owed / 72)
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["proposed_monthly_payment"],
      message:
        "Form 9465 proposed monthly payment must meet the 72-month amount",
    });
  }
});

class F9465Node extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f9465";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    inputSchema.parse(input);
    // The request does not change tax or count as payment. Export remains
    // blocked until its native and PDF documents are both reconciled.
    return { outputs: [] };
  }
}

export const f9465 = new F9465Node();
