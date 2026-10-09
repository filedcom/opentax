import { assertEquals, assertThrows } from "@std/assert";
import { f1040 } from "./index.ts";
import { FilingStatus } from "../../../../types.ts";

const source = {
  filing_status: FilingStatus.Single,
  taxpayer_age_65_or_older: true,
  age_65_source_reference: "Synthetic birth record",
  agi: 7500,
};
function input(tax: number, foreign: number, care: number, adjustment: number) {
  return f1040.inputSchema.parse({
    filing_status: FilingStatus.Single,
    taxpayer_age_65_or_older: true,
    line11_agi: 7500,
    line16_income_tax: tax,
    line20_nonrefundable_credits: 750 + foreign + care + adjustment,
    schedule_r_source: source,
    credit_limit_schedule3_lines: {
      line1: foreign,
      line2: care,
      line3: 0,
      line4: 0,
      line5a: 0,
      line5b: 0,
      line6aGbc: 0,
      line6bPriorMinimumTax: 0,
      line6kBondCredit: 0,
      line6dElderlyDisabled: 750,
      line6lForm8978: adjustment,
      line7: 750 + adjustment,
    },
  });
}
const ctx = { taxYear: 2025, formType: "f1040" };

Deno.test("Schedule R final limit subtracts exactly the three priority worksheet lines", () => {
  for (
    const [tax, foreign, care, adjustment, expected] of [
      [0, 0, 0, 0, 0],
      [500, 100, 50, 25, 325],
      [175, 100, 50, 25, 0],
      [925, 100, 50, 25, 750],
      [1000, 100, 50, 25, 750],
    ]
  ) {
    const raw = input(tax, foreign, care, adjustment),
      held = structuredClone(raw);
    const result = f1040.compute(ctx, raw);
    const s3 = result.finalizations?.find((f) => f.nodeType === "schedule3")
      ?.fields;
    assertEquals(s3?.line6d_elderly_disabled_credit ?? 0, expected);
    assertEquals(s3?.line7_total ?? 0, expected + adjustment);
    assertEquals(s3?.line8_total ?? 0, expected + foreign + care + adjustment);
    assertEquals(result.replayInput, raw);
    assertEquals(raw, held);
  }
});

Deno.test("Schedule R replay retains tentative source for a changed tax counterfactual", () => {
  const first = f1040.compute(ctx, input(500, 100, 50, 25));
  const replay = f1040.inputSchema.parse(first.replayInput);
  const second = f1040.compute(ctx, { ...replay, line16_income_tax: 1000 });
  assertEquals(
    second.finalizations?.find((f) => f.nodeType === "schedule3")?.fields
      .line6d_elderly_disabled_credit,
    750,
  );
});

Deno.test("Schedule R rejects conflicting tentative amounts and source AGI or status", () => {
  const valid = input(500, 100, 50, 25);
  for (
    const bad of [
      { ...valid, schedule_r_source: { ...source, agi: 7501 } },
      {
        ...valid,
        schedule_r_source: { ...source, filing_status: FilingStatus.MFS },
      },
      {
        ...valid,
        credit_limit_schedule3_lines: {
          ...valid.credit_limit_schedule3_lines!,
          line6dElderlyDisabled: 749,
        },
      },
      { ...valid, line20_nonrefundable_credits: 749 },
    ]
  ) assertThrows(() => f1040.compute(ctx, bad));
});
