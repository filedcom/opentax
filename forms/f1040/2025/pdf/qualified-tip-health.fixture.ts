import { assertEquals } from "@std/assert";
import { f1040_2025 } from "../index.ts";
import {
  jointTipInputs,
  singleTipInputs,
} from "./form8995-qualified-tips.fixture.ts";
import { independentHealthInputs } from "./form7206-independent-owner.fixture.ts";
import { spouseMedicareInputs } from "./form7206-spouse-medicare.fixture.ts";
export function singleTipHealthInputs(
  receipts = 80000,
  tips = 12000,
  premium = 500,
  wages = 0,
): any {
  const inputs = singleTipInputs(receipts, tips, wages);
  const owned = f1040_2025.executeReturn(structuredClone(inputs));
  assertEquals(owned.diagnostics, []);
  const plan = structuredClone(
    spouseMedicareInputs().form7206.single_schedule_c_plan,
  );
  Object.assign(plan, {
    business_reference: inputs.schedule_c[0].business_reference,
    plan_identifier: "ALEX-EVENT-HEALTH-2025",
    recipient: "T",
    schedule_c_line31_net_profit: owned.pending.schedule1.line3_schedule_c,
    schedule1_line15_se_tax_deduction:
      owned.pending.schedule1.line15_se_deduction,
  });
  delete plan.spouse_identity;
  plan.premium_months = plan.premium_months.map((m: any) => ({
    ...m,
    paid_premium: premium,
    covered_person: "taxpayer",
    policy_source_reference:
      "2025-Alex-issued-event-business-health-policy-monthly-premium-statement",
    payment_source_reference: `2025-Alex-owned-event-health-payment-${m.month}`,
    employer_plan_review_reference:
      `2025-Alex-issued-employer-and-plan-eligibility-review-${m.month}`,
  }));
  inputs.f1099nec[0].qualified_tips_review.allocable_health_plan_identifiers = [
    plan.plan_identifier,
  ];
  inputs.f1099nec[0].qualified_tips_review
    .no_other_allocable_deductions_review_reference =
      "2025-owned-expense-halfSE-and-established-health-plan-review-no-other-allocable-deductions";
  inputs.form7206 = {
    single_schedule_c_plan: plan,
    marketplace_ptc_premium_overlap: false,
  };
  return inputs;
}
export function jointTipHealthInputs(
  mode: "cap" | "healthlimited" | "phasedout" = "cap",
): any {
  const inputs = jointTipInputs(mode !== "healthlimited");
  inputs.form7206 =
    independentHealthInputs(mode === "healthlimited" ? 1000 : 500).form7206;
  if (mode !== "cap") {
    for (const payer of inputs.f1099nec) {
      if (mode === "phasedout") payer.qualified_tips_review.amount = 100;
      else if (payer.schedule_c_business_reference === "BIZ-S") {
        payer.qualified_tips_review.amount = 1000;
      }
    }
  }
  for (const payer of inputs.f1099nec) {
    payer.qualified_tips_review.allocable_health_plan_identifiers = inputs
      .form7206.independent_schedule_c_plans.plans.filter((p: any) =>
        p.business_reference === payer.schedule_c_business_reference
      ).map((p: any) => p.plan_identifier);
    payer.qualified_tips_review.no_other_allocable_deductions_review_reference =
      "2025-owned-expense-halfSE-and-established-health-plan-review-no-other-allocable-deductions";
  }
  return inputs;
}
export const tipHealthCases = [
  { id: "single-positive-health", inputs: () => singleTipHealthInputs() },
  {
    id: "single-w2-qbi-binding",
    inputs: () => singleTipHealthInputs(80000, 12000, 500, 50000),
  },
  {
    id: "single-tip-netincome-limited",
    inputs: () => singleTipHealthInputs(18000),
  },
  {
    id: "single-health-income-limited",
    inputs: () => singleTipHealthInputs(18000, 12000, 1000),
  },
  {
    id: "single-fully-phased-out",
    inputs: () => singleTipHealthInputs(80000, 1500, 100, 100000),
  },
  { id: "mfj-owned-cap-phaseout", inputs: () => jointTipHealthInputs() },
  {
    id: "mfj-primary-health-limited",
    inputs: () => jointTipHealthInputs("healthlimited"),
  },
  {
    id: "mfj-fully-phased-out",
    inputs: () => jointTipHealthInputs("phasedout"),
  },
];
