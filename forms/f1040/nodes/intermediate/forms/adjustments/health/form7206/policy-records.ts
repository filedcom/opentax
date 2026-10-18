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
    paid_on: z.string().date(),
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

/** Premiums for the year's coverage are paid during the return's tax year. */
export function assertPremiumRecordsInYear(
  plans: readonly { readonly issued_premium_records?: unknown }[],
  taxYear: number,
): void {
  for (const plan of plans) {
    const records = issuedPremiumRecordsSchema.safeParse(
      plan.issued_premium_records,
    );
    if (
      records.success &&
      records.data.some((record) => !record.paid_on.startsWith(`${taxYear}-`))
    ) {
      throw new Error(
        `Health plan issued premium records must be paid in ${taxYear}`,
      );
    }
  }
}

/** Reconcile reviewed structured records; this does not authenticate external documents. */
export function reconcileHealthPolicyRecords(plan: {
  issued_policy_record?: unknown;
  issued_premium_records?: unknown;
  premium_months: readonly PremiumRecordMonth[];
}, ownerTin: string): void {
  const policyResult = issuedPolicyRecordSchema.safeParse(
    plan.issued_policy_record,
  );
  const recordsResult = issuedPremiumRecordsSchema.safeParse(
    plan.issued_premium_records,
  );
  if (!policyResult.success || !recordsResult.success) {
    throw new Error(
      "Health plan needs its issued policy record and 12 issued monthly premium records",
    );
  }
  const policy = policyResult.data;
  const records = recordsResult.data;
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
