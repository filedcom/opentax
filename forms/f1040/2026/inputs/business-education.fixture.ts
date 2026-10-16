import { businessCreditGraphFixture2026 } from "./business-earned.fixture.ts";
import { educationFixture2026 } from "./education.fixture.ts";

export function businessEducationFixture2026(
  profit = 10000,
  wages = 0,
  young = true,
) {
  const b = businessCreditGraphFixture2026(profit),
    e = educationFixture2026("aotc", wages);
  b.schedule_c.claim.earned_income_review = {
    record_reference: "income-character-review",
    activities: b.schedule_c.claim.businesses.map((row) => ({
      business_reference: row.business_reference,
      record_reference: "owner-service-contracts",
      kind: "owner_services_only" as const,
      capital_not_an_income_producing_factor: true as const,
    })),
  };
  e.f8863.claim.business_inventory_reference =
    b.schedule_c.claim.record_reference;
  if (young) {
    e.f8863.claim.refundable_review = {
      kind: "under24_nonjoint",
      record_reference: "support-review",
      at_least_one_parent_alive: true,
      full_time_student_months: [1, 2, 3, 4, 5],
      enrollment_record_reference: "enrollment",
      complete_support_inventory: true,
      support_records: [{
        record_reference: "annual-support",
        amount: 18586,
        payer: "parent",
        category: "housing",
      }],
    };
  }
  return {
    ...b,
    general: {
      ...b.general,
      taxpayer_dob: young ? "2005-06-01" : b.general.taxpayer_dob,
      do_not_claim_eic: true,
    },
    w2s: e.w2s ?? [],
    f8863: e.f8863,
  };
}

export function capitalServicesEducationFixture2026() {
  const f = businessEducationFixture2026(3000, 50000);
  f.schedule_c.claim.earned_income_review!.activities[0] = {
    kind: "services_and_capital",
    business_reference: "consulting",
    record_reference: "income-factors",
    both_material_income_producing_factors: true,
    reasonable_compensation_record_reference: "services-valuation",
    reasonable_compensation_for_owner_services: 2000,
  };
  if (f.f8863.claim.refundable_review.kind === "under24_nonjoint") {
    f.f8863.claim.refundable_review.support_records[0].amount = 101672.8;
  }
  return f;
}
