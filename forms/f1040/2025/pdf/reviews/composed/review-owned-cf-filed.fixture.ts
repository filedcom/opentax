import type { PdfReviewFixture } from "../../review-fixtures.ts";
import {
  mixedOwnerCases,
  ownedFarmInputs,
} from "./review-schedule-se-farm-owner.fixture.ts";
export const ownedCfFiledCases: {
  id: string;
  c: number;
  f: number;
  loss: number;
  cGross?: number;
  fGross?: number;
  meals?: number;
  conservation?: number;
  otherExpenses?: number[];
}[] = [
  {
    id: "business-filed-part-v-total",
    c: -300.98,
    f: 800,
    loss: -301,
    otherExpenses: [.49, .49],
  },
  { id: "farm-loss-49", c: 60000, f: -10000.49, loss: -10000 },
  { id: "farm-loss-50", c: 60000, f: -10000.50, loss: -10001 },
  { id: "farm-loss-51", c: 60000, f: -10000.51, loss: -10001 },
  { id: "business-loss-49", c: -300.49, f: 800, loss: -300 },
  { id: "business-loss-50", c: -300.50, f: 800, loss: -301 },
  { id: "farm-loss-small-half", c: 60000, f: -.50, loss: -1 },
  {
    id: "farm-filed-leaf-operands",
    c: 60000,
    f: -10000.01,
    loss: -10001,
    fGross: 1000.49,
  },
  {
    id: "business-filed-leaf-operands",
    c: -300.01,
    f: 800,
    loss: -301,
    cGross: 1000.49,
  },
  {
    id: "business-filed-meal-allowance",
    c: -350.75,
    f: 800,
    loss: -351,
    meals: 100.50,
  },
  {
    id: "farm-filed-conservation-allowance",
    c: 60000,
    f: -10247.75,
    loss: -10248,
    fGross: 1003,
    conservation: 400,
  },
];
export function ownedCfFiledInputs(
  single: PdfReviewFixture,
  joint: PdfReviewFixture,
  row: typeof ownedCfFiledCases[number],
) {
  const inputs = ownedFarmInputs(
    single,
    joint,
    {
      ...mixedOwnerCases[0],
      c: row.c,
      f: row.f,
      recipient: "T",
      wages: [],
    } as unknown as typeof mixedOwnerCases[number],
  );
  if (row.cGross !== undefined) {
    inputs.schedule_c[0].line_1_gross_receipts = row.cGross;
    inputs.schedule_c[0].line_8_advertising =
      Math.round((row.cGross - row.c) * 100) / 100;
  }
  if (row.fGross !== undefined) {
    inputs.schedule_f.schedule_fs[0].line2_sales_products_raised = row.fGross;
    inputs.schedule_f.schedule_fs[0].line16_feed =
      Math.round((row.fGross - row.f) * 100) / 100;
  }
  if (row.meals !== undefined) {
    const business = inputs.schedule_c[0] as Record<string, unknown>;
    business.line_24b_meals = row.meals;
    business.line_8_advertising =
      Math.round(((row.cGross ?? 0) - row.c - row.meals * .5) * 100) / 100;
  }
  if (row.otherExpenses !== undefined) {
    const business = inputs.schedule_c[0] as Record<string, unknown>;
    business.part_v_other_expenses = row.otherExpenses.map((amount, index) => ({
      description: `Owned bank service fee ${index + 1}`,
      amount,
    }));
    business.line_8_advertising = Math.round(
      ((row.cGross ?? 0) - row.c -
        row.otherExpenses.reduce((sum, value) => sum + value, 0)) * 100,
    ) / 100;
  }
  if (row.conservation !== undefined) {
    const farm = inputs.schedule_f.schedule_fs[0] as Record<string, unknown>;
    farm.line12_conservation = row.conservation;
    farm.line16_feed = Math.round(
      ((row.fGross ?? 0) - row.f -
        Math.min(row.conservation, (row.fGross ?? 0) * .25)) * 100,
    ) / 100;
  }
  const review = inputs.general.form461_scope_review as {
    line2_schedule_c_amount: number;
    line6_schedule_f_amount: number;
  } | undefined;
  if (review) {
    review.line2_schedule_c_amount = row.c < 0 ? row.loss : row.c;
    review.line6_schedule_f_amount = row.f < 0 ? row.loss : row.f;
  }
  return inputs;
}
export function ownedCfFiledFixture(
  single: PdfReviewFixture,
  joint: PdfReviewFixture,
  row: typeof ownedCfFiledCases[number],
): PdfReviewFixture {
  return {
    id: `joint-owned-cf-filed-${row.id}`,
    inputs: ownedCfFiledInputs(single, joint, row),
    filer: joint.filer,
    expectedPdfForms: [
      "f1040",
      "schedule1",
      "schedule2",
      "schedule_c",
      "schedule_f",
      "schedule_se",
      "form8995",
    ],
    reviewFocus: [
      "Original source cents retained with actual proprietor identity",
      "Signed leaf and derived filing amounts reconcile C/F, Schedule1, ownerSE, QBI and1040",
      "50-cent loss remains negative in native and printable packet",
    ],
  };
}
