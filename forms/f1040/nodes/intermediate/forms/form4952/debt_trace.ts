import { z } from "zod";
import { inputSchema } from "./index.ts";

const wholeDollars = z.number().int().positive().refine(Number.isSafeInteger);
const date2025 = z.string().regex(/^2025-\d{2}-\d{2}$/).refine(
  (date) => !Number.isNaN(Date.parse(`${date}T00:00:00Z`)) &&
    new Date(`${date}T00:00:00Z`).toISOString().startsWith(date),
);

/** A single direct-use borrowing, before independent source authentication. */
export const form4952DirectDebtTraceSchema = z.object({
  tax_year: z.literal(2025),
  owner_tin: z.string().regex(/^\d{9}$/),
  loan_id: z.string().trim().min(1),
  lender_statement_reference: z.string().trim().min(1),
  loan_agreement_reference: z.string().trim().min(1),
  disbursement_record_reference: z.string().trim().min(1),
  purchase_record_reference: z.string().trim().min(1),
  loan_date: date2025,
  direct_purchase_date: date2025,
  borrowed_principal: wholeDollars,
  direct_taxable_securities_purchase: wholeDollars,
  asset_id: z.string().trim().min(1),
  no_other_loan_proceeds_use: z.literal(true),
  no_tax_exempt_or_passive_activity_asset: z.literal(true),
  lender_2025_interest_total: wholeDollars,
  interest_payments: z.array(z.object({
    payment_id: z.string().trim().min(1),
    payment_date: date2025,
    payment_record_reference: z.string().trim().min(1),
    interest_amount: wholeDollars,
  }).strict()).min(1),
}).strict();

export type Form4952DirectDebtTrace = z.infer<
  typeof form4952DirectDebtTraceSchema
>;

/** Check the typed workpaper against the manual line-1 amount. */
export function reconcileForm4952DirectDebtTrace(
  rawTrace: unknown,
  rawForm4952Input: unknown,
  finalFilerTin: string,
): Form4952DirectDebtTrace {
  const trace = form4952DirectDebtTraceSchema.parse(rawTrace);
  const form = inputSchema.parse(rawForm4952Input);
  const paymentTotal = trace.interest_payments.reduce(
    (total, payment) => total + payment.interest_amount,
    0,
  );
  if (
    trace.owner_tin !== finalFilerTin ||
    trace.direct_purchase_date < trace.loan_date ||
    trace.direct_taxable_securities_purchase !== trace.borrowed_principal ||
    new Set(trace.interest_payments.map((row) => row.payment_id)).size !==
      trace.interest_payments.length ||
    trace.interest_payments.some((row) => row.payment_date < trace.loan_date) ||
    !Number.isSafeInteger(paymentTotal) ||
    paymentTotal !== trace.lender_2025_interest_total ||
    form.investment_interest_expense !== paymentTotal ||
    (form.source_k1_investment_interest !== undefined &&
      (Array.isArray(form.source_k1_investment_interest)
        ? form.source_k1_investment_interest.some((amount) => amount > 0)
        : form.source_k1_investment_interest > 0))
  ) {
    throw new Error(
      "Form 4952 direct-use debt trace differs from its owner, purchase, payments, or line 1",
    );
  }
  return trace;
}
