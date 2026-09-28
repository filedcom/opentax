import { z } from "zod";
import type { ProvisionalScheduleCInterestPass } from "./two-stage.ts";

export const businessInterestExpenseRecordSchema = z.object({
  interest_payment_reference: z.string().trim().min(1),
  debt_proceeds_tracing_reference: z.string().trim().min(1),
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
