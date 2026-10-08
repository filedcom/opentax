import { assertEquals } from "@std/assert";
import { calculateForm3800Nonpassive } from "../../../../nodes/inputs/f3800/calculation.ts";
import { FilingStatus } from "../../../../nodes/types.ts";

Deno.test("whole-dollar Form 3800 reuses rounded 75% TMT before empowerment credit tax use", () => {
  const tax = {
    regularTax: 40_000,
    alternativeMinimumTax: 0,
    foreignTaxCredit: 0,
    priorAllowableCredits: 0,
    tentativeMinimumTax: 20_001,
    standardCredit: 0,
    empowermentCredit: 30_000,
    specifiedCredit: 0,
    standardCarryforward: 0,
    specifiedCarryforward: 0,
    filingStatus: FilingStatus.Single as const,
  };
  const passive = {
    line2: 0,
    line3: 0,
    line23: 0,
    line24: 0,
    line32: 0,
    line33: 0,
  };
  const sourceMath = calculateForm3800Nonpassive(tax, passive);
  assertEquals(sourceMath.line18, 15_000.75);
  assertEquals(sourceMath.line26, 24_999.25);
  const filed = calculateForm3800Nonpassive(tax, passive, {
    roundPercentageLinesToWholeDollars: true,
  });
  assertEquals(filed.line18, 15_001);
  assertEquals(filed.line26, 24_999);
  assertEquals(filed.line38, 24_999);
});
