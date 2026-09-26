import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../../types.ts";
import { calculateForm3800Nonpassive } from "./calculation.ts";

function input(overrides: Record<string, number> = {}) {
  return {
    filingStatus: FilingStatus.Single as const,
    regularTax: 40_000,
    alternativeMinimumTax: 0,
    foreignTaxCredit: 0,
    priorAllowableCredits: 0,
    tentativeMinimumTax: 20_000,
    standardCredit: 0,
    specifiedCredit: 0,
    ...overrides,
  };
}

Deno.test("Form 3800 Part II: MFS threshold depends on spouse business credit", () => {
  const base = input({ regularTax: 20_000 });
  const withSpouseCredit = calculateForm3800Nonpassive({
    ...base,
    filingStatus: FilingStatus.MFS,
    spouseHasBusinessCredit: true,
  });
  const withoutSpouseCredit = calculateForm3800Nonpassive({
    ...base,
    filingStatus: FilingStatus.MFS,
    spouseHasBusinessCredit: false,
  });
  assertEquals(withSpouseCredit.line13, 1_875);
  assertEquals(withoutSpouseCredit.line13, 0);
});

Deno.test("Form 3800 Part II: ordinary credit cannot exceed tax above TMT", () => {
  const result = calculateForm3800Nonpassive(input({ standardCredit: 30_000 }));
  assertEquals(result.line13, 3_750);
  assertEquals(result.line15, 20_000);
  assertEquals(result.line16, 20_000);
  assertEquals(result.line17, 20_000);
  assertEquals(result.line38, 20_000);
  assertEquals(result.unusedStandardCredit, 10_000);
});

Deno.test("Form 3800 Part II: specified credit reaches section C after ordinary credit", () => {
  const result = calculateForm3800Nonpassive(input({
    standardCredit: 30_000,
    specifiedCredit: 15_000,
  }));
  assertEquals(result.line17, 20_000);
  assertEquals(result.line27, 36_250);
  assertEquals(result.line29, 16_250);
  assertEquals(result.line37, 15_000);
  assertEquals(result.line38, 35_000);
});

Deno.test("Form 3800 Part II: foreign and prior credits reduce net income tax", () => {
  const result = calculateForm3800Nonpassive(input({
    foreignTaxCredit: 3_000,
    priorAllowableCredits: 10_000,
    tentativeMinimumTax: 5_000,
    standardCredit: 30_000,
  }));
  assertEquals(result.line10c, 13_000);
  assertEquals(result.line11, 27_000);
  assertEquals(result.line12, 27_000);
  assertEquals(result.line13, 500);
  assertEquals(result.line17, 22_000);
});

Deno.test("Form 3800 Part II: no net income tax allows no business credit", () => {
  const result = calculateForm3800Nonpassive(input({
    regularTax: 5_000,
    foreignTaxCredit: 5_000,
    tentativeMinimumTax: 0,
    standardCredit: 4_000,
    specifiedCredit: 3_000,
  }));
  assertEquals(result.line11, 0);
  assertEquals(result.line38, 0);
  assertEquals(result.unusedStandardCredit, 4_000);
  assertEquals(result.unusedSpecifiedCredit, 3_000);
});

Deno.test("Form 3800 Part II: AMT and TMT are distinct inputs", () => {
  const result = calculateForm3800Nonpassive(input({
    regularTax: 20_000,
    alternativeMinimumTax: 5_000,
    tentativeMinimumTax: 25_000,
    standardCredit: 1_000,
    specifiedCredit: 1_000,
  }));
  assertEquals(result.line8, 5_000);
  assertEquals(result.line14, 25_000);
  assertEquals(result.line17, 0);
  assertEquals(result.line37, 1_000);
});

Deno.test("Form 3800 Part II: rejects negative and nonfinite source amounts", () => {
  assertThrows(() =>
    calculateForm3800Nonpassive(input({ standardCredit: -1 }))
  );
  assertThrows(() =>
    calculateForm3800Nonpassive(input({ regularTax: Number.NaN }))
  );
});
