import { assertEquals, assertThrows } from "@std/assert";
import { calculateForm8978NegativeAdjustment } from "./form8978_negative_adjustment.ts";

Deno.test("Form 8978 negative worksheet fits entirely on Schedule 3 line 6l", () => {
  assertEquals(calculateForm8978NegativeAdjustment(700, 1_000, 300), {
    schedule3Line6l: 700,
    amountAfterSchedule3: 0,
    schedule2Line17zReduction: 0,
    remainingUnapplied: 0,
  });
});

Deno.test("Form 8978 negative worksheet uses eligible Schedule 2 tax only after line 18", () => {
  assertEquals(calculateForm8978NegativeAdjustment(1_500, 1_000, 300), {
    schedule3Line6l: 1_000,
    amountAfterSchedule3: 500,
    schedule2Line17zReduction: 300,
    remainingUnapplied: 200,
  });
});

Deno.test("Form 8978 negative worksheet cannot offset non-chapter-1 other tax", () => {
  assertEquals(calculateForm8978NegativeAdjustment(1_500, 1_000, 0), {
    schedule3Line6l: 1_000,
    amountAfterSchedule3: 500,
    schedule2Line17zReduction: 0,
    remainingUnapplied: 500,
  });
});

Deno.test("Form 8978 negative worksheet rejects invalid filed amounts", () => {
  assertThrows(() => calculateForm8978NegativeAdjustment(-1, 1_000, 0));
  assertThrows(() => calculateForm8978NegativeAdjustment(100, 2.5, 0));
});
