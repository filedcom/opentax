import type { PremiumRecordMonth } from "./policy-records.ts";

/** Synthetic fixture records only; never generate missing facts for a filing. */
export function withHealthPolicyRecords<
  T extends {
    plan_identifier: string;
    recipient: string;
    taxpayer_identity: { ssn: string };
    spouse_identity?: { ssn: string };
    premium_months: readonly PremiumRecordMonth[];
  },
>(plan: T) {
  const ssn =
    (plan.recipient === "S"
      ? plan.spouse_identity!.ssn
      : plan.taxpayer_identity.ssn).replaceAll("-", "");
  return {
    ...plan,
    issued_policy_record: {
      issuer_name: "Example Health Insurer",
      issuer_ein: "951234567",
      policy_number: plan.plan_identifier,
      policyholder_ssn: ssn,
      source_document_reference: plan.premium_months[0].policy_source_reference,
    },
    issued_premium_records: plan.premium_months.map((m) => ({
      month: m.month,
      issuer_ein: "951234567",
      policy_number: plan.plan_identifier,
      policyholder_ssn: ssn,
      payer_ssn: ssn,
      covered_person: m.covered_person as "taxpayer" | "spouse",
      paid_premium: m.paid_premium,
      paid_on: `2025-${String(m.month).padStart(2, "0")}-15`,
      policy_source_reference: m.policy_source_reference,
      payment_source_reference: m.payment_source_reference,
    })),
  };
}
