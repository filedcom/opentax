import { assertEquals, assertThrows } from "@std/assert";
import {
  calculateSettlement2026,
  type Settlement2026Input,
} from "./settlement.ts";

const base: Settlement2026Input = {
  line22TaxAfterCredits: 4_000,
  line23OtherTaxes: 500,
  form1062Line15: 250,
  line25dWithholding: 3_000,
  line26EstimatedPayments: 0,
  line27aEic: 0,
  line28Actc: 0,
  line29RefundableAotc: 0,
  line30RefundableAdoption: 0,
  line31OtherPayments: 0,
  schedule2Line20: 0,
};

Deno.test("2026 Form 1062 installment is included in line 24c and balance", () => {
  const result = calculateSettlement2026(base);
  assertEquals(result.line24aTotalTax, 4_500);
  assertEquals(result.line24bForm1062, 250);
  assertEquals(result.line24cTaxIncludingForm1062, 4_750);
  assertEquals(result.schedule3a, undefined);
  assertEquals(result.line37AmountOwed, 1_750);
});

Deno.test("2026 Schedule 3-A subtracts Schedule 2 line 20 before finding benefit", () => {
  const result = calculateSettlement2026({
    ...base,
    line27aEic: 5_000,
    line31OtherPayments: 200,
    schedule2Line20: 1_000,
    wantsFederalPublicBenefit: true,
    eligibleForFederalPublicBenefit: true,
  });
  assertEquals(result.line32aRefundableCredits, 5_200);
  assertEquals(result.schedule3a?.line2, 5_000);
  assertEquals(result.schedule3a?.line5, 3_500);
  assertEquals(result.schedule3a?.line6FederalPublicBenefit, 1_500);
  assertEquals(result.line32bFederalPublicBenefitReduction, 0);
  assertEquals(result.line32cNetRefundableCredits, 5_200);
  assertEquals(result.line34Overpayment, 3_450);
});

Deno.test("2026 Schedule 3-A line 7 No reduces refundable credits", () => {
  const result = calculateSettlement2026({
    ...base,
    line28Actc: 5_000,
    wantsFederalPublicBenefit: false,
  });
  assertEquals(result.schedule3a?.line6FederalPublicBenefit, 500);
  assertEquals(result.schedule3a?.line8DisallowedBenefit, undefined);
  assertEquals(result.line32bFederalPublicBenefitReduction, 500);
  assertEquals(result.line32cNetRefundableCredits, 4_500);
  assertEquals(result.line33TotalPayments, 7_500);
});

Deno.test("2026 Schedule 3-A line 8 No reduces credits and requires answers", () => {
  const claim = { ...base, line30RefundableAdoption: 5_000 };
  assertThrows(() => calculateSettlement2026(claim), Error, "line 7 election");
  assertThrows(
    () =>
      calculateSettlement2026({ ...claim, wantsFederalPublicBenefit: true }),
    Error,
    "line 8 eligibility",
  );
  const result = calculateSettlement2026({
    ...claim,
    wantsFederalPublicBenefit: true,
    eligibleForFederalPublicBenefit: false,
  });
  assertEquals(result.schedule3a?.line8DisallowedBenefit, 500);
  assertEquals(result.line32bFederalPublicBenefitReduction, 500);
});

Deno.test("2026 settlement rejects inconsistent upstream tax amounts", () => {
  assertThrows(
    () => calculateSettlement2026({ ...base, schedule2Line20: 4_501 }),
    RangeError,
    "cannot exceed",
  );
  assertThrows(
    () => calculateSettlement2026({ ...base, line23OtherTaxes: Number.NaN }),
    RangeError,
    "finite nonnegative",
  );
});
