import { assertEquals, assertThrows } from "@std/assert";
import { form8880Pdf } from "./f8880.ts";
import { FilingStatus } from "../../../nodes/types.ts";

Deno.test("Form 8880 PDF line 11 agrees with finalized credit-limit worksheet", () => {
  const fields = {
    ira_contributions_taxpayer: 1_000,
    elective_deferrals_taxpayer: 600,
    agi: 20_000,
    filing_status: FilingStatus.Single,
    print_line1a_ira: 1_000,
    print_line2a_deferrals: 600,
    print_line3a_total: 1_600,
    print_line4a_distributions: 0,
    print_line5a: 1_600,
    print_line11_tax_liability: 800,
    print_line12_credit: 800,
    print_line6a_eligible: 1_600,
    print_line7_total_eligible: 1_600,
    print_line8_agi: 20_000,
    print_line9_rate: "0.5",
    print_line10_raw_credit: 800,
    taxpayer_dob: "1980-01-01",
    taxpayer_student_five_months: false,
    taxpayer_claimed_as_dependent: false,
  };
  const pending = {
    f1040: {
      filing_status: FilingStatus.Single,
      line11_agi: 20_000,
      line18_total_tax_before_credits: 1_000,
    },
    schedule3: {
      line1_total: 200,
      line4_retirement_savings_credit: 800,
    },
  };
  assertEquals(form8880Pdf.projectFields!(fields, pending), fields);
  assertThrows(
    () =>
      form8880Pdf.projectFields!(fields, {
        ...pending,
        f1040: { line18_total_tax_before_credits: 900 },
      }),
    Error,
    "differs from the finalized credit-limit worksheet",
  );
  assertThrows(
    () =>
      form8880Pdf.projectFields!({
        ...fields,
        taxpayer_student_five_months: undefined,
      }, pending),
    Error,
    "needs birth date, five-month student answer, and dependent-claim answer",
  );
  assertThrows(
    () =>
      form8880Pdf.projectFields!({
        ...fields,
        elective_deferrals_taxpayer: 0,
      }, pending),
    Error,
    "contribution lines differ from owner source facts",
  );
  assertThrows(
    () =>
      form8880Pdf.projectFields!({
        ...fields,
        print_line6a_eligible: 2_000,
        print_line7_total_eligible: 2_000,
      }, pending),
    Error,
    "filed lines differ from its source calculation",
  );
  assertThrows(
    () =>
      form8880Pdf.projectFields!(fields, {
        ...pending,
        f1040: { ...pending.f1040, filing_status: FilingStatus.MFJ },
      }),
    Error,
    "filing status and AGI need the finalized Form 1040 source",
  );
});
