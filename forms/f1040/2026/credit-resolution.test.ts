import { assertEquals, assertThrows } from "@std/assert";
import {
  calculateCreditLimitWorksheetB2026,
  calculateForm5695Carryforward2026,
  type Form5695Carryforward2026Input,
} from "./credit-resolution.ts";

const noOtherCredits: Form5695Carryforward2026Input = {
  carryforwardFrom2025Line16: 200,
  form1040Line18: 1_000,
  earlierChildCredit: 0,
  schedule3Line6lForm8978: 0,
  schedule3Line1ForeignTax: 0,
  schedule3Line2DependentCare: 0,
  schedule3Line6dElderlyDisabled: 0,
  schedule3Line3Education: 0,
  schedule3Line4RetirementSavings: 0,
  schedule3Line6mPreviouslyOwnedVehicle: 0,
  schedule3Line6fCleanVehicle: 0,
  schedule3Line6gMortgageInterest: 0,
  schedule3Line6cAdoption: 0,
  schedule3Line6hDcHomebuyer: 0,
};

Deno.test("TY2026 Form 5695 uses a $200 prior-year carryforward", () => {
  assertEquals(calculateForm5695Carryforward2026(noOtherCredits), {
    line1_carryforward: 200,
    line2_limit: 1_000,
    line3_credit: 200,
    line4_to_2027: 0,
    priorCredits: 0,
  });
});

Deno.test("TY2026 Form 5695 retains limited and unused credits for 2027", () => {
  const limited = calculateForm5695Carryforward2026({
    ...noOtherCredits,
    form1040Line18: 100,
    schedule3Line1ForeignTax: 80,
  });
  assertEquals(limited.line2_limit, 20);
  assertEquals(limited.line3_credit, 20);
  assertEquals(limited.line4_to_2027, 180);
  const noTax = calculateForm5695Carryforward2026({
    ...noOtherCredits,
    form1040Line18: 0,
  });
  assertEquals(noTax.line2_limit, 0);
  assertEquals(noTax.line3_credit, 0);
  assertEquals(noTax.line4_to_2027, 200);
});

Deno.test("TY2026 Worksheet B line 14 precedes the Form 5695 limit", () => {
  const worksheet = calculateCreditLimitWorksheetB2026({
    schedule8812Line12: 2_000,
    qualifyingChildrenUnder17: 1,
    earnedIncomeWorksheetLine7: 5_000,
    bonaFidePuertoRicoResident: false,
    filesForm2555: false,
    schedule1Line15: 0,
    schedule2Line16c: 0,
    schedule2Line17c: 0,
    form1040Line27aEic: 0,
    schedule3Line11ExcessSocialSecurityRrta: 0,
  });
  assertEquals(worksheet.line5, 375);
  assertEquals(worksheet.line13, 375);
  assertEquals(worksheet.line14, 1_625);
  const energy = calculateForm5695Carryforward2026({
    ...noOtherCredits,
    form1040Line18: 1_700,
    earlierChildCredit: worksheet.line14,
  });
  assertEquals(energy.line2_limit, 75);
  assertEquals(energy.line3_credit, 75);
  assertEquals(energy.line4_to_2027, 125);
});

Deno.test("TY2026 Worksheet B payroll branch uses Schedule 2 lines 16c and 17c", () => {
  const worksheet = calculateCreditLimitWorksheetB2026({
    schedule8812Line12: 4_000,
    qualifyingChildrenUnder17: 3,
    earnedIncomeWorksheetLine7: 3_000,
    bonaFidePuertoRicoResident: false,
    filesForm2555: false,
    line7WithheldSocialSecurityMedicareRrta: 1_500,
    schedule1Line15: 100,
    schedule2Line16c: 50,
    schedule2Line17c: 50,
    form1040Line27aEic: 200,
    schedule3Line11ExcessSocialSecurityRrta: 100,
  });
  assertEquals(worksheet.needsPayrollBranch, true);
  assertEquals(worksheet.line5, 75);
  assertEquals(worksheet.line8, 200);
  assertEquals(worksheet.line11, 1_400);
  assertEquals(worksheet.line13, 1_400);
  assertEquals(worksheet.line14, 2_600);
});

Deno.test("TY2026 Worksheet B requires payroll line 7 when its branch applies", () => {
  assertThrows(
    () =>
      calculateCreditLimitWorksheetB2026({
        schedule8812Line12: 4_000,
        qualifyingChildrenUnder17: 3,
        earnedIncomeWorksheetLine7: 3_000,
        bonaFidePuertoRicoResident: false,
        filesForm2555: false,
        schedule1Line15: 0,
        schedule2Line16c: 0,
        schedule2Line17c: 0,
        form1040Line27aEic: 0,
        schedule3Line11ExcessSocialSecurityRrta: 0,
      }),
    Error,
    "payroll tax line 7",
  );
});
