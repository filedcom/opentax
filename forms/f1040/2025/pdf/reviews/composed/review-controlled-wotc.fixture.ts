import type { PdfReviewFixture } from "../../review-fixtures.ts";
import { bothOwnerWotcReviewFixtures } from "./review-joint-wotc.fixture.ts";
import {
  calculateForm5884,
  inputSchema,
} from "../../../../nodes/inputs/f5884/index.ts";

export function controlledWotcReviewFixtures(
  base: PdfReviewFixture,
  joint: PdfReviewFixture,
): PdfReviewFixture[] {
  const ordinary = bothOwnerWotcReviewFixtures(base, joint);
  return ["phasein", "fractional-phasein", "partial-above"].map((kind) => {
    const inherited = ordinary.find((f) =>
      f.id.endsWith(kind === "fractional-phasein" ? "phasein" : kind)
    )!;
    const inputs = structuredClone(inherited.inputs) as any;
    delete inputs.f5884.ordinary_joint_employer_control_review;
    const businesses = inputs.schedule_c;
    inputs.f5884.controlled_group = {
      kind: "businesses_under_common_control",
      group_classification_document_reference:
        "Synthetic section52 ownership and spousal management common-control workpaper",
      taxpayer_member_ein: businesses[0].line_d_ein,
      members: businesses.map((b: any) => ({
        ein: b.line_d_ein,
        business_name: b.line_c_business_name,
      })),
      joint_filed_members_review: {
        members: businesses.map((b: any) => ({
          ein: b.line_d_ein,
          proprietor_recipient: b.proprietor_recipient,
          proprietor_ssn: b.qbi_wotc_filing_review.owner_ssn,
          business_reference: b.business_reference,
          direct_owner_percent: 100,
          other_spouse_management_participation_confirmed: true,
          spousal_ownership_attribution_applies_confirmed: true,
        })),
        ownership_and_attribution_source_reference:
          "Synthetic shared spousal management and attributed ownership source",
        common_control_confirmed: true,
        complete_group_members_and_payroll_confirmed: true,
        reviewed_by: "Synthetic reviewer",
        reviewed_on: "2026-03-01",
      },
    };
    const count = inputs.f5884.f5884s.length / 2;
    inputs.f5884.f5884s.forEach((e: any, i: number) => {
      const employer = i < count ? 0 : 1, person = i % count;
      e.employer_ein = businesses[employer].line_d_ein;
      e.employee_reference = `SYNTHETIC-SHARED-PERSON-${person}`;
      e.group_employee_identity_review = {
        employee_identity_source_reference:
          `Synthetic reviewed person identity ${person}`,
        same_employee_across_members_confirmed: true,
        group_first_workday_on: e.hired_on,
        complete_group_hours_and_wages_confirmed: true,
      };
      if (kind === "fractional-phasein") {
        const wages = employer === 0 ? 4000.49 : 3000.52;
        e.wage_records[0].qualified_wages = wages;
      }
      const record =
        businesses[employer].qbi_wotc_filing_review.employee_w2_records[person];
      record.employee_reference = e.employee_reference;
      record.box1_wages = e.wage_records.reduce(
        (a: number, r: any) => a + r.qualified_wages,
        0,
      );
      record.box5_wages = record.box1_wages;
    });
    const computed = calculateForm5884(inputSchema.parse(inputs.f5884));
    businesses.forEach((b: any) => {
      b.line_26_wages = b.qbi_wotc_filing_review.employee_w2_records.reduce(
        (a: number, r: any) => a + r.box1_wages,
        0,
      );
      const credit = computed.wageDeductionAllocations.find((a) =>
        a.location.kind === "schedule_c" &&
        a.location.business_reference === b.business_reference
      )!.credit_amount;
      b.qbi_w2_wages = b.line_26_wages - credit;
    });
    return {
      ...inherited,
      id: `joint-controlled-wotc-${kind}`,
      inputs,
      reviewFocus: [
        "One reviewed person shared across two actual employers; distinct certification/payroll/issued W2 joins",
        "Group employee cap once and proportionate filed member shares/full wage reductions before owner SE/QBI",
        "Joint source/header, actual current-use credit, native group statements and printable allocation; synthetic evidence only",
      ],
    };
  });
}
