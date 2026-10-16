import { eicGraphFixture2026 } from "../nodes/eitc.fixture.ts";
import {
  businessGraphFixture2026,
  jointBusinessGraphFixture2026,
} from "./business-qbi.fixture.ts";
import { business, payment, wage } from "./business.fixture.ts";

export function businessCreditGraphFixture2026(profit = 10000, children = 1) {
  const credit = eicGraphFixture2026(0, children);
  const business = businessGraphFixture2026();
  business.schedule_c.claim.businesses[0].receipts[0].amount = Math.max(
    0,
    profit,
  );
  if (profit < 0) {
    business.schedule_c.claim.businesses[0].expenses = [{
      ...payment("loss", -profit),
      category: "advertising",
    }];
  }
  const {
    no_business_farm_rental_passive_or_capital_disposition_sources: _oldEic,
    ...eitc
  } = credit.eitc;
  const {
    no_self_employment_or_statutory_employee_income: _oldChild,
    ...f8812
  } = credit.f8812;
  return {
    ...business,
    general: credit.general,
    eitc: {
      ...eitc,
      business_inventory_reference: business.schedule_c.claim.record_reference,
      no_other_farm_rental_passive_or_capital_disposition_sources:
        true as const,
    },
    f8812: {
      ...f8812,
      business_inventory_reference: business.schedule_c.claim.record_reference,
    },
  };
}
export function jointBusinessCreditGraphFixture2026() {
  const f = businessCreditGraphFixture2026(0, 3),
    joint = jointBusinessGraphFixture2026();
  const primary = business("primary");
  primary.receipts = [];
  primary.expenses = [{ ...payment("loss", 300000), category: "advertising" }];
  const spouse = business("spouse", "987654321");
  spouse.receipts[0].amount = 350000;
  f.schedule_c.claim.businesses = [primary, spouse];
  f.schedule_c.claim.qbi_review.businesses = [primary, spouse].map((b) => ({
    ...f.schedule_c.claim.qbi_review.businesses[0],
    business_reference: b.business_reference,
  }));
  return {
    ...f,
    general: {
      ...joint.general,
      dependents: f.general.dependents,
      do_not_claim_eic: false,
      main_home_in_us_over_half_year: true,
    },
    eitc: { ...f.eitc, spouse_residency_record_reference: "spouse-home" },
  };
}
export function statutoryBusinessCreditGraphFixture2026() {
  const f = businessCreditGraphFixture2026(0);
  const b = f.schedule_c.claim.businesses[0];
  b.kind = "statutory_employee";
  b.receipts = [];
  b.expenses = [{
    ...payment("statutory-expense", 9000),
    category: "advertising",
  }];
  f.w2s = [{
    ...wage(),
    box13_statutory_employee: true,
    schedule_c_business_reference: "consulting",
  }];
  return f;
}
