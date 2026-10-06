import { z } from "zod";

const exactMoney = (amount: number) =>
  Number.isFinite(amount) && Number.isSafeInteger(Math.round(amount * 100)) &&
  Math.round(amount * 100) / 100 === amount;
const positiveMoney = z.number().positive().refine(exactMoney);
const date2025 = z.string().regex(/^2025-\d{2}-\d{2}$/).refine((date) =>
  !Number.isNaN(Date.parse(`${date}T00:00:00Z`)) &&
  new Date(`${date}T00:00:00Z`).toISOString().startsWith(date)
);

const bondDebtTrace = z.object({
  tax_year: z.literal(2025),
  owner_tin: z.string().regex(/^\d{9}$/),
  bond_identifier: z.string().trim().min(1),
  loan_id: z.string().trim().min(1),
  lender_statement_reference: z.string().trim().min(1),
  loan_agreement_reference: z.string().trim().min(1),
  disbursement_record_reference: z.string().trim().min(1),
  purchase_record_reference: z.string().trim().min(1),
  loan_date: date2025,
  direct_purchase_date: date2025,
  borrowed_principal: positiveMoney,
  direct_bond_purchase: positiveMoney,
  no_other_loan_proceeds_use: z.literal(true),
  investment_use_maintained_through_2025: z.literal(true),
  lender_2025_interest_total: positiveMoney,
  interest_payments: z.array(
    z.object({
      payment_id: z.string().trim().min(1),
      payment_date: date2025,
      payment_record_reference: z.string().trim().min(1),
      interest_amount: positiveMoney,
    }).strict(),
  ).min(1),
}).strict();

/** Reviewed per-copy expense that would be deductible if PAB interest were taxable. */
export const pabAllocableDeductionWorkpaperSchema = z.object({
  tax_year: z.literal(2025),
  reviewed_workpaper_reference: z.string().trim().min(1),
  expense_record_reference: z.string().trim().min(1),
  allocable_deduction: z.number().int().nonnegative(),
  direct_allocation_to_reported_bond: z.literal(true),
  deductible_if_interest_taxable: z.literal(true),
  not_claimed_elsewhere_on_return: z.literal(true),
  expense_classification: z.literal("bond_debt_interest").optional(),
  bond_debt_trace: bondDebtTrace.optional(),
}).strict().superRefine((paper, context) => {
  if (paper.allocable_deduction === 0) {
    if (paper.expense_classification || paper.bond_debt_trace) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Zero PAB expense cannot claim a paid expense record",
      });
    }
    return;
  }
  // A line-2g-only source can retain its already reviewed allocable expense
  // without claiming the separate investment-interest refigure. The latter
  // requires a classified paid bond loan below.
  if (!paper.expense_classification && !paper.bond_debt_trace) return;
  if (
    paper.expense_classification === "bond_debt_interest" &&
    paper.bond_debt_trace
  ) return;
  context.addIssue({
    code: z.ZodIssueCode.custom,
    message: "Positive PAB expense needs one matching classified paid record",
  });
});

export type PabAllocableDeductionWorkpaper = z.infer<
  typeof pabAllocableDeductionWorkpaperSchema
>;

/** Match the allocable amount to a dated payment and the same owned bond. */
export function reconcilePabPaidExpense(
  paper: PabAllocableDeductionWorkpaper,
  bondIdentifier: string,
  ownerTin: string,
): void {
  if (paper.allocable_deduction === 0) return;
  const trace = paper.bond_debt_trace;
  if (paper.expense_classification !== "bond_debt_interest" || !trace) {
    throw new Error(
      "AMT Form 4952 PAB expense needs a paid bond-debt interest trace",
    );
  }
  if (trace) {
    const paymentCents = trace.interest_payments.reduce(
      (total, row) => total + Math.round(row.interest_amount * 100),
      0,
    );
    if (
      trace.owner_tin !== ownerTin ||
      trace.bond_identifier !== bondIdentifier ||
      trace.direct_purchase_date < trace.loan_date ||
      Math.round(trace.borrowed_principal * 100) !==
        Math.round(trace.direct_bond_purchase * 100) ||
      trace.lender_statement_reference !== paper.expense_record_reference ||
      !Number.isSafeInteger(paymentCents) ||
      paymentCents !== Math.round(trace.lender_2025_interest_total * 100) ||
      paymentCents !== Math.round(paper.allocable_deduction * 100) ||
      new Set(trace.interest_payments.map((row) => row.payment_id)).size !==
        trace.interest_payments.length ||
      new Set(
          trace.interest_payments.map((row) => row.payment_record_reference),
        )
          .size !== trace.interest_payments.length ||
      trace.interest_payments.some((row) => row.payment_date < trace.loan_date)
    ) {
      throw new Error(
        "PAB bond-debt interest needs matched purchase and paid loan records",
      );
    }
  }
}
