import { assertEquals, assertThrows } from "@std/assert";
import { FilingStatus } from "../../types.ts";
import {
  calculateForm3800Nonpassive,
  classifyForm8835Credits,
  deriveForm3800NonpassiveInput,
} from "./calculation.ts";

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

const returnLines = {
  filingStatus: FilingStatus.Single,
  form1040Line16: 42_000,
  schedule2Line1z: 3_000,
  educationCreditRecaptureTaxIncludedInLine7Sources: 500,
  form8621TaxIncludedInLine7Sources: 1_000,
  deferred965TaxIncludedInLine7Sources: 0,
  triggering965TaxIncludedInLine7Sources: 0,
  form6251Line11: 2_000,
  form6251Line9: 18_000,
  form1040Line19: 2_000,
  schedule3Line1: 1_000,
  schedule3Line2: 300,
  schedule3Line3: 400,
  schedule3Line4: 500,
  schedule3Line5a: 600,
  schedule3Line5b: 700,
  schedule3Line7: 5_000,
  schedule3Line6aGbc: 3_000,
  schedule3Line6bPriorMinimumTax: 1_000,
  form8912CreditInSchedule3Line7: 200,
};

Deno.test("Form 3800: derives Part II tax and prior credits from finalized return lines", () => {
  const credits = classifyForm8835Credits([{
    form3800_line: "1f",
    credit_amount: 5_000,
    transfer_out_amount: 0,
    subject_to_passive_activity_limit: false,
  }]);
  const derived = deriveForm3800NonpassiveInput(returnLines, credits);
  assertEquals(derived.regularTax, 43_500);
  assertEquals(derived.alternativeMinimumTax, 2_000);
  assertEquals(derived.foreignTaxCredit, 1_000);
  assertEquals(derived.priorAllowableCredits, 5_300);
  assertEquals(derived.tentativeMinimumTax, 18_000);
  assertEquals(derived.standardCredit, 5_000);
});

Deno.test("Form 3800: rejects exclusions that exceed their source lines", () => {
  const credits = classifyForm8835Credits([{
    form3800_line: "1f",
    credit_amount: 100,
    transfer_out_amount: 0,
    subject_to_passive_activity_limit: false,
  }]);
  assertThrows(
    () =>
      deriveForm3800NonpassiveInput({
        ...returnLines,
        schedule3Line6aGbc: 6_000,
      }, credits),
    Error,
    "do not reconcile",
  );
  assertThrows(
    () =>
      deriveForm3800NonpassiveInput({
        ...returnLines,
        filingStatus: FilingStatus.MFS,
      }, credits),
    Error,
    "spouse business-credit answer",
  );
});

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

Deno.test("Form 3800: separates Form 8835 Part III lines 1f and 4e after transfer", () => {
  const result = classifyForm8835Credits([
    {
      form3800_line: "1f",
      credit_amount: 4_000,
      transfer_out_amount: 0,
      subject_to_passive_activity_limit: false,
    },
    {
      form3800_line: "4e",
      credit_amount: 13_200,
      transfer_out_amount: 5_000,
      registration_number: "CAABC12ABCDE",
      subject_to_passive_activity_limit: false,
      transfer_election_statement_file_name: "Transfer Election Statement.pdf",
    },
  ]);
  assertEquals(result.standardCredit, 4_000);
  assertEquals(result.specifiedCredit, 8_200);
  assertEquals(result.rows.map((row) => row.line), ["1f", "4e"]);
  assertEquals(result.rows[1].transferOutAmount, 5_000);
  assertEquals(result.transferStatementFileNames, [
    "Transfer Election Statement.pdf",
  ]);
});

Deno.test("Form 3800: multiple same-line facilities require Part V detail", () => {
  const result = classifyForm8835Credits([
    {
      form3800_line: "4e",
      credit_amount: 3_000,
      transfer_out_amount: 0,
      subject_to_passive_activity_limit: false,
    },
    {
      form3800_line: "4e",
      credit_amount: 6_000,
      transfer_out_amount: 0,
      subject_to_passive_activity_limit: false,
    },
  ]);
  assertEquals(result.rows[0].facilityCount, 2);
  assertEquals(result.rows[0].availableCredit, 9_000);
  assertEquals(result.rows[0].facilities.length, 2);
});

Deno.test("Form 3800: transfer cannot omit the signed statement file", () => {
  assertThrows(() =>
    classifyForm8835Credits([{
      form3800_line: "4e",
      credit_amount: 1_000,
      transfer_out_amount: 500,
      registration_number: "CAABC12ABCDE",
      subject_to_passive_activity_limit: false,
    }])
  );
});

Deno.test("Form 3800: passive Form 8835 credit cannot enter nonpassive limits", () => {
  assertThrows(
    () =>
      classifyForm8835Credits([{
        form3800_line: "4e",
        credit_amount: 1_000,
        transfer_out_amount: 0,
        subject_to_passive_activity_limit: true,
      }]),
    Error,
    "8582-CR",
  );
});
