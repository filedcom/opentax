import { spouseMedicareInputs } from "../../../../pdf/reviews/adjustments/health/form7206-spouse-medicare.fixture.ts";
import { withHealthPolicyRecords } from "../../../../../nodes/intermediate/forms/adjustments/health/form7206/policy-records.fixture.ts";
import { f1040_2025 } from "../../../../index.ts";

export const singlePolicyCases = [
  {
    id: "single-variable",
    joint: false,
    owner: "T",
    profit: 50000,
    premium: 250.25,
    excluded: 0,
    coverage: "taxpayer",
  },
  {
    id: "single-income-limited",
    joint: false,
    owner: "T",
    profit: 5000,
    premium: 2000.49,
    excluded: 0,
    coverage: "taxpayer",
  },
  {
    id: "joint-spouse-owner",
    joint: true,
    owner: "S",
    profit: 5000,
    premium: 185,
    excluded: 2,
    coverage: "spouse",
  },
  {
    id: "joint-taxpayer-spouse-coverage",
    joint: true,
    owner: "T",
    profit: 50000,
    premium: 500,
    excluded: 2,
    coverage: "spouse",
  },
  {
    id: "joint-changing-coverage",
    joint: true,
    owner: "T",
    profit: 50000,
    premium: 500,
    excluded: 2,
    coverage: "changing",
  },
  {
    id: "single-excluded-cents",
    joint: false,
    owner: "T",
    profit: 50000,
    premium: 250.25,
    excluded: 2,
    coverage: "taxpayer",
  },
];
export function singlePolicyInput(c: typeof singlePolicyCases[number]): any {
  const input = spouseMedicareInputs(c.joint ? 50000 : 0),
    plan = input.form7206.single_schedule_c_plan;
  delete input.form7206;
  if (!c.joint) {
    input.general.filing_status = "single";
    for (const key of Object.keys(input.general)) {
      if (key.startsWith("spouse_")) delete input.general[key];
    }
    delete input.general.eic_tax_residency_review
      .spouse_status_record_reference;
  }
  input.schedule_c[0].proprietor_recipient = c.owner;
  input.schedule_c[0].line_1_gross_receipts = c.profit;
  input.schedule_c[0].line_c_business_name = c.owner === "T"
    ? "Alex Photography"
    : "Casey Photography";
  input.f1099nec[0].recipient_ssn = c.owner === "T" ? "111223333" : "222334444";
  input.f1099nec[0].box1_nec = c.profit;
  const actual = f1040_2025.executeReturn(input);
  if (actual.diagnostics.length) {
    throw new Error(JSON.stringify(actual.diagnostics));
  }
  Object.assign(plan, {
    recipient: c.owner,
    plan_identifier: `POLICY-${c.id}`,
    schedule_c_line31_net_profit: c.profit,
    schedule1_line15_se_tax_deduction:
      actual.pending.schedule1!.line15_se_deduction,
  });
  if (!c.joint) delete plan.spouse_identity;
  plan.premium_months = plan.premium_months.map((m: any) => ({
    ...m,
    paid_premium: c.premium + m.month * 10,
    covered_person: c.coverage === "changing"
      ? (m.month <= 6 ? "taxpayer" : "spouse")
      : c.coverage,
    eligible_for_subsidized_employer_plan: m.month <= c.excluded,
    policy_source_reference: `${c.id}-reviewed-commercial-policy`,
    payment_source_reference: `${c.id}-premium-payment-${m.month}`,
  }));
  input.form7206 = {
    single_schedule_c_plan: withHealthPolicyRecords(plan),
    marketplace_ptc_premium_overlap: false,
  };
  return input;
}
