import { assertEquals, assertThrows } from "@std/assert";
import { standard_deduction_2026 } from "./standard_deduction.ts";
import { general_2026 } from "../inputs/general.ts";
import { agi_2026 } from "./agi.ts";
import { FilingStatus } from "../../nodes/types.ts";
const ctx = { taxYear: 2026, formType: "f1040" };
const input = {
  filing_status: FilingStatus.Single,
  agi: 150_000,
  standard_deduction_eligible: true,
};
Deno.test("2026 deduction node routes one selected deduction and AMT basis to the return and tax owner", () => {
  const result = standard_deduction_2026.compute(ctx, {
    ...input,
    nonitemizer_cash_contributions: 1_000,
    itemized_before_overall_limit: 16_800,
    itemized_taxes: 3_000,
    schedule1a_line44: 8_000,
    schedule1a_line43: 6_000,
  });
  assertEquals(result.outputs.find((row) => row.nodeType === "f1040")!.fields, {
    deduction_method: "standard",
    standard_deduction: 16_100,
    itemized_deductions: 0,
    nonitemizer_cash_contributions: 1_000,
    schedule1a_line44: 8_000,
    qbi_deduction: 0,
  });
  assertEquals(
    result.outputs.find((row) => row.nodeType === "income_tax_calculation")!
      .fields,
    {
      filing_status: FilingStatus.Single,
      taxable_income: 124_900,
      taking_standard_deduction: true,
      form6251_line1b: 130_900,
      form6251_line2a: 16_100,
    },
  );
});
Deno.test("2026 deduction node rejects missing eligibility, partial itemized results and prematurely fixed QBI", () => {
  assertThrows(
    () =>
      standard_deduction_2026.compute(
        ctx,
        { ...input, standard_deduction_eligible: undefined } as never,
      ),
    Error,
  );
  assertThrows(
    () =>
      standard_deduction_2026.compute(ctx, {
        ...input,
        itemized_before_overall_limit: 20_000,
      }),
    Error,
    "both",
  );
  assertThrows(
    () =>
      standard_deduction_2026.compute(
        ctx,
        { ...input, qbi_deduction: 5_000 } as never,
      ),
    Error,
  );
  assertThrows(
    () =>
      standard_deduction_2026.compute(ctx, {
        ...input,
        qbi_activity_pending: true,
      }),
    Error,
    "QBI source owner",
  );
  assertThrows(
    () => standard_deduction_2026.compute({ ...ctx, taxYear: 2025 }, input),
    Error,
    "f1040:2026",
  );
  const business = agi_2026.compute(ctx, {
    filing_status: FilingStatus.Single,
    line3_schedule_c: 1_000,
  });
  assertEquals(
    business.outputs.find((row) => row.nodeType === "standard_deduction")!
      .fields.qbi_activity_pending,
    true,
  );
});
Deno.test("2026 filer source separates tax-residency eligibility from work authorization", () => {
  const filer = {
    tax_year: 2026 as const,
    filing_status: FilingStatus.Single,
    taxpayer_first_name: "Ada",
    taxpayer_last_name: "Rivera",
    taxpayer_ssn: "111223333",
    taxpayer_dob: "1980-06-01",
    taxpayer_blind: false,
    taxpayer_can_be_claimed_as_dependent: false,
    taxpayer_citizen_national_or_work_authorized: true,
    digital_assets: false,
    short_tax_year_due_to_accounting_change: false,
  };
  for (
    const tax_residency of [
      "full_year_citizen_or_resident",
      "nonresident_or_dual_status",
    ] as const
  ) {
    const result = general_2026.compute(ctx, { ...filer, tax_residency });
    assertEquals(
      result.outputs.find((row) => row.nodeType === "standard_deduction")!
        .fields.standard_deduction_eligible,
      tax_residency === "full_year_citizen_or_resident",
    );
  }
  assertThrows(
    () => general_2026.compute(ctx, filer),
    Error,
    "both tax-residency",
  );
});
