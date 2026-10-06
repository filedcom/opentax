import type { PdfReviewFixture } from "./review-fixtures.ts";

/** Issued-source examples bind public records; external issuer authentication remains open. */
export function twoFarmHealthFixtures(
  bases: readonly PdfReviewFixture[],
): PdfReviewFixture[] {
  return [
    ["full", 0, 500.04, 800.04, 0, 0],
    ["income-limited", 0, 5000.49, 6000.49, 0, 0],
    ["excluded-months", 0, 500.04, 800.04, 3, 4],
    ["excluded-all", 0, 500.04, 800.04, 12, 12],
    ["phase", 1, 500.04, 800.04, 0, 0],
    ["above-limited-credit", 2, 500.04, 800.04, 0, 0],
    ["loss-owner", 3, 500.04, 800.04, 0, 0],
  ].map(([label, index, tp, sp, te, se]) => {
    const base = bases[Number(index)],
      inputs = structuredClone(base.inputs) as any;
    const businesses = inputs.schedule_f.schedule_fs as any[];
    const plans = businesses.map((b: any, index: number) => {
      const recipient = index === 0 ? "T" : "S",
        ssn = index === 0 ? "111223333" : "444556666";
      const reference = b.business_reference ?? b.farm_id;
      const identifier = `Two-Farm-${recipient}-${label}`,
        policyRef = `Issued 2025 insurer policy ${identifier}`;
      const issuer = index === 0 ? "123450001" : "123450002",
        premium = Number(index === 0 ? tp : sp),
        excluded = Number(index === 0 ? te : se);
      const premium_months = Array.from({ length: 12 }, (_, m) => ({
        month: m + 1,
        paid_premium: premium,
        policy_source_reference: policyRef,
        payment_source_reference: `Bank payment ${identifier} month${m + 1}`,
        covered_person: index === 0 ? "taxpayer" : "spouse",
        eligible_for_subsidized_employer_plan: m < excluded,
        employer_plan_review_reference:
          `Household employer eligibility review ${identifier} month${m + 1}`,
        marketplace_policy: false,
        long_term_care_policy: false,
        public_safety_officer_excluded_amount: 0,
      }));
      return {
        business_reference: reference,
        recipient,
        plan_identifier: identifier,
        establishment_source_reference:
          `Proprietor establishment records ${reference} policy ${identifier}`,
        plan_established_under_business: true,
        issued_policy_record: {
          issuer_name: index === 0
            ? "Primary farm proprietor health insurer"
            : "Spouse farm proprietor health insurer",
          issuer_ein: issuer,
          policy_number: identifier,
          policyholder_ssn: ssn,
          source_document_reference: policyRef,
        },
        issued_premium_records: premium_months.map((m) => ({
          month: m.month,
          issuer_ein: issuer,
          policy_number: identifier,
          policyholder_ssn: ssn,
          payer_ssn: ssn,
          covered_person: m.covered_person,
          paid_premium: m.paid_premium,
          paid_on: `2025-${String(m.month).padStart(2, "0")}-05`,
          policy_source_reference: m.policy_source_reference,
          payment_source_reference: m.payment_source_reference,
        })),
        premium_months,
      };
    });
    inputs.form7206 = {
      marketplace_ptc_premium_overlap: false,
      independent_schedule_c_plans: {
        taxpayer_identity: {
          name: [
            inputs.general.taxpayer_first_name,
            inputs.general.taxpayer_middle_initial,
            inputs.general.taxpayer_last_name,
          ].filter(Boolean).join(" "),
          ssn: "111223333",
        },
        spouse_identity: {
          name: [
            inputs.general.spouse_first_name,
            inputs.general.spouse_middle_initial,
            inputs.general.spouse_last_name,
          ].filter(Boolean).join(" "),
          ssn: "444556666",
        },
        plans,
        business_plan_reviews: plans.map((p) => ({
          business_reference: p.business_reference,
          recipient: p.recipient,
          plan_identifiers: [p.plan_identifier],
          review_source_reference:
            `Complete independent plan inventory ${p.business_reference}`,
          no_other_plans_confirmed: true,
        })),
      },
    };
    return {
      ...base,
      id: `owned-two-farm-health-${label}`,
      inputs,
      expectedPdfForms: [
        ...base.expectedPdfForms.filter((key) =>
          label !== "income-limited" || key !== "form8960"
        ),
        "form7206",
        ...(label === "loss-owner" ? [] : ["form7206"]),
      ],
      reviewFocus: [
        "Actual independent cash farm proprietor plans and issued insurer/monthly payment/eligibility records",
        "Full WOTC wage reduction precedes owner SE; independently limited health before QBI and tax-use limit",
        "Raw cents retained; each filed 7206 copy settles before Schedule1 sums; external issuer authentication remains open",
      ],
    };
  });
}
