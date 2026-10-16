import { pdfReviewFixtures } from "../../../../pdf/review-fixtures.ts";
import { patronStatusFixture } from "./form8995a_patron_status_fixture.ts";
import { spouseOwnedPatronFixture } from "../../../../pdf/reviews/general/composed-returns/review-8995a-patron-joint.fixture.ts";
import { patronFiledBusinessLines } from "../../../../../nodes/inputs/deductions/business/qbi_patron/calculation.ts";

export const patronWageCases =
  (["single", "hoh", "qss", "mfs", "joint", "spouse"] as const).flatMap((
    status,
  ) =>
    (["farm", "c-health"] as const).map((kind) => ({
      status,
      kind,
      name: `${status}-${kind}`,
    }))
  );
export function patronWageFixture(c: typeof patronWageCases[number]) {
  const fixture = (id: string) =>
    structuredClone(pdfReviewFixtures.find((f) => f.id === id)!);
  // Synthetic issued copies are deliberately retained at the public boundary.
  let input: Record<string, any>;
  if (c.status === "joint" || c.status === "spouse") {
    const base = fixture(`joint-form8995a-patron-${c.kind}`);
    input = c.status === "spouse"
      ? spouseOwnedPatronFixture(base).inputs
      : base.inputs;
  } else if (c.status === "single") {
    input = fixture(`single-form8995a-patron-phase-${c.kind}`).inputs;
  } else {input = patronStatusFixture({
      status: c.status,
      kind: `phase-${c.kind}`,
      name: `${c.status}-phase-${c.kind}`,
    });}
  const joint = c.status === "joint" || c.status === "spouse";
  const base = fixture("joint-form8995a-patron-farm").inputs;
  const wage = structuredClone((base.w2 as any[])[0]);
  const salary = c.kind === "farm" ? 60000 : 176101;
  const owner = input.qbi_patron.source_1099patr.recipient_tin;
  Object.assign(wage, {
    employee_ssn: owner,
    employer_ein: "345678901",
    employer_name: "Synthetic Patron Day Job",
    source_document_reference: `Synthetic ${c.name} proprietor issued W2`,
    box1_wages: salary,
    box2_fed_withheld: 10000,
    box3_ss_wages: Math.min(salary, 176100),
    box4_ss_withheld: Math.round(Math.min(salary, 176100) * .062 * 100) / 100,
    box5_medicare_wages: salary,
    box6_medicare_withheld: Math.round(salary * .0145 * 100) / 100,
  });
  if (c.status === "spouse") input.qbi_patron.spouse_w2_sources = [wage];
  else input.qbi_patron.primary_w2_sources = [wage];
  input.w2 = [
    ...input.qbi_patron.primary_w2_sources ?? [],
    ...input.qbi_patron.spouse_w2_sources ?? [],
  ];
  if (input.form7206) {
    const plan = input.form7206.single_schedule_c_plan;
    const business = input.schedule_c[0];
    const profit = patronFiledBusinessLines("schedule_c", business).profit;
    const earnings = Math.round(profit * .9235);
    const tax = Math.round(
      Math.min(earnings, Math.max(0, 176100 - wage.box3_ss_wages)) * .124,
    ) + Math.round(earnings * .029);
    plan.schedule1_line15_se_tax_deduction = Math.round(tax / 2);
    for (const month of plan.premium_months) {
      month.employer_plan_review_reference = `Synthetic ${
        joint ? "both spouses" : "taxpayer"
      }: no subsidized employer plan eligibility at the issued W2 employers`;
    }
  }
  return input;
}
