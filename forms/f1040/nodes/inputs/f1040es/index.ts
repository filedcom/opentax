import { z } from "zod";
import type { NodeResult } from "../../../../../core/types/tax-node.ts";
import { TaxNode } from "../../../../../core/types/tax-node.ts";
import { OutputNodes } from "../../../../../core/types/output-nodes.ts";
import { f1040 } from "../../outputs/f1040/index.ts";
import type { NodeContext } from "../../../../../core/types/node-context.ts";

// Form 1040-ES — Estimated Tax for Individuals
// Captures quarterly estimated tax payments made during the year.
// Total payments are forwarded to Form 1040 line 26.
// IRS Form 1040-ES instructions: https://www.irs.gov/pub/irs-pdf/f1040es.pdf

const ssn = z.string().regex(/^\d{3}-?\d{2}-?\d{4}$/);
const reference = z.string().trim().min(1);
const quarterPaymentSchema = z.object({
  quarter: z.enum(["q1", "q2", "q3", "q4"]),
  amount: z.number().positive(),
  payer_tin: ssn,
  payment_date: z.string().date(),
  payment_record_reference: reference,
}).strict();
const jointPaymentRowSchema = z.object({
  quarter: z.enum(["q1", "q2", "q3", "q4"]),
  joint_payment_amount: z.number().int().positive(),
  taxpayer_allocated_amount: z.number().int().positive(),
  former_spouse_allocated_amount: z.number().int().nonnegative(),
  payment_date: z.string().date(),
  payment_record_reference: reference,
}).strict();
const mfsJointPaymentRowSchema = jointPaymentRowSchema.omit({
  former_spouse_allocated_amount: true,
}).extend({ spouse_allocated_amount: z.number().int().nonnegative() }).strict();

const divorcedJointAllocationSchema = z.object({
  allocation_method: z.literal("signed_mutual_agreement"),
  divorce_date_2025: z.string().date().refine((value) =>
    value.startsWith("2025-")
  ),
  taxpayer_ssn: ssn,
  former_spouse_ssn: ssn,
  not_remarried_in_2025_verified: z.literal(true),
  no_name_change_since_payment_verified: z.literal(true),
  agreement_signed_by_both_verified: z.literal(true),
  signed_agreement_reference: reference,
  signed_agreement_pdf_sha256: z.string().regex(/^[a-f0-9]{64}$/),
  payments: z.array(jointPaymentRowSchema).min(1).max(4),
}).strict();
const mfsJointAllocationSchema = z.object({
  allocation_method: z.literal("signed_mutual_agreement"),
  filing_context: z.literal("married_filing_separately"),
  taxpayer_ssn: ssn,
  spouse_ssn: ssn,
  agreement_signed_by_both_verified: z.literal(true),
  signed_agreement_reference: reference,
  signed_agreement_pdf_sha256: z.string().regex(/^[a-f0-9]{64}$/),
  payments: z.array(mfsJointPaymentRowSchema).min(1).max(4),
}).strict();
const jointAllocationSchema = z.union([
  divorcedJointAllocationSchema,
  mfsJointAllocationSchema,
]);

export const inputSchema = z.object({
  // Q1 payment (due ~April 15 for current year)
  payment_q1: z.number().nonnegative().optional(),
  // Q2 payment (due ~June 15)
  payment_q2: z.number().nonnegative().optional(),
  // Q3 payment (due ~September 15)
  payment_q3: z.number().nonnegative().optional(),
  // Q4 payment (due ~January 15 of following year)
  payment_q4: z.number().nonnegative().optional(),
  quarter_payment_records: z.array(quarterPaymentSchema).optional(),
  // Actual payment dates — used to determine whether each quarterly payment was
  // timely for underpayment penalty purposes (IRC §6654); ISO 8601 date strings
  payment_q1_date: z.string().optional()
    .describe(
      "Date Q1 estimated payment was made (ISO 8601, e.g. '2025-04-15')",
    ),
  payment_q2_date: z.string().optional()
    .describe(
      "Date Q2 estimated payment was made (ISO 8601, e.g. '2025-06-16')",
    ),
  payment_q3_date: z.string().optional()
    .describe(
      "Date Q3 estimated payment was made (ISO 8601, e.g. '2025-09-15')",
    ),
  payment_q4_date: z.string().optional()
    .describe(
      "Date Q4 estimated payment was made (ISO 8601, e.g. '2026-01-15')",
    ),
  // Prior-year overpayment applied to current-year estimated tax —
  // counts as an estimated tax payment made on April 15 (IRC §6513(d));
  // flows to Form 1040 line 26 alongside quarterly payments
  applied_from_prior_year: z.number().nonnegative().optional()
    .describe(
      "Overpayment from prior year applied to current year estimated tax (Form 1040 line 26)",
    ),
  joint_estimated_payment_allocation: jointAllocationSchema.optional(),
});

/** Reconcile signed allocations of joint 2025 payments for separate filers. */
export function reviewedJointAllocation(
  input: z.infer<typeof inputSchema>,
): z.infer<typeof jointAllocationSchema> | undefined {
  const review = input.joint_estimated_payment_allocation;
  if (!review) return undefined;
  if ((input.quarter_payment_records?.length ?? 0) > 0) {
    throw new Error(
      "Form 1040 line 26 joint allocation cannot also use separate quarter payment records",
    );
  }
  const taxpayerSsn = review.taxpayer_ssn.replaceAll("-", "");
  const otherSsn =
    ("former_spouse_ssn" in review
      ? review.former_spouse_ssn
      : review.spouse_ssn).replaceAll("-", "");
  if (taxpayerSsn === otherSsn) {
    throw new Error(
      "Form 1040 line 26 joint payments need distinct spouse SSNs",
    );
  }
  if ((input.applied_from_prior_year ?? 0) !== 0) {
    throw new Error(
      "Form 1040 line 26 joint allocation cannot include a prior-year applied payment",
    );
  }
  const byQuarter = new Map(review.payments.map((row) => [row.quarter, row]));
  if (
    byQuarter.size !== review.payments.length ||
    new Set(review.payments.map((row) => row.payment_record_reference)).size !==
      review.payments.length
  ) {
    throw new Error("Form 1040 line 26 joint payment records must be distinct");
  }
  for (const quarter of ["q1", "q2", "q3", "q4"] as const) {
    const amount = input[`payment_${quarter}`] ?? 0;
    const row = byQuarter.get(quarter);
    if (
      row !== undefined &&
      (("divorce_date_2025" in review &&
        row.payment_date > review.divorce_date_2025) ||
        (input[`payment_${quarter}_date`] !== undefined &&
          input[`payment_${quarter}_date`] !== row.payment_date))
    ) {
      throw new Error(
        "Form 1040 line 26 joint payment date must match its quarter record and precede divorce when applicable",
      );
    }
    if (
      (row?.taxpayer_allocated_amount ?? 0) !== amount ||
      (row !== undefined &&
        row.taxpayer_allocated_amount +
              ("former_spouse_allocated_amount" in row
                ? row.former_spouse_allocated_amount
                : row.spouse_allocated_amount) !==
          row.joint_payment_amount)
    ) {
      throw new Error(
        "Form 1040 line 26 agreed allocation must equal each joint payment and claimed quarter",
      );
    }
  }
  return review;
}

/** The 2025 estimated payments and prior-year credit claimed on Form 1040 line 26. */
export function estimatedPaymentTotal(raw: unknown): number {
  const input = inputSchema.parse(raw);
  reviewedJointAllocation(input);
  const records = input.quarter_payment_records;
  if (records !== undefined) {
    if (
      new Set(records.map((row) => row.payment_record_reference)).size !==
        records.length
    ) {
      throw new Error("Form 1040 line 26 payment records must be distinct");
    }
    for (const quarter of ["q1", "q2", "q3", "q4"] as const) {
      const entered = input[`payment_${quarter}`] ?? 0;
      const quarterRecords = records.filter((row) => row.quarter === quarter);
      const sourced = quarterRecords.reduce(
        (total, row) => total + row.amount,
        0,
      );
      if (Math.abs(entered - sourced) >= 0.01) {
        throw new Error(
          `Form 1040 line 26 ${quarter} differs from payment records`,
        );
      }
      const enteredDate = input[`payment_${quarter}_date`];
      if (
        enteredDate !== undefined &&
        (quarterRecords.length !== 1 ||
          quarterRecords[0].payment_date !== enteredDate)
      ) {
        throw new Error(
          `Form 1040 line 26 ${quarter} date differs from its payment record`,
        );
      }
    }
  }
  return (input.payment_q1 ?? 0) +
    (input.payment_q2 ?? 0) +
    (input.payment_q3 ?? 0) +
    (input.payment_q4 ?? 0) +
    (input.applied_from_prior_year ?? 0);
}

class F1040esNode extends TaxNode<typeof inputSchema> {
  readonly nodeType = "f1040es";
  readonly inputSchema = inputSchema;
  readonly outputNodes = new OutputNodes([f1040]);

  compute(_ctx: NodeContext, input: z.infer<typeof inputSchema>): NodeResult {
    const total = estimatedPaymentTotal(input);
    if (total === 0) return { outputs: [] };
    return {
      outputs: [{
        nodeType: f1040.nodeType,
        fields: { line26_estimated_tax: total },
      }],
    };
  }
}

export const f1040es = new F1040esNode();
