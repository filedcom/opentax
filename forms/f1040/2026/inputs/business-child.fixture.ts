import { childTaxFixture2026 } from "./child-tax.fixture.ts";
import { businessGraphFixture2026 } from "./business-qbi.fixture.ts";
import { payment } from "./business.fixture.ts";

export function businessChildFixture2026(
  gross = 10000,
  expenses = 0,
  wages = 0,
  interest = 5000,
) {
  const c = childTaxFixture2026(wages, interest),
    b = businessGraphFixture2026();
  b.schedule_c.claim.businesses[0].receipts[0].amount = gross;
  b.schedule_c.claim.businesses[0].expenses = expenses
    ? [{ ...payment("expense", expenses), category: "advertising" }]
    : [];
  b.schedule_c.claim.earned_income_review = {
    record_reference: "service-review",
    activities: [{
      business_reference: "consulting",
      record_reference: "service-records",
      kind: "owner_services_only",
      capital_not_an_income_producing_factor: true,
    }],
  };
  c.f8615.claim.business_inventory_reference =
    b.schedule_c.claim.record_reference;
  return { ...c, schedule_c: b.schedule_c };
}
export function capitalBusinessChildFixture2026(
  gross = 10000,
  expenses = 0,
  compensation = 5000,
) {
  const f = businessChildFixture2026(gross, expenses);
  f.schedule_c.claim.earned_income_review!.activities[0] = {
    business_reference: "consulting",
    record_reference: "capital-and-service-records",
    kind: "services_and_capital",
    both_material_income_producing_factors: true,
    reasonable_compensation_record_reference: "valuation",
    reasonable_compensation_for_owner_services: compensation,
  };
  return f;
}
