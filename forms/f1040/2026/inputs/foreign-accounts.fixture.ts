import type { z } from "zod";
import type { foreignAccountReview2026Schema } from "./foreign-accounts.ts";

const document = (reference: string) => ({
  document_reference: reference,
  document_sha256: "a".repeat(64),
});
export function foreignAccountReviewFixture2026(
  required = true,
): z.input<typeof foreignAccountReview2026Schema> {
  return {
    tax_year: 2026,
    record_reference: "synthetic-foreign-inventory",
    reviewed_on: "2027-02-01",
    reviewer_reference: "synthetic-reviewer",
    complete_year_account_and_signature_authority_inventory_reviewed: true,
    no_form8814_child_account_reporting: true,
    accounts: [{
      record_reference: "synthetic-swiss-account",
      institution_name: "SYNTHETIC SWISS BANK",
      account_number: "foreign-account-1",
      country_name: "Switzerland",
      subject_tin: "123456789",
      relationship: "signature_authority",
      relationship_started_on: "2025-04-01",
      location_and_relationship_document: document(
        "synthetic-signature-authorization",
      ),
      physically_outside_us_under_fbar_definition_verified: true,
      income_review: {
        kind: "no_reportable_income",
        no_income_reportable_by_subject_from_this_account_verified: true,
        source_document: document("synthetic-income-ownership-review"),
      },
    }],
    fbar_reviews: [{
      subject_tin: "123456789",
      required,
      determination_explanation: required
        ? "Synthetic review establishes US person status, aggregate value above $10,000, no applicable exception."
        : "Synthetic review establishes US person status and aggregate value never above $10,000.",
      complete_account_inventory_values_and_filing_exceptions_reviewed: true,
      ...document("synthetic-fbar-workpaper"),
    }],
  };
}
