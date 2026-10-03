import {
  estimatedPaymentTotal,
  inputSchema,
  reviewedJointAllocation,
} from "../nodes/inputs/f1040es/index.ts";

/** Reconcile the retained 1040-ES input to the final 2025 return payment. */
export function assertEstimatedPaymentLine26(
  fields: Readonly<Record<string, unknown>>,
  pending: Readonly<Record<string, unknown>> | undefined,
): string | undefined {
  const filed = fields.line26_estimated_tax;
  const raw = pending?.f1040es;
  if (raw === undefined && (filed === undefined || filed === 0)) return;
  if (raw === undefined) {
    throw new Error("Form 1040 line 26 needs its 1040-ES payment source");
  }
  const source = estimatedPaymentTotal(raw);
  if (
    typeof filed !== "number" || !Number.isFinite(filed) ||
    Math.abs(filed - source) >= 0.01
  ) {
    throw new Error(
      "Form 1040 line 26 differs from its 1040-ES payment source",
    );
  }
  const input = inputSchema.parse(raw);
  if ((input.applied_from_prior_year ?? 0) > 0) {
    throw new Error(
      "Form 1040 line 26 prior-year applied credit needs the accepted 2024 return and IRS-account credit evidence",
    );
  }
  const review = reviewedJointAllocation(input);
  if (!review) {
    const hasQuarterPayment = (["q1", "q2", "q3", "q4"] as const).some(
      (quarter) => (input[`payment_${quarter}`] ?? 0) > 0,
    );
    if (hasQuarterPayment && !input.quarter_payment_records?.length) {
      throw new Error(
        "Form 1040 line 26 needs retained quarter payment records",
      );
    }
    const general = pending?.general as Record<string, unknown> | undefined;
    const taxpayer = String(fields.taxpayer_ssn ?? general?.taxpayer_ssn ?? "")
      .replaceAll("-", "");
    const spouse = String(fields.spouse_ssn ?? general?.spouse_ssn ?? "")
      .replaceAll("-", "");
    const joint = String(fields.filing_status ?? general?.filing_status) ===
      "mfj";
    if (
      input.quarter_payment_records?.some((row) => {
        const payer = row.payer_tin.replaceAll("-", "");
        return payer !== taxpayer && (!joint || payer !== spouse);
      })
    ) {
      throw new Error(
        "Form 1040 line 26 payment record payer must be the taxpayer or joint spouse",
      );
    }
    return;
  }
  const general = pending?.general as Record<string, unknown> | undefined;
  const taxpayerSsn = String(general?.taxpayer_ssn ?? "").replaceAll("-", "");
  const formerSsn = review.former_spouse_ssn.replaceAll("-", "");
  if (
    !["single", "hoh"].includes(String(fields.filing_status)) ||
    fields.filing_status !== general?.filing_status ||
    taxpayerSsn !== review.taxpayer_ssn.replaceAll("-", "") ||
    String(fields.taxpayer_ssn ?? "").replaceAll("-", "") !== taxpayerSsn ||
    fields.spouse_ssn !== undefined || general?.spouse_ssn !== undefined ||
    formerSsn === taxpayerSsn
  ) {
    throw new Error(
      "Form 1040 line 26 joint allocation needs the divorced single/HOH taxpayer and former spouse identity",
    );
  }
  return formerSsn;
}
