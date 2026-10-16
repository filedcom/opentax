import { z } from "zod";
const money = z.number().finite().nonnegative().max(
  Number.MAX_SAFE_INTEGER / 100,
);
const reference = z.string().trim().min(1);
const ssn = z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/);
const tin = z.string().regex(/^(?:\d{2}-?\d{7}|\d{3}-?\d{2}-?\d{4})$/);
const issued = {
  tax_year: z.literal(2026),
  source_document_reference: reference,
  recipient_ssn: ssn,
  payer_name: reference,
  payer_tin: tin,
  corrected: z.literal(false),
  box4_federal_withholding: money,
  wage_payments: z.array(
    z.object({ payment_reference: reference, gross_wages: money.positive() })
      .strict(),
  ).min(1),
  // This intake covers the compensation assigned to Form 8919. Other boxes
  // need their income owners; do not silently ignore an incomplete source.
  no_other_reportable_boxes_review_reference: reference,
};
export const employeePaymentSchema = z.discriminatedUnion("kind", [
  z.object({
    ...issued,
    kind: z.literal("1099nec"),
    box1a_nonemployee_compensation: money.positive(),
    box1b_cash_tips: z.literal(0),
    box1c_tipped_occupation_codes: z.array(z.string().regex(/^\d{3}$/)).min(1)
      .max(2).refine(
        (codes) => new Set(codes).size === codes.length,
        "Duplicate occupation code",
      ).optional(),
    box1d_qualified_overtime: z.literal(0),
    box3_excess_golden_parachute: z.literal(0),
  }).strict(),
  z.object({
    ...issued,
    kind: z.literal("1099misc"),
    box3_other_income: money.positive(),
    box13a_cash_tips: z.literal(0),
    box13b_tipped_occupation_codes: z.array(z.string().regex(/^\d{3}$/)).min(1)
      .max(2).refine(
        (codes) => new Set(codes).size === codes.length,
        "Duplicate occupation code",
      ).optional(),
    box14_qualified_overtime: z.literal(0),
  }).strict(),
  z.object({
    kind: z.literal("payment_record"),
    payment_reference: reference,
    source_document_reference: reference,
    recipient_ssn: ssn,
    payment_date: z.string().refine((value) => {
      if (!/^2026-\d{2}-\d{2}$/.test(value)) return false;
      const date = new Date(`${value}T00:00:00Z`);
      return !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value;
    }, "Employee payment must have a valid 2026 receipt date"),
    amount: money.positive(),
    no_information_return_received: z.literal(true),
  }).strict(),
]);
export type EmployeePayment2026 = z.infer<typeof employeePaymentSchema>;
export function employeePaymentAmount(record: EmployeePayment2026): number {
  return record.kind === "1099nec"
    ? record.box1a_nonemployee_compensation
    : record.kind === "1099misc"
    ? record.box3_other_income
    : record.amount;
}
