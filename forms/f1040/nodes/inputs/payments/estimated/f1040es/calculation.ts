import { createHash } from "node:crypto";

export type EstimatedQuarter = "q1" | "q2" | "q3" | "q4";
export interface EstimatedPaymentRecord {
  quarter: EstimatedQuarter;
  amount: number;
  payment_date: string;
  payment_record_reference: string;
}
export type EstimatedPaymentAmounts =
  & Partial<Record<`payment_${EstimatedQuarter}`, number>>
  & Partial<Record<`payment_${EstimatedQuarter}_date`, string>>
  & {
    applied_from_prior_year?: number;
    quarter_payment_records?: readonly EstimatedPaymentRecord[];
  };
export interface JointEstimatedReview {
  taxpayer_ssn: string;
  former_spouse_ssn?: string;
  spouse_ssn?: string;
  signed_agreement_pdf_base64: string;
  signed_agreement_pdf_sha256: string;
  payments: readonly {
    quarter: EstimatedQuarter;
    payment_date: string;
    payment_record_reference: string;
    joint_payment_amount: number;
    taxpayer_allocated_amount: number;
    former_spouse_allocated_amount?: number;
    spouse_allocated_amount?: number;
  }[];
}

/** Year-neutral checks on schema-validated records; callers own tax-year/identity rules. */
export function reconcileJointEstimatedRecords(
  input: EstimatedPaymentAmounts,
  review: JointEstimatedReview,
  divorceDate?: string,
): void {
  let agreementBytes: Uint8Array;
  try {
    agreementBytes = Uint8Array.from(
      atob(review.signed_agreement_pdf_base64),
      (character) => character.charCodeAt(0),
    );
  } catch {
    throw new Error(
      "Form 1040 line 26 signed allocation needs retained PDF bytes",
    );
  }
  if (
    agreementBytes.length < 20 ||
    new TextDecoder().decode(agreementBytes.subarray(0, 5)) !== "%PDF-" ||
    !new TextDecoder().decode(agreementBytes.subarray(-8)).includes("%%EOF") ||
    createHash("sha256").update(agreementBytes).digest("hex") !==
      review.signed_agreement_pdf_sha256
  ) {
    throw new Error(
      "Form 1040 line 26 signed allocation PDF differs from its retained digest",
    );
  }
  if ((input.quarter_payment_records?.length ?? 0) > 0) {
    throw new Error(
      "Form 1040 line 26 joint allocation cannot also use separate quarter payment records",
    );
  }
  const taxpayerSsn = review.taxpayer_ssn.replaceAll("-", "");
  const otherSsn =
    ("former_spouse_ssn" in review
      ? review.former_spouse_ssn
      : review.spouse_ssn)!.replaceAll("-", "");
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
      ((divorceDate !== undefined && row.payment_date > divorceDate) ||
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
                ? row.former_spouse_allocated_amount!
                : row.spouse_allocated_amount!) !==
          row.joint_payment_amount)
    ) {
      throw new Error(
        "Form 1040 line 26 agreed allocation must equal each joint payment and claimed quarter",
      );
    }
  }
}

/** Reconcile quarter records and sum without rounding individual receipts. */
export function sumEstimatedPaymentRecords(
  input: EstimatedPaymentAmounts,
): number {
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
