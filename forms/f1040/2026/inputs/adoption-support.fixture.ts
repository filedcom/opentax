import { adoptionGraphFixture2026 } from "./adoption-graph.fixture.ts";
import { educationFixture2026 } from "./education.fixture.ts";
export function adoptionEducationFixture2026(special = false) {
  const input = adoptionGraphFixture2026(10000, special ? 0 : 4000, special);
  input.general.taxpayer_dob = "2005-06-01";
  input.form8839.claim.programs[0].personal_services_review = {
    record_reference: "employer-compensation-review",
    benefits_are_reasonable_compensation_for_personal_services_verified: true,
    not_distribution_of_earnings_or_profits_verified: true,
  };
  const education = educationFixture2026("aotc", 10000).f8863;
  education.claim.adoption_inventory_reference =
    input.form8839.claim.record_reference;
  education.claim.refundable_review = {
    kind: "under24_nonjoint",
    record_reference: "support-inventory",
    at_least_one_parent_alive: true,
    full_time_student_months: [1, 2, 3, 4, 5],
    enrollment_record_reference: "student-record",
    complete_support_inventory: true,
    support_records: [{
      record_reference: "support-paid",
      amount: 26000,
      payer: "parent",
      category: "housing",
    }],
  };
  return { ...input, f8863: education };
}
