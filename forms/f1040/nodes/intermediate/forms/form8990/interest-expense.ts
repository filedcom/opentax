import { z } from "zod";
import type { ProvisionalScheduleCInterestPass } from "./two-stage.ts";

const debtProceedsTraceSchema = z.object({
  source_reference: z.string().trim().min(1),
  debt_disbursed_on: z.string().date(),
  gross_proceeds: z.number().int().finite().positive().max(999_999_999_999_999),
  business_uses: z.array(
    z.object({
      expenditure_document_reference: z.string().trim().min(1),
      spent_on: z.string().date(),
      amount: z.number().int().finite().positive().max(999_999_999_999_999),
      business_reference: z.string().trim().min(1),
    }).strict(),
  ).min(1),
}).strict().superRefine((trace, context) => {
  const spent = trace.business_uses.reduce((sum, use) => sum + use.amount, 0);
  if (
    trace.debt_disbursed_on > "2025-12-31" ||
    trace.business_uses.some((use) =>
      use.spent_on < trace.debt_disbursed_on || use.spent_on > "2025-12-31"
    ) ||
    new Set(
        trace.business_uses.map((use) => use.expenditure_document_reference),
      ).size !== trace.business_uses.length ||
    !Number.isSafeInteger(spent) || spent !== trace.gross_proceeds
  ) {
    context.addIssue({
      code: "custom",
      message:
        "Form 8990 debt proceeds must be fully traced to distinct, dated business expenditures",
    });
  }
});

export const businessInterestExpenseRecordSchema = z.object({
  interest_payment_reference: z.string().trim().min(1),
  debt_proceeds_trace: debtProceedsTraceSchema,
  debtor_taxpayer_ssn: z.string().regex(/^\d{9}$/),
  lender_ein: z.string().regex(/^\d{9}$/),
  debt_account_reference: z.string().trim().min(1),
  business_reference: z.string().trim().min(1),
  allocation: z.literal("nonexcepted_schedule_c_business"),
  interest_paid_amount: z.number().int().finite().positive().max(
    999_999_999_999_999,
  ),
  line16b_business_interest_amount: z.number().int().finite().positive().max(
    999_999_999_999_999,
  ),
}).strict().superRefine((record, context) => {
  if (record.interest_paid_amount !== record.line16b_business_interest_amount) {
    context.addIssue({
      code: "custom",
      message:
        "Form 8990 bounded route needs wholly business-allocated interest payments",
    });
  }
  if (
    record.debt_proceeds_trace.business_uses.some((use) =>
      use.business_reference !== record.business_reference
    )
  ) {
    context.addIssue({
      code: "custom",
      message: "Form 8990 debt proceeds use differs from Schedule C business",
    });
  }
});

export type BusinessInterestExpenseRecord = z.infer<
  typeof businessInterestExpenseRecordSchema
>;

/**
 * Only debt traced to this nonexcepted Schedule C business enters the bounded
 * section 163(j) calculation. Document references are review leads, not proof
 * that the underlying debt and interest statements have been authenticated.
 */
export function reconcileBusinessInterestExpenseRecords(
  provisional: ProvisionalScheduleCInterestPass,
  currentTaxpayerSsn: string,
  raw: unknown,
): readonly BusinessInterestExpenseRecord[] {
  const records = z.array(businessInterestExpenseRecordSchema).min(1).parse(
    raw,
  );
  const payments = new Set(
    records.map((record) => record.interest_payment_reference),
  );
  if (payments.size !== records.length) {
    throw new Error("Form 8990 interest payment references are duplicated");
  }
  if (
    !/^\d{9}$/.test(currentTaxpayerSsn) ||
    records.some((record) => record.debtor_taxpayer_ssn !== currentTaxpayerSsn)
  ) {
    throw new Error("Form 8990 traced debt owner differs from current return");
  }
  const accountByTracing = new Map<string, string>();
  const tracingByAccount = new Map<string, string>();
  const traceByAccount = new Map<string, string>();
  const accountByExpenditure = new Map<string, string>();
  for (const record of records) {
    const account = `${record.lender_ein}:${record.debt_account_reference}`;
    const tracing = record.debt_proceeds_trace.source_reference;
    const trace = JSON.stringify(record.debt_proceeds_trace);
    if (
      (accountByTracing.has(tracing) &&
        accountByTracing.get(tracing) !== account) ||
      (tracingByAccount.has(account) &&
        tracingByAccount.get(account) !== tracing) ||
      (traceByAccount.has(account) && traceByAccount.get(account) !== trace) ||
      record.debt_proceeds_trace.business_uses.some((use) =>
        accountByExpenditure.has(use.expenditure_document_reference) &&
        accountByExpenditure.get(use.expenditure_document_reference) !==
          account
      )
    ) {
      throw new Error(
        "Form 8990 traced debt account and workpaper references conflict",
      );
    }
    accountByTracing.set(tracing, account);
    tracingByAccount.set(account, tracing);
    traceByAccount.set(account, trace);
    for (const use of record.debt_proceeds_trace.business_uses) {
      accountByExpenditure.set(use.expenditure_document_reference, account);
    }
  }
  if (
    records.some((record) =>
      record.business_reference !== provisional.interest.businessReference
    )
  ) {
    throw new Error("Form 8990 debt tracing differs from Schedule C business");
  }
  const total = records.reduce(
    (sum, record) => sum + record.line16b_business_interest_amount,
    0,
  );
  if (
    !Number.isSafeInteger(total) ||
    total !== provisional.interest.currentYearBusinessInterestExpense
  ) {
    throw new Error(
      "Form 8990 traced interest does not match Schedule C line 16b",
    );
  }
  return records;
}
