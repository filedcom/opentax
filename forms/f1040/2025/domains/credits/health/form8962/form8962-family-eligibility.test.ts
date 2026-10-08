import { assertEquals, assertThrows } from "@std/assert";
import {
  assertForm8962FamilyEligibility,
  assertForm8962PolicyEligibility,
  assertForm8962SpouseIncomeReview,
  coverageEligibilityReviewSchema,
  ptcSpouseIncomeReviewSchema,
} from "./form8962-family-eligibility.ts";

// Contract unit controls only; these facts do not establish an issued packet.
function reviewedJointContract() {
  const general = {
    filing_status: "mfj",
    taxpayer_ssn: "123456789",
    spouse_ssn: "234567890",
    dependents: [{ ssn: "987650001" }, { ssn: "987650002" }],
    ptc_spouse_income_review: {
      tax_year: 2025,
      spouse_ssn: "234567890",
      review_reference: "reviewed-spouse-income-inventory",
      reviewed_on: "2026-02-01",
      reviewer_name: "Reviewer",
      inventory_complete: true,
      income_amounts: {
        wages: 0,
        taxable_interest: 0,
        tax_exempt_interest: 0,
        ordinary_dividends: 0,
        taxable_ira_distributions: 0,
        taxable_pensions: 0,
        social_security_total: 0,
        social_security_taxable: 0,
        capital_gain: 0,
        additional_income: 0,
        adjustments: 0,
        foreign_earned_income_exclusion: 0,
      },
      income_source_references: [],
    },
  };
  const identities = ["123456789", "234567890", "987650001", "987650002"];
  const policy = {
    policy_number: "reviewed-family-policy",
    covered_individual_ssns: identities,
    monthly_premiums: [900, ...Array(11).fill(0)],
    monthly_aptcs: Array(12).fill(0),
    no_aptc_monthly_evidence: [{
      month: 1,
      coverage_eligibility_review: {
        tax_year: 2025,
        policy_number: "reviewed-family-policy",
        month: 1,
        review_reference: "january-eligibility-review",
        reviewed_on: "2026-02-01",
        reviewer_name: "Reviewer",
        individuals: identities.map((individual_ssn) => ({
          individual_ssn,
          qhp_enrolled_for_month: true,
          lawfully_present_for_month: true,
          incarcerated_other_than_pending_disposition: false,
          employer_sponsored_mec_enrolled: false,
          employer_offer_review: "no_offer_available",
          government_mec_eligibility_review: "not_eligible",
          other_designated_mec_eligibility_review: "not_eligible",
          eligibility_record_reference: "review-" + individual_ssn,
        })),
      },
    }],
  };
  const wages = [{ employee_ssn: "123456789", box1_wages: 50000 }];
  return {
    general,
    f1095a: { f1095as: [policy] },
    w2: { w2s: wages },
    start: structuredClone({ general, f1095a: [policy], w2: wages }),
  };
}

Deno.test("family eligibility binds reviewed month/person/policy and zero spouse sources", () => {
  const p = reviewedJointContract();
  assertForm8962FamilyEligibility(p, "123-45-6789", "234-56-7890");
  assertEquals(
    coverageEligibilityReviewSchema.safeParse(
      p.f1095a.f1095as[0].no_aptc_monthly_evidence[0]
        .coverage_eligibility_review,
    ).success,
    true,
  );
  assertEquals(
    ptcSpouseIncomeReviewSchema.safeParse(p.general.ptc_spouse_income_review)
      .success,
    true,
  );
  // Public policy-only guard must reject the earlier larger-family absence.
  const missing: any = structuredClone(p.f1095a.f1095as[0]);
  delete missing.no_aptc_monthly_evidence[0].coverage_eligibility_review;
  assertThrows(() => assertForm8962PolicyEligibility(missing));
});

Deno.test("family review rejects missing, borrowed, premature and disqualified monthly facts", () => {
  for (
    const edit of [
      (p: any) =>
        delete p.f1095a.f1095as[0].no_aptc_monthly_evidence[0]
          .coverage_eligibility_review,
      (p: any) =>
        p.f1095a.f1095as[0].no_aptc_monthly_evidence[0]
          .coverage_eligibility_review.policy_number = "another-policy",
      (p: any) =>
        p.f1095a.f1095as[0].no_aptc_monthly_evidence[0]
          .coverage_eligibility_review.month = 2,
      (p: any) =>
        p.f1095a.f1095as[0].no_aptc_monthly_evidence[0]
          .coverage_eligibility_review.reviewed_on = "2025-01-01",
      (p: any) =>
        p.f1095a.f1095as[0].no_aptc_monthly_evidence[0]
          .coverage_eligibility_review.reviewed_on = "2026-02-30",
      (p: any) =>
        p.f1095a.f1095as[0].no_aptc_monthly_evidence[0]
          .coverage_eligibility_review.individuals[0].individual_ssn =
            "987650001",
      (p: any) =>
        p.f1095a.f1095as[0].no_aptc_monthly_evidence[0]
          .coverage_eligibility_review.individuals[0]
          .employer_sponsored_mec_enrolled = true,
      (p: any) =>
        p.f1095a.f1095as[0].no_aptc_monthly_evidence[0]
          .coverage_eligibility_review.individuals[0]
          .government_mec_eligibility_review = "not_enrolled",
      (p: any) => p.general.dependents[0].ssn = "999999999",
      (p: any) => delete p.start,
    ]
  ) {
    const p = structuredClone(reviewedJointContract());
    edit(p);
    assertThrows(() => assertForm8962FamilyEligibility(p));
  }
});

Deno.test("spouse inventory rejects actual source conflicts and owner/year/date omissions", () => {
  for (
    const edit of [
      (p: any) => delete p.general.ptc_spouse_income_review,
      (p: any) => p.general.ptc_spouse_income_review.spouse_ssn = "999999999",
      (p: any) => p.general.ptc_spouse_income_review.tax_year = 2024,
      (p: any) => p.general.ptc_spouse_income_review.reviewed_on = "2025-06-01",
      (p: any) =>
        p.general.ptc_spouse_income_review.income_amounts.tax_exempt_interest =
          1,
      (p: any) => p.start.w2[0].employee_ssn = "234567890",
      (p: any) => p.w2.w2s[0].employee_ssn = "234567890",
      (p: any) => p.start.f1099int = [{ recipient_tin: "234567890", box1: 1 }],
    ]
  ) {
    const p = structuredClone(reviewedJointContract());
    edit(p);
    assertThrows(() => assertForm8962FamilyEligibility(p));
  }
  assertThrows(() =>
    assertForm8962SpouseIncomeReview({
      filing_status: "single",
      ptc_spouse_income_review:
        reviewedJointContract().general.ptc_spouse_income_review,
    })
  );
});
