import { assertEquals, assertThrows } from "@std/assert";
import { form8880Pdf } from "./f8880.ts";
import { FilingStatus } from "../../../nodes/types.ts";
import { calculateForm8880 } from "../../../nodes/intermediate/forms/form8880/calculation.ts";

Deno.test("Form 8880 PDF replays retained W-2 box 12 deferrals", () => {
  const source = {
    taxpayer_ssn: "123456789",
    spouse_ssn: "987654321",
    w2_deferral_entries: [
      { employee_ssn: "123456789", code: "D" as const, amount: 500 },
      { employee_ssn: "987654321", code: "E" as const, amount: 800 },
    ],
    agi: 30_000,
    filing_status: FilingStatus.MFJ,
    joint_distribution_review: {
      filing_due_date: "2026-04-15" as const,
      reviewed_distribution_sources_ref: "2023-2026 IRA and plan review",
      entries: [],
      no_other_qualifying_distributions_in_lookback: true as const,
    },
    taxpayer_dob: "1980-01-01",
    spouse_dob: "1981-01-01",
    taxpayer_student_five_months: false,
    spouse_student_five_months: false,
    taxpayer_claimed_as_dependent: false,
    spouse_claimed_as_dependent: false,
  };
  const calculated = calculateForm8880(
    { taxYear: 2025, formType: "f1040" },
    source,
    1_000,
  );
  if (calculated.calculatedZero) throw new Error("Expected positive Form 8880");
  const fields = { ...source, ...calculated.printFields };
  const w2 = {
    w2s: [
      {
        employee_ssn: "123456789",
        box1_wages: 30_000,
        box2_fed_withheld: 0,
        box12_entries: [{ code: "D", amount: 500 }],
      },
      {
        employee_ssn: "987654321",
        box1_wages: 0,
        box2_fed_withheld: 0,
        box12_entries: [{ code: "E", amount: 800 }],
      },
    ],
  };
  const pending = {
    f1040: {
      filing_status: FilingStatus.MFJ,
      line11_agi: 30_000,
      line18_total_tax_before_credits: 1_000,
    },
    schedule3: { line4_retirement_savings_credit: 650 },
    w2,
  };
  assertEquals(
    form8880Pdf.projectFields!(fields, pending).print_line2b_deferrals,
    800,
  );
  assertThrows(
    () =>
      form8880Pdf.projectFields!(fields, {
        f1040: pending.f1040,
        schedule3: pending.schedule3,
      }),
    Error,
    "retained W-2 box 12",
  );
  assertThrows(
    () =>
      form8880Pdf.projectFields!(fields, {
        ...pending,
        w2: {
          w2s: [
            { ...w2.w2s[0], box12_entries: [{ code: "D", amount: 501 }] },
            w2.w2s[1],
          ],
        },
      }),
    Error,
    "retained W-2 box 12",
  );
  assertThrows(
    () =>
      form8880Pdf.projectFields!(fields, {
        ...pending,
        w2: { w2s: [...w2.w2s, w2.w2s[1]] },
      }),
    Error,
    "retained W-2 box 12",
  );
});

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
  assertEquals(form8880Pdf.projectFields!(fields, pending), {
    ...fields,
    print_line9_rate: "5",
  });
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
