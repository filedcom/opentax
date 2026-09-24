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

Deno.test("schedule1a: caps qualified overtime and applies the whole-$1,000 phaseout", () => {
  assertEquals(
    deduction({
      taxpayer_qualified_overtime_compensation: 20_000,
      taxpayer_has_valid_ssn: true,
      magi: 152_999,
      filing_status: FilingStatus.Single,
    }),
    12_300,
  );
});

Deno.test("schedule1a: joint overtime includes only spouses with valid SSNs", () => {
  assertEquals(
    deduction({
      taxpayer_qualified_overtime_compensation: 10_000,
      spouse_qualified_overtime_compensation: 8_000,
      taxpayer_has_valid_ssn: true,
      spouse_has_valid_ssn: false,
      magi: 200_000,
      filing_status: FilingStatus.MFJ,
    }),
    10_000,
  );
});

Deno.test("schedule1a: married filing separately cannot deduct overtime", () => {
  assertEquals(
    deduction({
      taxpayer_qualified_overtime_compensation: 5_000,
      taxpayer_has_valid_ssn: true,
      magi: 50_000,
      filing_status: FilingStatus.MFS,
    }),
    undefined,
  );
});

Deno.test("schedule1a: vehicle interest subtracts business use and allows MFS", () => {
  assertEquals(
    deduction({
      vehicle_loans: [{
        vin: "1HGCM82633A004352",
        qualified_interest_paid: 4_000,
        interest_deducted_on_business_schedules: 750,
      }],
      magi: 80_000,
      filing_status: FilingStatus.MFS,
    }),
    3_250,
  );
});

Deno.test("schedule1a: vehicle phaseout rounds excess MAGI up to $1,000", () => {
  assertEquals(
    deduction({
      vehicle_loans: [{
        vin: "1HGCM82633A004352",
        qualified_interest_paid: 10_000,
      }],
      magi: 100_001,
      filing_status: FilingStatus.Single,
    }),
    9_800,
  );
});

Deno.test("schedule1a: rejects invalid VINs and excess business-use interest", () => {
  assertEquals(
    schedule1a.inputSchema.safeParse({
      vehicle_loans: [{ vin: "not-a-vin", qualified_interest_paid: 1_000 }],
    }).success,
    false,
  );
  assertEquals(
    schedule1a.inputSchema.safeParse({
      vehicle_loans: [{
        vin: "1HGCM82633A004352",
        qualified_interest_paid: 1_000,
        interest_deducted_on_business_schedules: 1_001,
      }],
    }).success,
    false,
  );
});

Deno.test("schedule1a: senior deduction is $6,000 per eligible joint filer", () => {
  assertEquals(
    deduction({
      taxpayer_age_65_or_older: true,
      spouse_age_65_or_older: true,
      taxpayer_has_valid_ssn: true,
      spouse_has_valid_ssn: true,
      magi: 100_000,
      filing_status: FilingStatus.MFJ,
    }),
    12_000,
  );
});

Deno.test("schedule1a: senior phaseout is calculated per eligible person", () => {
  assertEquals(
    deduction({
      taxpayer_age_65_or_older: true,
      spouse_age_65_or_older: true,
      taxpayer_has_valid_ssn: true,
      spouse_has_valid_ssn: true,
      magi: 200_000,
      filing_status: FilingStatus.MFJ,
    }),
    6_000,
  );
});

Deno.test("schedule1a: senior deduction requires a valid SSN and a joint return when married", () => {
  assertEquals(
    deduction({
      taxpayer_age_65_or_older: true,
      taxpayer_has_valid_ssn: false,
      magi: 50_000,
      filing_status: FilingStatus.Single,
    }),
    undefined,
  );
  assertEquals(
    deduction({
      taxpayer_age_65_or_older: true,
      taxpayer_has_valid_ssn: true,
      magi: 50_000,
      filing_status: FilingStatus.MFS,
    }),
    undefined,
  );
});

Deno.test("schedule1a: total combines tips, overtime, vehicle interest, and senior deduction", () => {
  assertEquals(
    deduction({
      qualified_employee_tips: 2_000,
      taxpayer_qualified_overtime_compensation: 3_000,
      vehicle_loans: [{
        vin: "1HGCM82633A004352",
        qualified_interest_paid: 1_000,
      }],
      taxpayer_age_65_or_older: true,
      has_valid_ssn: true,
      taxpayer_has_valid_ssn: true,
      magi: 50_000,
      filing_status: FilingStatus.Single,
    }),
    12_000,
  );
});
