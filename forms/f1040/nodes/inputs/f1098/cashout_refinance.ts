import { z } from "zod";
import { createHash } from "node:crypto";

const retainedDocument = z.object({
  file_name: z.string().trim().regex(/^[^/\\]+\.json$/),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  bytes: z.instanceof(Uint8Array),
}).strict();

function reviewedDocument(
  document: z.infer<typeof retainedDocument>,
): Record<string, unknown> | undefined {
  if (createHash("sha256").update(document.bytes).digest("hex") !==
    document.sha256) return;
  try {
    const value = JSON.parse(new TextDecoder().decode(document.bytes));
    if (value && typeof value === "object" && !Array.isArray(value)) return value;
  } catch { /* A changed or unreadable retained record does not prove a claim. */ }
}

const monthlyRecord = z.object({
  month: z.number().int().min(1).max(12),
  opening_balance: z.number().int().nonnegative(),
  principal_paid_before_month_end: z.number().int().nonnegative(),
  closing_balance: z.number().int().nonnegative(),
  interest_paid: z.number().int().nonnegative(),
  lender_statement_reference: z.string().trim().min(1),
}).strict();

/** A single first-of-month refinance of one post-2017 acquisition mortgage. */
export const cashoutRefinanceReviewSchema = z.object({
  old_source_document_reference: z.string().trim().min(1),
  new_source_document_reference: z.string().trim().min(1),
  property_reference: z.string().trim().min(1),
  original_acquisition_closing_reference: z.string().trim().min(1),
  original_acquisition_property_reference: z.string().trim().min(1),
  original_acquisition_principal: z.number().int().positive(),
  refinance_closing_disclosure_reference: z.string().trim().min(1),
  refinance_property_reference: z.string().trim().min(1),
  old_loan_payoff_reference: z.string().trim().min(1),
  personal_cashout_use_ledger_reference: z.string().trim().min(1),
  closing_disbursements: z.array(
    z.object({
      purpose: z.enum([
        "old_acquisition_loan_payoff", "home_improvement", "personal_cashout",
      ]),
      amount: z.number().int().positive(),
      paid_on: z.string().regex(/^2025-(0[1-9]|1[0-2])-01$/),
      payment_record_reference: z.string().trim().min(1),
      payoff_receipt_reference: z.string().trim().min(1).optional(),
    }).strict(),
  ).min(2).max(3),
  cashout_use_records: z.array(
    z.object({
      amount: z.number().int().positive(),
      spent_on: z.string().regex(
        /^2025-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/,
      ),
      purpose: z.literal("personal_non_home_use"),
      bank_record_reference: z.string().trim().min(1),
      use_ledger_reference: z.string().trim().min(1),
    }).strict(),
  ).min(1),
  improvement_use_records: z.array(z.object({
    amount: z.number().int().positive(),
    spent_on: z.string().regex(/^2025-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/),
    property_reference: z.string().trim().min(1),
    contractor_invoice_reference: z.string().trim().min(1),
    contractor_payment_reference: z.string().trim().min(1),
    contractor_name: z.string().trim().min(1),
    invoice_ledger_reference: z.string().trim().min(1),
    substantial_improvement_description: z.string().trim().min(1),
    contractor_invoice_document: retainedDocument,
    contractor_payment_document: retainedDocument,
  }).strict()).min(1).optional(),
  home_improvement_invoice_ledger_reference: z.string().trim().min(1).optional(),
  new_loan_proceeds_to_home_improvement: z.number().int().positive().optional(),
  main_home_substantial_improvement_verified: z.literal(true).optional(),
  new_loan_proceeds_to_old_payoff: z.number().int().positive(),
  new_loan_proceeds_to_personal_cashout: z.number().int().positive(),
  refinance_month: z.number().int().min(2).max(12),
  closing_on_first_of_month_verified: z.literal(true),
  all_qualified_home_mortgages_included_verified: z.literal(true),
  no_other_advances_or_debt_categories_verified: z.literal(true),
  filing_status_verified: z.enum(["single", "mfj", "hoh", "qss"]),
  old_loan_months: z.array(monthlyRecord).min(1).max(11),
  new_loan_months: z.array(monthlyRecord).min(1).max(11),
}).strict();

type Review = z.infer<typeof cashoutRefinanceReviewSchema>;
type Loan = {
  source_document_reference?: string;
  box1_mortgage_interest: number;
  box1_current_year_deductible_interest?: number;
  box2_outstanding_principal?: number;
  box3_origination_date?: string;
  box1_deduction_workpaper_reference?: string;
  recipient_tin?: string;
  lender_name?: string;
  for_routing?: string;
  refinance?: boolean;
  binding_contract_exception?: boolean;
  dedm_override?: boolean;
  box6_points_paid?: number;
};

function validDate(value: string | undefined): Date | undefined {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value ?? "");
  if (!match) return;
  const year = Number(match[3]);
  const month = Number(match[1]);
  const day = Number(match[2]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) return;
  return date;
}

function completeRows(
  rows: Review["old_loan_months"],
  firstMonth: number,
  lastMonth: number,
  initialBalance: number,
): boolean {
  if (rows.length !== lastMonth - firstMonth + 1) return false;
  let balance = initialBalance;
  const references = new Set<string>();
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    if (
      row.month !== firstMonth + index || row.opening_balance !== balance ||
      row.opening_balance <= 0 ||
      row.principal_paid_before_month_end > row.opening_balance ||
      row.closing_balance !==
        row.opening_balance - row.principal_paid_before_month_end ||
      row.closing_balance <= 0 || row.interest_paid <= 0 ||
      references.has(row.lender_statement_reference)
    ) return false;
    references.add(row.lender_statement_reference);
    balance = row.closing_balance;
  }
  return true;
}

export function validateCashoutRefinanceReview(
  review: Review,
  items: readonly Loan[],
): boolean {
  const old = items.find((item) =>
    item.source_document_reference === review.old_source_document_reference
  );
  const fresh = items.find((item) =>
    item.source_document_reference === review.new_source_document_reference
  );
  const oldDate = validDate(old?.box3_origination_date);
  const newDate = validDate(fresh?.box3_origination_date);
  const month = review.refinance_month;
  const date = `2025-${String(month).padStart(2, "0")}-01`;
  const disbursements = review.closing_disbursements;
  const improvement = review.new_loan_proceeds_to_home_improvement ?? 0;
  const hasImprovement = improvement > 0;
  const personalDisbursement = disbursements[hasImprovement ? 2 : 1];
  const improvementDisbursement = hasImprovement ? disbursements[1] : undefined;
  const improvementRows = review.improvement_use_records ?? [];
  if (
    items.length !== 2 || !old || !fresh || old === fresh ||
    review.original_acquisition_property_reference !==
      review.property_reference ||
    review.refinance_property_reference !== review.property_reference ||
    !oldDate || !newDate ||
    oldDate < new Date("2017-12-16T00:00:00Z") ||
    oldDate >= new Date("2025-01-01T00:00:00Z") ||
    newDate.getUTCFullYear() !== 2025 ||
    newDate.getUTCMonth() + 1 !== month || newDate.getUTCDate() !== 1 ||
    disbursements.length !== (hasImprovement ? 3 : 2) ||
    disbursements[0].purpose !== "old_acquisition_loan_payoff" ||
    disbursements[0].amount !== review.new_loan_proceeds_to_old_payoff ||
    disbursements[0].payoff_receipt_reference !==
      review.old_loan_payoff_reference ||
    personalDisbursement?.purpose !== "personal_cashout" ||
    personalDisbursement.amount !==
      review.new_loan_proceeds_to_personal_cashout ||
    personalDisbursement.payoff_receipt_reference !== undefined ||
    (hasImprovement
      ? improvementDisbursement?.purpose !== "home_improvement" ||
        improvementDisbursement.amount !== improvement ||
        improvementDisbursement.payoff_receipt_reference !== undefined ||
        review.main_home_substantial_improvement_verified !== true ||
        !review.home_improvement_invoice_ledger_reference ||
        improvementRows.reduce((sum, row) => sum + row.amount, 0) !==
          improvement ||
        improvementRows.some((row) =>
          (() => {
            const invoice = reviewedDocument(
              row.contractor_invoice_document,
            );
            const payment = reviewedDocument(
              row.contractor_payment_document,
            );
            return !invoice || !payment ||
              invoice.document_type !== "contractor_invoice" ||
              invoice.contractor_name !== row.contractor_name ||
              invoice.billed_to_tin !== fresh.recipient_tin ||
              invoice.property_reference !== row.property_reference ||
              invoice.invoice_reference !==
                row.contractor_invoice_reference ||
              invoice.invoice_ledger_reference !==
                row.invoice_ledger_reference ||
              invoice.amount !== row.amount ||
              invoice.completed_on !== row.spent_on ||
              invoice.description !==
                row.substantial_improvement_description ||
              payment.document_type !== "bank_payment" ||
              payment.payer_tin !== fresh.recipient_tin ||
              payment.payee !== row.contractor_name ||
              payment.payment_reference !==
                row.contractor_payment_reference ||
              payment.amount !== row.amount ||
              payment.paid_on !== row.spent_on;
          })() ||
          row.property_reference !== review.property_reference ||
          row.invoice_ledger_reference !==
            review.home_improvement_invoice_ledger_reference ||
          row.contractor_payment_reference !==
            improvementDisbursement.payment_record_reference ||
          row.spent_on !== improvementDisbursement.paid_on ||
          !validDate(
            `${row.spent_on.slice(5, 7)}/${row.spent_on.slice(8, 10)}/2025`,
          ) || row.spent_on < date ||
          row.spent_on.slice(0, 7) !== date.slice(0, 7)
        ) ||
        new Set(improvementRows.map((row) => row.contractor_invoice_reference))
            .size !== improvementRows.length ||
        new Set(improvementRows.map((row) => row.contractor_payment_reference))
            .size !== improvementRows.length
      : improvementRows.length !== 0 ||
        review.home_improvement_invoice_ledger_reference !== undefined ||
        review.main_home_substantial_improvement_verified !== undefined) ||
    disbursements.some((row) => row.paid_on !== date) ||
    new Set(disbursements.map((row) => row.payment_record_reference)).size !==
      disbursements.length ||
    review.cashout_use_records.reduce((sum, row) => sum + row.amount, 0) !==
      review.new_loan_proceeds_to_personal_cashout ||
    review.cashout_use_records.some((row) =>
      row.use_ledger_reference !==
        review.personal_cashout_use_ledger_reference ||
      !validDate(
        `${row.spent_on.slice(5, 7)}/${row.spent_on.slice(8, 10)}/2025`,
      ) ||
      row.spent_on < date
    ) ||
    new Set(review.cashout_use_records.map((row) => row.bank_record_reference))
        .size !== review.cashout_use_records.length ||
    old.box2_outstanding_principal === undefined ||
    old.box2_outstanding_principal > review.original_acquisition_principal ||
    fresh.box2_outstanding_principal !==
      review.new_loan_proceeds_to_old_payoff +
        improvement + review.new_loan_proceeds_to_personal_cashout ||
    old.refinance === true || fresh.refinance !== true ||
    [old, fresh].some((item) =>
      (item.for_routing ?? "A") !== "A" ||
      !item.recipient_tin || !item.lender_name?.trim() ||
      !item.box1_deduction_workpaper_reference ||
      item.binding_contract_exception === true ||
      item.dedm_override === true || (item.box6_points_paid ?? 0) !== 0
    ) ||
    !completeRows(
      review.old_loan_months,
      1,
      month - 1,
      old.box2_outstanding_principal,
    ) ||
    !completeRows(
      review.new_loan_months,
      month,
      12,
      fresh.box2_outstanding_principal,
    ) ||
    review.old_loan_months.at(-1)?.closing_balance !==
      review.new_loan_proceeds_to_old_payoff ||
    review.old_loan_months.reduce((sum, row) => sum + row.interest_paid, 0) !==
      old.box1_mortgage_interest ||
    review.new_loan_months.reduce((sum, row) => sum + row.interest_paid, 0) !==
      fresh.box1_mortgage_interest
  ) return false;

  // Pub. 936 repayments extinguish nonacquisition debt before acquisition
  // debt. Keep interest timing independent: lender interest is paid on the
  // month's opening balance while the worksheet uses its closing balance.
  const ratio = cashoutRefinanceRatio(review);
  if (ratio === undefined) return false;
  const expectedTotal = Math.round(
    (old.box1_mortgage_interest + fresh.box1_mortgage_interest) * ratio,
  );
  const expectedOld = Math.round(old.box1_mortgage_interest * ratio);
  return old.box1_current_year_deductible_interest === expectedOld &&
    fresh.box1_current_year_deductible_interest === expectedTotal - expectedOld;
}

/** Pub. 936 Table 1 line 14, only after the complete source review passes. */
export function cashoutRefinanceRatio(review: Review): number | undefined {
  let personal = review.new_loan_proceeds_to_personal_cashout;
  let acquisition = review.new_loan_proceeds_to_old_payoff +
    (review.new_loan_proceeds_to_home_improvement ?? 0);
  let qualifiedNewClosing = 0;
  for (const row of review.new_loan_months) {
    const personalPaid = Math.min(
      personal,
      row.principal_paid_before_month_end,
    );
    personal -= personalPaid;
    acquisition -= row.principal_paid_before_month_end - personalPaid;
    if (acquisition < 0 || acquisition + personal !== row.closing_balance) {
      return undefined;
    }
    qualifiedNewClosing += acquisition;
  }
  const oldAverage = review.old_loan_months.reduce(
    (sum, row) => sum + row.closing_balance,
    0,
  ) / review.old_loan_months.length;
  const newAverage = review.new_loan_months.reduce(
    (sum, row) => sum + row.closing_balance,
    0,
  ) / 12;
  const qualifiedOldAverage = oldAverage;
  // Pub. 936 Example 1 divides mixed-use debt-category balances by twelve,
  // including zero months before closing. The old lender's single-use loan
  // retains its separate months-secured denominator.
  const qualifiedNewAverage = qualifiedNewClosing / 12;
  const ratio = Math.round(
    Math.min(750_000, qualifiedOldAverage + qualifiedNewAverage) /
      (oldAverage + newAverage) * 1000,
  ) / 1000;
  return ratio;
}
