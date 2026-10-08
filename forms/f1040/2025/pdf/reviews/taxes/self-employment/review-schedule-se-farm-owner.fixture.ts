import type { PdfReviewFixture } from "../../../review-fixtures.ts";
import { ownedScheduleSeInputs } from "./review-schedule-se-owner.fixture.ts";
export const mixedOwnerCases = [
  {
    id: "mixed-proprietors-spouse-cap",
    c: 60000,
    f: 40000,
    recipient: "S" as const,
    wages: ["S"] as ("T" | "S")[],
    tax: 9549,
  },
  {
    id: "same-owner-combined-minimum",
    c: 250,
    f: 250,
    recipient: "T" as const,
    wages: [] as ("T" | "S")[],
    tax: 70,
  },
  {
    id: "same-owner-business-loss-farm-profit",
    c: -300,
    f: 800,
    recipient: "T" as const,
    wages: [] as ("T" | "S")[],
    tax: 70,
  },
  {
    id: "primary-loss-spouse-farm-minimum",
    c: -100,
    f: 500,
    recipient: "S" as const,
    wages: [] as ("T" | "S")[],
    tax: 70,
  },
  {
    id: "same-owner-business-profit-farm-loss",
    c: 60000,
    f: -10000,
    recipient: "T" as const,
    wages: [] as ("T" | "S")[],
    tax: 7065,
  },
  {
    id: "mixed-proprietors-source-cents",
    c: 60000.49,
    f: 40000.50,
    recipient: "S" as const,
    wages: ["S"] as ("T" | "S")[],
    tax: 9549,
  },
] as const;
export function ownedFarmRecord(profit: number, recipient: "T" | "S") {
  return {
    farm_id: "Owned-Farm",
    proprietor_recipient: recipient,
    line_a_principal_crop_activity: "GRAIN FARMING",
    line_b_agricultural_activity_code: "111100",
    line_c_farm_name: "Owned source farm",
    line_d_ein: "123456791",
    line_e_material_participation: true,
    accounting_method: "cash",
    line_f_made_1099_payments: false,
    line1_sales_livestock_resale: 0,
    line2_sales_products_raised: Math.max(0, profit),
    line16_feed: Math.max(0, -profit),
    line36_at_risk: "a",
    ccc_loan_election_in_effect: false,
    qbi_no_other_adjustments_confirmed: true,
  };
}
export function ownedFarmInputs(
  single: PdfReviewFixture,
  joint: PdfReviewFixture,
  row: typeof mixedOwnerCases[number],
) {
  const inputs = ownedScheduleSeInputs(single, joint, [row.c], [...row.wages]);
  return {
    ...inputs,
    general: {
      ...inputs.general,
      ...(row.c < 0 || row.f < 0
        ? {
          form461_scope_review: {
            only_schedule_c_and_f_business_items: true,
            other_part_i_lines_zero: true,
            part_ii_adjustments_zero: true,
            post_at_risk_and_passive_limits_confirmed: true,
            line2_schedule_c_amount: row.c,
            line6_schedule_f_amount: row.f,
            source_document_refs: [
              "Owned-0",
              "Owned-Farm",
              "Synthetic reviewed full Form461 C/F source inventory",
            ],
          },
        }
        : {}),
    },
    schedule_f: { schedule_fs: [ownedFarmRecord(row.f, row.recipient)] },
  };
}
export function ownedFarmReviewFixture(
  single: PdfReviewFixture,
  joint: PdfReviewFixture,
): PdfReviewFixture {
  return {
    id: "joint-owned-se-mixed-business-and-farm",
    inputs: ownedFarmInputs(single, joint, mixedOwnerCases[0]),
    filer: joint.filer,
    expectedPdfForms: [
      "f1040",
      "schedule1",
      "schedule2",
      "schedule_c",
      "schedule_f",
      "schedule_se",
      "schedule_se",
      "form8995",
      "form8959",
      "form8960",
    ],
    reviewFocus: [
      "Independent primary business/spouse farm wage caps",
      "Actual farm/C profits and owner-attributable SE/QBI",
      "Separate native/PDF owners and return totals",
    ],
  };
}
