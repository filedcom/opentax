import { independentHealthInputs } from "../../../../pdf/reviews/adjustments/health/form7206-independent-owner.fixture.ts";

export const policyInventoryCases = [
  {
    id: "seasonal-premiums",
    wages: 176100,
    limited: false,
    excluded: false,
    crossCoverage: false,
  },
  {
    id: "both-income-limited",
    wages: 176100,
    limited: true,
    excluded: false,
    crossCoverage: false,
  },
  {
    id: "primary-employer-excluded",
    wages: 176100,
    limited: false,
    excluded: true,
    crossCoverage: false,
  },
  {
    id: "changing-covered-persons",
    wages: 176100,
    limited: false,
    excluded: false,
    crossCoverage: true,
  },
  {
    id: "below-wage-base",
    wages: 50000,
    limited: false,
    excluded: false,
    crossCoverage: false,
  },
];

export function policyInventoryInput(
  c: typeof policyInventoryCases[number],
): any {
  const i = independentHealthInputs();
  Object.assign(i.w2[0], {
    box1_wages: c.wages,
    box3_ss_wages: c.wages,
    box4_ss_withheld: c.wages * .062,
    box5_medicare_wages: c.wages,
    box6_medicare_withheld: c.wages * .0145,
    box2_fed_withheld: c.wages === 50000 ? 5000 : 30000,
  });
  for (const plan of i.form7206.independent_schedule_c_plans.plans) {
    for (const m of plan.premium_months) {
      m.paid_premium = c.limited
        ? 2000.49
        : (plan.recipient === "T"
          ? 310.25 + m.month * 17
          : 125.75 + m.month * 11);
      m.eligible_for_subsidized_employer_plan =
        c.excluded && plan.recipient === "T" ? true : !c.limited &&
          (plan.recipient === "T" ? [3, 7] : [2, 9, 12]).includes(m.month);
      if (c.crossCoverage && m.month > 6) {
        m.covered_person = plan.recipient === "T" ? "spouse" : "taxpayer";
      }
      const issued = plan.issued_premium_records[m.month - 1];
      issued.paid_premium = m.paid_premium;
      issued.covered_person = m.covered_person;
    }
  }
  return i;
}
