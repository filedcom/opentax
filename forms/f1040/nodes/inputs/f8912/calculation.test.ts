import { assertEquals, assertThrows } from "@std/assert";
import {
  calculateForm8912IndividualLimit,
  type Form8912IndividualLimitInput,
} from "./calculation.ts";

const base: Form8912IndividualLimitInput = {
  line1Form1097BtcCredit: 2_000,
  line2PartIVCredit: 1_000,
  line3QualifiedBondCarryforward: 500,
  form1040Line16: 10_000,
  schedule2Line1z: 0,
  form6251Line11: 0,
  foreignTaxCredit: 1_000,
  priorAllowableCredits: 2_000,
  form3800AllowedCredit: 3_000,
  priorYearMinimumTaxCredit: 500,
  hasPassThroughCrebCredit: false,
};

Deno.test("Form 8912: Part II limits the bond credit after Form 3800 and earlier credits", () => {
  const lines = calculateForm8912IndividualLimit(base);
  assertEquals(lines.line4, 3_500);
  assertEquals(lines.line10e, 6_500);
  assertEquals(lines.line11, 3_500);
  assertEquals(lines.line12, 3_500);
  assertEquals(lines.unusedCredit, 0);
});

Deno.test("Form 8912: unused credit is kept separate from the Schedule 3 line 6k amount", () => {
  const lines = calculateForm8912IndividualLimit({
    ...base,
    form1040Line16: 7_000,
  });
  assertEquals(lines.line11, 500);
  assertEquals(lines.line12, 500);
  assertEquals(lines.unusedCredit, 3_000);
});

Deno.test("Form 8912: pass-through CREB credit stops without its separate limit", () => {
  assertThrows(
    () =>
      calculateForm8912IndividualLimit({
        ...base,
        hasPassThroughCrebCredit: true,
      }),
    Error,
    "pass-through CREB",
  );
});
