import { assertEquals } from "@std/assert";
import { f1040_2025 } from "../../../../index.ts";
import { extractFilerIdentity } from "../../../../../mef/filer.ts";
import { spouseMedicareInputs } from "./form7206-spouse-medicare.fixture.ts";
export function independentHealthInputs(
  primaryPremium = 500,
  primaryExcluded = 0,
  spouseExcluded = 0,
  includePrimaryPlan = true,
): any {
  const i = spouseMedicareInputs(176100, 0);
  delete i.form7206;
  i.w2[0].box2_fed_withheld = 30000;
  const c = structuredClone(i.schedule_c[0]);
  c.business_reference = "BIZ-S";
  const t = {
    ...structuredClone(c),
    business_reference: "BIZ-T",
    proprietor_recipient: "T",
    line_a_principal_business: "Design",
    line_b_business_code: "541430",
    line_c_business_name: "Alex Design",
    line_1_gross_receipts: 10000,
  };
  i.schedule_c = [t, c];
  i.f1099nec[0].schedule_c_business_reference = "BIZ-S";
  i.f1099nec.push({
    ...structuredClone(i.f1099nec[0]),
    payer_name: "Owned Design Client",
    payer_tin: "971234567",
    recipient_ssn: "111223333",
    account_number: "ALEX-DESIGN-2025",
    source_document_reference: "2025-Alex-issued-design-client-1099NEC",
    box1_nec: 10000,
    schedule_c_business_reference: "BIZ-T",
  });
  const plan = (recipient: "T" | "S", premium: number, excluded: number) => ({
    business_reference: `BIZ-${recipient}`,
    recipient,
    plan_identifier: `2025-${recipient}-OWNED-HEALTH`,
    establishment_source_reference:
      `2025-${recipient}-actual-business-policy-establishment-review`,
    plan_established_under_business: true,
    premium_months: Array.from({ length: 12 }, (_, n) => ({
      month: n + 1,
      paid_premium: premium,
      policy_source_reference:
        `2025-${recipient}-issued-individual-health-policy-premium-statement`,
      payment_source_reference: `2025-${recipient}-owned-health-payment-${
        n + 1
      }`,
      covered_person: recipient === "T" ? "taxpayer" : "spouse",
      eligible_for_subsidized_employer_plan: n < excluded,
      employer_plan_review_reference:
        `2025-${recipient}-own-and-spouse-employer-eligibility-review-${n + 1}`,
      marketplace_policy: false,
      long_term_care_policy: false,
      public_safety_officer_excluded_amount: 0,
    })),
  });
  i.form7206 = {
    independent_schedule_c_plans: {
      taxpayer_identity: { name: "Alex Example", ssn: "111223333" },
      spouse_identity: { name: "Casey Example", ssn: "222334444" },
      plans: [
        ...(includePrimaryPlan
          ? [plan("T", primaryPremium, primaryExcluded)]
          : []),
        plan("S", 185, spouseExcluded),
      ],
      business_plan_reviews: [{
        business_reference: "BIZ-T",
        recipient: "T",
        plan_identifiers: includePrimaryPlan ? ["2025-T-OWNED-HEALTH"] : [],
        review_source_reference: includePrimaryPlan
          ? "2025-Alex-issued-business-health-plan-inventory"
          : "2025-Alex-reviewed-no-business-health-plan-established",
        no_other_plans_confirmed: true,
      }, {
        business_reference: "BIZ-S",
        recipient: "S",
        plan_identifiers: ["2025-S-OWNED-HEALTH"],
        review_source_reference:
          "2025-Casey-issued-business-health-plan-inventory",
        no_other_plans_confirmed: true,
      }],
    },
    marketplace_ptc_premium_overlap: false,
  };
  return i;
}
export function independentHealthFamily(
  primaryPremium = 500,
  primaryExcluded = 0,
  spouseExcluded = 0,
  includePrimaryPlan = true,
): any {
  const inputs = independentHealthInputs(
      primaryPremium,
      primaryExcluded,
      spouseExcluded,
      includePrimaryPlan,
    ),
    r = f1040_2025.executeReturn(inputs);
  assertEquals(r.diagnostics, []);
  return {
    inputs,
    pending: r.pending,
    filer: extractFilerIdentity(r.pending.f1040),
  };
}
