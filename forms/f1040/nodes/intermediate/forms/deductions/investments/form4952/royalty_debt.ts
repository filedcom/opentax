import { z } from "zod";
import { TSJ } from "../../../../../types.ts";
import { form4952DirectDebtTraceSchema } from "./debt_trace.ts";

const dollars = z.number().int().nonnegative();
export const royaltyDebtTraceSchema = form4952DirectDebtTraceSchema.omit({
  direct_taxable_securities_purchase: true,
}).extend({
  owner_tsj: z.enum([TSJ.T, TSJ.S]).optional(),
  direct_royalty_property_purchase: z.number().positive(),
  lender_2025_interest_total: dollars.positive(),
  property_description: z.string().trim().min(1).max(100),
  nonbusiness_portfolio_royalty: z.literal(true),
  personally_liable_for_debt: z.literal(true),
  no_loss_protection_or_reimbursement: z.literal(true),
  no_other_current_royalty_deductions_after_review: z.literal(true),
  royalty_source: z.object({
    payer_name: z.string().trim().min(1),
    payer_tin: z.string().regex(/^\d{9}$/),
    recipient_tin: z.string().regex(/^\d{9}$/),
    source_document_reference: z.string().trim().min(1),
    box2_gross_royalties: dollars.positive(),
  }).strict(),
}).strict();
export type RoyaltyDebtTrace = z.infer<typeof royaltyDebtTraceSchema>;

export function royaltyDebtInterest(trace: RoyaltyDebtTrace): number {
  const payments = trace.interest_payments;
  if (
    trace.owner_tin !== trace.royalty_source.recipient_tin ||
    trace.direct_purchase_date < trace.loan_date ||
    trace.borrowed_principal !== trace.direct_royalty_property_purchase ||
    payments.some((p) => p.payment_date < trace.loan_date) ||
    new Set(payments.map((p) => p.payment_id)).size !== payments.length ||
    Math.round(
        payments.reduce((sum, p) => sum + p.interest_amount, 0) * 100,
      ) !==
      trace.lender_2025_interest_total * 100
  ) {
    throw new Error(
      "Form 4952 royalty debt differs from owner, direct purchase or paid interest",
    );
  }
  return trace.lender_2025_interest_total;
}

export function royaltyDebtProperty(
  trace: RoyaltyDebtTrace,
  deduction: number,
) {
  return {
    tsj: trace.owner_tsj ?? TSJ.T,
    property_description: trace.property_description,
    property_type: 6 as const,
    activity_type: "D" as const,
    fair_rental_days: 0,
    personal_use_days: 0,
    rent_income: 0,
    royalties_income: trace.royalty_source.box2_gross_royalties,
    form_1099_payments_made: false,
    f1099m_royalty_source: trace.royalty_source,
    expense_other_interest: deduction,
    form4952_royalty_debt_loan_id: trace.loan_id,
  };
}
