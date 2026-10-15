import { dependentCareFixture2026 } from "./dependent-care.fixture.ts";
import type { CareProvider2026 } from "./dependent-care-providers.ts";

export function providerCareFixture2026(
  kind: "tax_exempt" | "foreign" | "incomplete" | "employer_furnished" | "none",
) {
  const f = dependentCareFixture2026(
    50000,
    kind === "none" ? 6000 : kind === "employer_furnished" ? 2000 : 0,
  );
  const c = f.form2441.claim;
  const provider = c.providers[0];
  if (provider.kind !== "business") {
    throw new Error("Expected fixture business");
  }
  const base = {
    provider_reference: `provider-${kind}`,
    review_reference: `review-${kind}`,
    amount_paid: 6000,
    household_employee: false as const,
  };
  let p: CareProvider2026;
  if (kind === "none") {
    c.providers = [];
    c.qualifying_people = [];
    c.expenses = [];
    return f;
  }
  if (kind === "tax_exempt") {
    p = {
      kind,
      ...base,
      name: "Synthetic Community Care",
      us_address: provider.us_address,
      tax_exempt_status_verified: true,
    };
  } else if (kind === "foreign") {
    p = {
      kind,
      ...base,
      name: "Synthetic Overseas Care",
      foreign_address: {
        line1: "12 Example Street",
        city: "Stockholm",
        postal_code: "11428",
        country_code: "SE",
      },
      identification: {
        kind: "lafcp",
        taxpayer_us_citizen_or_resident_living_abroad: true,
        provider_not_required_to_have_us_tin: true,
        residency_and_tin_review_reference: "foreign-care-review",
      },
    };
  } else if (kind === "incomplete") {
    p = {
      kind,
      ...base,
      known_name: "Synthetic Missing TIN Care",
      known_us_address: provider.us_address,
      due_diligence: {
        all_available_information_reported: true,
        provider_did_not_supply_requested_information: true,
        requests: [{
          date: "2026-10-01",
          method: "written",
          record_reference: "request-letter",
        }, {
          date: "2026-12-01",
          method: "telephone",
          record_reference: "request-call",
        }],
        explanation:
          "We sent Form W-10 and followed up by telephone. The provider confirmed its address but refused to disclose its taxpayer identification number.",
      },
    };
  } else {
    p = {
      kind,
      ...base,
      amount_paid: 0,
      source_document_reference: f.w2s[0].source_document_reference,
      employer_furnished_or_hired_provider: true,
      care_value_in_w2_box10: 2000,
    };
    c.expenses[0].qualified_amount_incurred_and_paid_in_2026 = 2000;
  }
  c.providers = [p];
  return f;
}

export function providerOverflowFixture2026(longExplanation = false) {
  const f = providerCareFixture2026("employer_furnished"), c = f.form2441.claim;
  const employer = c.providers[0];
  const taxExempt =
    providerCareFixture2026("tax_exempt").form2441.claim.providers[0];
  const foreign =
    providerCareFixture2026("foreign").form2441.claim.providers[0];
  const incomplete =
    providerCareFixture2026("incomplete").form2441.claim.providers[0];
  const regular = dependentCareFixture2026().form2441.claim.providers[0];
  taxExempt.amount_paid = 3000;
  foreign.amount_paid = 2000;
  incomplete.amount_paid = 1000;
  regular.amount_paid = 500;
  if (longExplanation && incomplete.kind === "incomplete") {
    incomplete.due_diligence.explanation +=
      " We retained the request and the provider response confirming that the identification number would not be supplied."
        .repeat(50);
  }
  c.providers = [employer, regular, incomplete, foreign, taxExempt];
  const receipt = c.expenses[0];
  c.expenses = [2000, 500, 1000, 2000, 3000].map((amount, i) => ({
    ...receipt,
    provider_index: i,
    receipt_reference: `provider-receipt-${i}`,
    qualified_amount_incurred_and_paid_in_2026: amount,
  }));
  return f;
}
