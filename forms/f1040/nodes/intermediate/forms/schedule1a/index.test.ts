import { assertEquals } from "@std/assert";
import { fieldsOf } from "../../../../../../core/test-utils/output.ts";
import { f1040 } from "../../../outputs/f1040/index.ts";
import { schedule1a } from "./index.ts";
import { FilingStatus } from "../../../types.ts";

const ctx = { taxYear: 2025, formType: "f1040" } as const;

function deduction(
  input: Parameters<typeof schedule1a.compute>[1],
): number | undefined {
  return fieldsOf(schedule1a.compute(ctx, input).outputs, f1040)
    ?.line13b_additional_deductions;
}

Deno.test("schedule1a: deducts qualified employee tips", () => {
  assertEquals(
    deduction({
      qualified_employee_tips: 5_000,
      magi: 30_000,
      filing_status: FilingStatus.Single,
      has_valid_ssn: true,
    }),
    5_000,
  );
});

Deno.test("schedule1a: caps qualified tips at $25,000", () => {
  assertEquals(
    deduction({
      qualified_employee_tips: 40_000,
      magi: 100_000,
      filing_status: FilingStatus.HOH,
      has_valid_ssn: true,
    }),
    25_000,
  );
});

Deno.test("schedule1a: phases out $100 per full $1,000 over threshold", () => {
  assertEquals(
    deduction({
      qualified_employee_tips: 5_000,
      magi: 150_999,
      filing_status: FilingStatus.Single,
      has_valid_ssn: true,
    }),
    5_000,
  );
  assertEquals(
    deduction({
      qualified_employee_tips: 5_000,
      magi: 151_000,
      filing_status: FilingStatus.Single,
      has_valid_ssn: true,
    }),
    4_900,
  );
});

Deno.test("schedule1a: uses $300,000 phaseout threshold for joint returns", () => {
  assertEquals(
    deduction({
      qualified_employee_tips: 25_000,
      magi: 301_000,
      filing_status: FilingStatus.MFJ,
      has_valid_ssn: true,
    }),
    24_900,
  );
});

Deno.test("schedule1a: married filing separately is ineligible", () => {
  assertEquals(
    deduction({
      qualified_employee_tips: 5_000,
      magi: 30_000,
      filing_status: FilingStatus.MFS,
      has_valid_ssn: true,
    }),
    undefined,
  );
});

Deno.test("schedule1a: valid SSN is required", () => {
  assertEquals(
    deduction({
      qualified_employee_tips: 5_000,
      magi: 30_000,
      filing_status: FilingStatus.Single,
      has_valid_ssn: false,
    }),
    undefined,
  );
});

Deno.test("schedule1a: incomplete eligibility context emits no deduction", () => {
  assertEquals(deduction({ qualified_employee_tips: 5_000 }), undefined);
  assertEquals(
    deduction({
      magi: 30_000,
      filing_status: FilingStatus.Single,
      has_valid_ssn: true,
    }),
    undefined,
  );
});

Deno.test("schedule1a: phaseout never produces a negative deduction", () => {
  assertEquals(
    deduction({
      qualified_employee_tips: 5_000,
      magi: 250_000,
      filing_status: FilingStatus.Single,
      has_valid_ssn: true,
    }),
    undefined,
  );
});
