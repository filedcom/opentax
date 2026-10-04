// A small retained synthetic PDF used only for byte-binding tests. The
// reviewed-signature fact is supplied separately by each source record.
const agreementPdfBase64 =
  "JVBERi0xLjMKJeLjz9MKMSAwIG9iago8PAovUHJvZHVjZXIgKHB5cGRmKQovVGl0bGUgKFN5bnRoZXRpYyBzaWduZWQgYWxsb2NhdGlvbiBldmlkZW5jZSkKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9Db3VudCAxCi9LaWRzIFsgNCAwIFIgXQo+PgplbmRvYmoKMyAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1Jlc291cmNlcyA8PAo+PgovTWVkaWFCb3ggWyAwLjAgMC4wIDMwMCAyMDAgXQovUGFyZW50IDIgMCBSCj4+CmVuZG9iagp4cmVmCjAgNQowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTUgMDAwMDAgbiAKMDAwMDAwMDEwMCAwMDAwMCBuIAowMDAwMDAwMTU5IDAwMDAwIG4gCjAwMDAwMDAyMDggMDAwMDAgbiAKdHJhaWxlcgo8PAovU2l6ZSA1Ci9Sb290IDMgMCBSCi9JbmZvIDEgMCBSCj4+CnN0YXJ0eHJlZgozMDIKJSVFT0YK";
const agreementPdfSha256 =
  "6798281331ad47ac7a8cbc8de0419a134a8ac61c13c677058bac4a096a47bdd7";

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
    signed_agreement_pdf_sha256: agreementPdfSha256,
    signed_agreement_pdf_base64: agreementPdfBase64,
    payments: [{
      tax_year: 2025 as const,
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

/** Two current spouses filing separately agree to divide one 2025 payment. */
export const agreedMfsJointPayment = {
  payment_q1: 300,
  joint_estimated_payment_allocation: {
    allocation_method: "signed_mutual_agreement" as const,
    filing_context: "married_filing_separately" as const,
    taxpayer_ssn: "111-22-3333",
    spouse_ssn: "222-33-4444",
    agreement_signed_by_both_verified: true as const,
    signed_agreement_reference: "Synthetic signed 2025 MFS payment allocation",
    signed_agreement_pdf_sha256: agreementPdfSha256,
    signed_agreement_pdf_base64: agreementPdfBase64,
    payments: [{
      tax_year: 2025 as const,
      quarter: "q1" as const,
      joint_payment_amount: 500,
      taxpayer_allocated_amount: 300,
      spouse_allocated_amount: 200,
      payment_date: "2025-04-15",
      payment_record_reference: "Synthetic IRS 2025 joint Q1 payment",
    }],
  },
};
