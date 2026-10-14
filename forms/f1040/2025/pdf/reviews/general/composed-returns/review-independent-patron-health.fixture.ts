import { independentPatronFixture } from "./review-8995a-independent-patron.fixture.ts";
import { twoFarmHealthFixtures } from "./review-two-farm-health.fixture.ts";
/** Author reviewed synthetic policies against the actual patron farm sources. */
export function independentPatronHealthFixtures() {
  const bases = ["below", "phase", "above", "below"].map((k) =>
    independentPatronFixture(k as "below" | "phase" | "above")
  );
  const fixtures = twoFarmHealthFixtures(bases);
  const limited = fixtures[1].inputs as any;
  for (const plan of limited.form7206.independent_schedule_c_plans.plans) {
    for (const m of plan.premium_months) m.paid_premium = 30000.49;
    for (const m of plan.issued_premium_records) m.paid_premium = 30000.49;
  }
  const copy = structuredClone(fixtures[0]);
  const one = {
    ...copy,
    id: "owned-two-farm-health-one-established-plan",
    expectedPdfForms: copy.expectedPdfForms.filter((k) => k !== "form7206")
      .concat("form7206"),
  };
  const oneSource = (one.inputs as any).form7206.independent_schedule_c_plans;
  oneSource.plans = oneSource.plans.filter((p: any) => p.recipient === "T");
  oneSource.business_plan_reviews.find((r: any) => r.recipient === "S")
    .plan_identifiers = [];
  fixtures.push(one);
  return fixtures.filter((f) => !f.id.endsWith("loss-owner")).map((f) => ({
    ...f,
    id: f.id.replace("owned-two-farm-health", "independent-patron-health"),
    reviewFocus: [
      "Actual independent proprietor patron income, owned SE, issued plan/payment facts, attributable health before QBI, and shared box6 limit",
    ],
  }));
}
