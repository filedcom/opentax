/** Synthetic signed-agreement route for a 2025 divorced filer's joint payment. */
export const agreedJointPayment = {
  payment_q1: 300,
  joint_estimated_payment_allocation: {
    allocation_method: "signed_mutual_agreement" as const,
    divorce_date_2025: "2025-08-01",
    taxpayer_ssn: "111-22-3333",
    former_spouse_ssn: "222-33-4444",
    not_remarried_in_2025_verified: true as const,
    no_name_change_since_payment_verified: true as const,
    agreement_signed_by_both_verified: true as const,
    signed_agreement_reference:
      "Synthetic signed 2025 joint estimated tax allocation",
    signed_agreement_pdf_sha256: "a".repeat(64),
    payments: [{
      quarter: "q1" as const,
      joint_payment_amount: 500,
      taxpayer_allocated_amount: 300,
      former_spouse_allocated_amount: 200,
      payment_date: "2025-04-15",
      payment_record_reference:
        "Synthetic IRS 2025 joint Q1 payment confirmation",
    }],
  },
};
