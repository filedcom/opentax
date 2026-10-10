import { z } from "zod";

export const issuedPolicyRecordSchema = z.object({
  issuer_name: z.string().trim().min(1),
  issuer_ein: z.string().regex(/^\d{9}$/),
  policy_number: z.string().trim().min(1),
  policyholder_ssn: z.string().regex(/^\d{9}$/),
  source_document_reference: z.string().trim().min(1),
}).strict();

export const issuedPremiumRecordsSchema = z.array(
  z.object({
    month: z.number().int().min(1).max(12),
    issuer_ein: z.string().regex(/^\d{9}$/),
    policy_number: z.string().trim().min(1),
    policyholder_ssn: z.string().regex(/^\d{9}$/),
    payer_ssn: z.string().regex(/^\d{9}$/),
    covered_person: z.enum(["taxpayer", "spouse"]),
    paid_premium: z.number().nonnegative(),
    paid_on: z.string().regex(/^2025-\d{2}-\d{2}$/),
    policy_source_reference: z.string().trim().min(1),
    payment_source_reference: z.string().trim().min(1),
  }).strict(),
).length(12);

export type PremiumRecordMonth = {
  month: number;
  covered_person: string;
  paid_premium: number;
  policy_source_reference: string;
  payment_source_reference: string;
};

/** Reconcile reviewed structured records; this does not authenticate external documents. */
export function reconcileHealthPolicyRecords(plan: {
  issued_policy_record?: unknown;
  issued_premium_records?: unknown;
  premium_months: readonly PremiumRecordMonth[];
}, ownerTin: string): void {
  const policy = issuedPolicyRecordSchema.parse(plan.issued_policy_record);
  const records = issuedPremiumRecordsSchema.parse(plan.issued_premium_records);
  const ssn = ownerTin.replaceAll("-", "");
  const payments = new Set<string>();
  if (
    policy.policyholder_ssn !== ssn || records.some((record, index) => {
      const month = plan.premium_months[index],
        date = new Date(record.paid_on + "T00:00:00Z");
      const duplicate = payments.has(record.payment_source_reference);
      payments.add(record.payment_source_reference);
      return !month || duplicate || record.month !== month.month ||
        !Number.isFinite(date.valueOf()) ||
        date.toISOString().slice(0, 10) !== record.paid_on ||
        record.issuer_ein !== policy.issuer_ein ||
        record.policy_number !== policy.policy_number ||
        record.policyholder_ssn !== ssn || record.payer_ssn !== ssn ||
        record.covered_person !== month.covered_person ||
        record.paid_premium !== month.paid_premium ||
        record.policy_source_reference !== month.policy_source_reference ||
        month.policy_source_reference !== policy.source_document_reference ||
        record.payment_source_reference !== month.payment_source_reference;
    })
  ) {
    throw new Error(
      "Health plan needs matching owned issuer policy and monthly issued/payment records",
    );
  }
}
