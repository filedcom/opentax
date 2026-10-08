import type { PdfReviewFixture } from "../../../review-fixtures.ts";
import { ownedScheduleSeInputs } from "./review-schedule-se-owner.fixture.ts";
import { ownedFarmRecord } from "./review-schedule-se-farm-owner.fixture.ts";
export const optionalFarmCases = [
  {
    id: "optional-spouse-cap-profit",
    c: 60000,
    cgross: 60000,
    farms: [{ gross: 3000, profit: 300, owner: "S" }],
    tax: 8536,
    half: 4268,
    agi: 232132,
    qbi: 11206,
  },
  {
    id: "optional-spouse-cap-loss",
    c: 60000,
    cgross: 60000,
    farms: [{ gross: 900, profit: -300, owner: "S" }],
    tax: 8495,
    half: 4248,
    agi: 231552,
    qbi: 11090,
  },
  {
    id: "optional-same-owner",
    c: 1000,
    cgross: 1000,
    farms: [{ gross: 3000, profit: 300, owner: "T" }],
    tax: 448,
    half: 224,
    agi: 177176,
    qbi: 215,
  },
  {
    id: "optional-nonfarm-loss",
    c: -300,
    cgross: 500,
    farms: [{ gross: 3000, profit: 300, owner: "T" }],
    tax: 260,
    half: 130,
    agi: 175970,
    qbi: 0,
  },
  {
    id: "optional-combined-below-minimum",
    c: -1800,
    cgross: 500,
    farms: [{ gross: 3000, profit: 300, owner: "T" }],
    tax: 0,
    half: 0,
    agi: 174600,
    qbi: 0,
  },
  {
    id: "optional-two-farms-loss",
    c: 1000,
    cgross: 1000,
    farms: [{ gross: 3000, profit: 300, owner: "T" }, {
      gross: 6000,
      profit: -600,
      owner: "T",
    }],
    tax: 1060,
    half: 530,
    agi: 176270,
    qbi: 34,
  },
  {
    id: "optional-exact-gross-boundary",
    c: 1000,
    cgross: 1000,
    farms: [{ gross: 10860, profit: 7840, owner: "T" }],
    tax: 1249,
    half: 625,
    agi: 184315,
    qbi: 1643,
  },
  {
    id: "optional-net-boundary",
    c: 1000,
    cgross: 1000,
    farms: [{ gross: 10861, profit: 7839, owner: "T" }],
    tax: 1249,
    half: 625,
    agi: 184314,
    qbi: 1643,
  },
  {
    id: "optional-two-farm-owners",
    c: 1000,
    cgross: 1000,
    farms: [{ gross: 3000, profit: 300, owner: "T" }, {
      gross: 6000,
      profit: -600,
      owner: "S",
    }],
    tax: 564,
    half: 282,
    agi: 176518,
    qbi: 84,
  },
] as const;
export function optionalFarmInputs(
  single: PdfReviewFixture,
  joint: PdfReviewFixture,
  row: typeof optionalFarmCases[number],
) {
  const inputs = ownedScheduleSeInputs(single, joint, [row.c], ["S"]);
  inputs.schedule_c[0].line_1_gross_receipts = row.cgross;
  inputs.schedule_c[0].line_8_advertising = row.cgross - row.c;
  const farms = row.farms.map((f, i) => ({
    ...ownedFarmRecord(f.profit, f.owner),
    farm_id: `Optional-Farm-${i}`,
    line_c_farm_name: `Optional farm ${i + 1}`,
    line_d_ein: String(123456791 + i),
    line2_sales_products_raised: f.gross,
    line16_feed: f.gross - f.profit,
  }));
  const profit = row.farms.reduce((sum, f) => sum + f.profit, 0);
  return {
    ...inputs,
    general: {
      ...inputs.general,
      ...(row.c < 0 || row.farms.some((f) => f.profit < 0)
        ? {
          form461_scope_review: {
            only_schedule_c_and_f_business_items: true,
            other_part_i_lines_zero: true,
            part_ii_adjustments_zero: true,
            post_at_risk_and_passive_limits_confirmed: true,
            line2_schedule_c_amount: row.c,
            line6_schedule_f_amount: profit,
            source_document_refs: [
              "Owned-0",
              ...farms.map((f) => f.farm_id),
              "Synthetic reviewed complete C/F inventory",
            ],
          },
        }
        : {}),
    },
    schedule_f: { farm_optional_method_elected: true, schedule_fs: farms },
  };
}

export function optionalFarmReviewFixtures(
  single: PdfReviewFixture,
  joint: PdfReviewFixture,
): PdfReviewFixture[] {
  return optionalFarmCases.map((row) => ({
    id: row.id,
    inputs: optionalFarmInputs(single, joint, row),
    filer: joint.filer,
    expectedPdfForms: [
      "f1040",
      "schedule1",
      "schedule_c",
      ...row.farms.map(() => "schedule_f"),
      "form8995",
      ...(row.tax
        ? [
          "schedule2",
          "schedule_se",
          ...(row.farms.some((f) => f.owner === "S") ? ["schedule_se"] : []),
        ]
        : []),
    ],
    reviewFocus: [
      "Actual source farm profit/loss is retained separately from optional SE earnings",
      "Each owner retains the correct wage cap and half-SE adjustment",
      "Shared owner half-SE follows actual gross-income proportions; filed QBI rows and carryforward reconcile",
    ],
  }));
}
