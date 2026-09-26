import { assertEquals, assertThrows } from "@std/assert";
import {
  calculateForm8912BondInterest,
  calculateForm8912IndividualLimit,
  deriveForm8912IndividualLimitInput,
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

const source = {
  line1: 2_000,
  line2: 1_000,
  line3: 500,
  line4: 3_500,
  hasPassThroughCrebCredit: false,
};

const finalized = {
  form1040Line16: 10_000,
  form1040Line19: 400,
  schedule2Line1z: 200,
  form6251Line11: 100,
  schedule3Line1: 1_000,
  schedule3Line6a: 3_000,
  schedule3Line6b: 500,
  schedule3Line6k: 0,
  schedule3Line8: 6_100,
  form3800AllowedCredit: 3_000,
};

Deno.test("Form 8912: finalized return bridge excludes FTC, GBC, prior AMT, and itself", () => {
  const input = deriveForm8912IndividualLimitInput(source, finalized);
  assertEquals(input.foreignTaxCredit, 1_000);
  assertEquals(input.priorAllowableCredits, 2_000);
  assertEquals(input.form3800AllowedCredit, 3_000);
  assertEquals(input.priorYearMinimumTaxCredit, 500);
  assertEquals(input.schedule2Line1z, 200);
  assertEquals(input.form6251Line11, 100);
  assertEquals(calculateForm8912IndividualLimit(input).line12, 3_500);

  const withOwnCredit = deriveForm8912IndividualLimitInput(source, {
    ...finalized,
    schedule3Line6k: 500,
    schedule3Line8: 6_600,
  });
  assertEquals(withOwnCredit.priorAllowableCredits, 2_000);
});

Deno.test("Form 8912: finalized return bridge rejects unproven Form 3800 amounts", () => {
  assertThrows(
    () =>
      deriveForm8912IndividualLimitInput(source, {
        ...finalized,
        form3800AllowedCredit: 2_000,
      }),
    Error,
    "reconcile to allowed Form 3800",
  );
  assertThrows(
    () =>
      deriveForm8912IndividualLimitInput(source, {
        ...finalized,
        schedule3Line8: 4_000,
      }),
    Error,
    "smaller than its excluded credits",
  );
});

Deno.test("Form 8912: bond-interest calculation excludes purchased accrued interest", () => {
  const interest = calculateForm8912BondInterest(275, 50, 20);
  assertEquals(interest.creditInterest, 275);
  assertEquals(interest.purchaseAccruedInterestRecoveredAsBasis, 50);
  assertEquals(interest.saleAccruedInterest, 20);
  assertEquals(interest.taxableInterest, 245);
  assertThrows(
    () => calculateForm8912BondInterest(100, 101, 0),
    Error,
    "cannot exceed current-year bond credit",
  );
});
