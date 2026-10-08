import { assertEquals, assertThrows } from "@std/assert";
import { FIELD_MAP, form8990 } from "./f8990.ts";

Deno.test("2025 Form 8990 MeF line 7 occupies the native XSD sequence after taxable income", () => {
  const line6 = FIELD_MAP.findIndex(([key]) => key === "line6");
  assertEquals(FIELD_MAP[line6], ["line6", "TaxableIncomeAmt"]);
  assertEquals(FIELD_MAP[line6 + 1], [
    "line7",
    "LossDeductionNotAllocableAmt",
  ]);
  assertEquals(FIELD_MAP[line6 + 2], [
    "line8",
    "BusInterestExpnsNotPassThruAmt",
  ]);
});

Deno.test("2025 Form 8990 empty pending slice emits no document", () => {
  assertEquals(form8990.build({}), "");
});

Deno.test("2025 Form 8990 MeF rejects an active calculated-looking attachment", () => {
  assertThrows(
    () =>
      form8990.build({
        line1: 8_000,
        line7: 15_750,
        line30: 5_000,
        line31: 3_000,
      }),
    Error,
    "needs the finalized return graph",
  );
});

Deno.test("2025 Form 8990 MeF does not trust prefilled allowance lines", () => {
  assertThrows(
    () =>
      form8990.build({
        line1: 8_000,
        line22: 108_000,
        line29: 32_400,
        line30: 8_000,
        line31: 0,
      }),
    Error,
    "needs the finalized return graph",
  );
});
