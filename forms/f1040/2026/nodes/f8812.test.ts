import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../../nodes/types.ts";
import { f8812_2026 } from "./f8812.ts";

const context = { taxYear: 2026, formType: "f1040" };
const worksheet = {
  schedule3_line1: 0,
  schedule3_line2: 0,
  schedule3_line3: 0,
  schedule3_line4: 0,
  schedule3_line6d: 0,
  schedule3_line6f: 0,
  schedule3_line6l: 0,
  schedule3_line6m: 0,
  worksheet_b_applies: false,
};

Deno.test("TY2026 Schedule 8812 uses 1040 line 18 including Schedule 2 tax", () => {
  const result = f8812_2026.compute(context, {
    auto_qualifying_children: 1,
    auto_filing_status: FilingStatus.Single,
    auto_agi: 50_000,
    auto_income_tax_liability: 1_000,
    auto_schedule2_line3: 1_000,
    line18a_earned_income: 10_000,
    credit_limit_worksheet_2026: worksheet,
  });
  const f1040 = result.outputs.find((output) => output.nodeType === "f1040")!;
  const schedule = result.outputs.find((output) =>
    output.nodeType === "f8812"
  )!;
  assertEquals(schedule.fields.line13, 2_000);
  assertEquals(schedule.fields.line14, 2_000);
  assertEquals(schedule.fields.line27, 200);
  assertEquals(f1040.fields.line19_child_tax_credit, 2_000);
  assertEquals(f1040.fields.line28_actc, 200);
  assertEquals(f1040.fields.schedule8812_finalized, true);
});

Deno.test("TY2026 Schedule 8812 requires calculated tax and worksheet facts", () => {
  const base = {
    auto_qualifying_children: 1,
    auto_filing_status: FilingStatus.Single,
    auto_agi: 50_000,
  };
  assertThrows(
    () =>
      f8812_2026.compute(context, {
        ...base,
        credit_limit_worksheet_2026: worksheet,
      }),
    Error,
    "needs calculated Form 1040 line 16 tax",
  );
  assertThrows(
    () =>
      f8812_2026.compute(context, {
        ...base,
        auto_income_tax_liability: 2_000,
      }),
    Error,
    "needs complete Credit Limit Worksheet",
  );
});

Deno.test("TY2026 Schedule 8812 worksheet checks filed Schedule 3 credit sources", () => {
  const schedule3Lines = {
    schedule3_line1: 100,
    schedule3_line2: 0,
    schedule3_line3: 0,
    schedule3_line4: 0,
    schedule3_line6d: 0,
    schedule3_line6f: 0,
    schedule3_line6l: 0,
    schedule3_line6m: 0,
    schedule3_line5a: 0,
    schedule3_line6c: 0,
    schedule3_line6g: 0,
    schedule3_line6h: 0,
  };
  assertThrows(
    () =>
      f8812_2026.compute(context, {
        auto_qualifying_children: 1,
        auto_filing_status: FilingStatus.Single,
        auto_agi: 50_000,
        auto_income_tax_liability: 3_000,
        auto_schedule3_credit_lines: schedule3Lines,
        credit_limit_worksheet_2026: worksheet,
      }),
    Error,
    "disagrees with Schedule 3 schedule3_line1",
  );
  const result = f8812_2026.compute(context, {
    auto_qualifying_children: 1,
    auto_filing_status: FilingStatus.Single,
    auto_agi: 50_000,
    auto_income_tax_liability: 3_000,
    auto_schedule3_credit_lines: schedule3Lines,
    credit_limit_worksheet_2026: { ...worksheet, schedule3_line1: 100 },
  });
  assertEquals(
    result.outputs.find((output) => output.nodeType === "f8812")!.fields.line13,
    2_900,
  );
});
