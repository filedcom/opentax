import { withHealthPolicyRecords } from "../../../../../nodes/intermediate/forms/adjustments/health/form7206/policy-records.fixture.ts";
import { patronFixture } from "./review-8995a-patron.fixture.ts";
import type { PdfReviewFixture } from "../../../review-fixtures.ts";

export function patronSpouseW2(base: Record<string, unknown>, salary: number) {
  return {
    ...base,
    employee_ssn: "444556666",
    source_document_reference: "Synthetic spouse issued 2025 W2 copy",
    box1_wages: salary,
    box2_fed_withheld: 42000.50,
    box3_ss_wages: Math.min(salary, 176100),
    box4_ss_withheld: Math.round(Math.min(salary, 176100) * .062 * 100) / 100,
    box5_medicare_wages: salary,
    box6_medicare_withheld:
      Math.round((salary * .0145 + Math.max(0, salary - 200000) * .009) * 100) /
      100,
    box13_statutory_employee: false,
    box13_retirement_plan: false,
  };
}

/** Explicit synthetic primary-owned books, cooperative copy and spouse issued wages. */
export function jointPatronFixture(
  single: PdfReviewFixture,
  joint: PdfReviewFixture,
  kind: "farm" | "c-health" | "income-cap",
): PdfReviewFixture {
  const original = patronFixture(single, `phase-${kind}`);
  const inputs = structuredClone(original.inputs) as any;
  inputs.general = {
    ...(joint.inputs.general as Record<string, unknown>),
    qbi_no_prior_loss_or_suspended_loss_confirmed: true,
  };
  delete inputs.general.qbi_not_patron_of_specified_cooperative_confirmed;
  const base = (joint.inputs.w2 as Record<string, unknown>[])[1];
  const wages = patronSpouseW2(base, 230000.49);
  inputs.w2 = [wages];
  inputs.qbi_patron.spouse_w2_sources = [wages];
  if (kind === "income-cap") {
    const coop = inputs.f1099patr[0];
    coop.box1_patronage_dividends = 3000000.24;
    coop.box3_per_unit_retain = 3000000.25;
    coop.box7_qualified_payments = 6000000.49;
    coop.box8_section199aa_qualified_items = 6000000.49;
    coop.box6_section199ag_deduction = 540000;
    coop.distribution_treatment.verified_taxable_amount = 6000000.49;
    inputs.qbi_patron.source_1099patr = coop;
    inputs.qbi_patron.box6_written_notice_review.designated_199ag_amount =
      540000;
    const farm = inputs.schedule_f.schedule_fs[0];
    farm.line3a_cooperative_distributions = 6000000.49;
    farm.line3b_cooperative_distributions_taxable = 6000000.49;
    farm.line16_feed = 5735000.50;
  }
  if (kind === "c-health") {
    for (const month of inputs.form7206.single_schedule_c_plan.premium_months) {
      month.employer_plan_review_reference =
        "Synthetic review: neither primary nor spouse eligible for employer-subsidized health plan";
    }
  }
  return {
    ...original,
    id: `joint-form8995a-patron-${kind}`,
    filer: joint.filer,
    inputs,
    reviewFocus: [
      ...original.reviewFocus,
      "Joint spouse issued W2 wages join income and Medicare tax; primary business ScheduleSE has no spouse SocialSecurity wage offset",
      "MFJ394600 threshold and100000 range govern actual patron PartIII; primary owns SE and health, while joint forms show both spouses",
    ],
  };
}

/** Spouse owns the actual business/cooperative receipt and policy; primary owns wages. */
export function spouseOwnedPatronFixture(
  base: PdfReviewFixture,
): PdfReviewFixture {
  const inputs = structuredClone(base.inputs) as any;
  const review = inputs.qbi_patron;
  const business = review.business.kind === "schedule_c"
    ? (Array.isArray(inputs.schedule_c)
      ? inputs.schedule_c[0]
      : inputs.schedule_c.schedule_cs[0])
    : inputs.schedule_f.schedule_fs[0];
  business.proprietor_recipient = "S";
  inputs.f1099patr[0].recipient_tin = "444556666";
  review.source_1099patr.recipient_tin = "444556666";
  review.box6_written_notice_review.recipient_tin = "444556666";
  inputs.w2[0].employee_ssn = "111223333";
  inputs.w2[0].source_document_reference =
    "Synthetic primary issued 2025 W2 copy";
  review.primary_w2_sources = structuredClone(inputs.w2);
  delete review.spouse_w2_sources;
  if (inputs.form7206) {
    const plan = inputs.form7206.single_schedule_c_plan;
    plan.recipient = "S";
    plan.spouse_identity = { name: "Sam Example", ssn: "444556666" };
    for (const month of plan.premium_months) month.covered_person = "spouse";
    inputs.form7206.single_schedule_c_plan = withHealthPolicyRecords(plan);
  }
  return {
    ...base,
    id: base.id.replace("joint-form", "joint-spouse-owned-form"),
    inputs,
    reviewFocus: [
      ...base.reviewFocus,
      "Spouse owns Schedule C/F, Schedule SE, cooperative source and health; primary wages never consume spouse SSA cap",
    ],
  };
}
