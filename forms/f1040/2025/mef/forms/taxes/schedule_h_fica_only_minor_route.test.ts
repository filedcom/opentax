import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import {
  inputSchema,
  schedule_h,
} from "../../../../nodes/intermediate/forms/schedule_h/index.ts";
import { scheduleHPdf } from "../../../pdf/forms/taxes/schedule_h.ts";
import { type FilerIdentity, FilingStatus } from "../../types.ts";
import { scheduleH } from "./schedule_h.ts";

const filer: FilerIdentity = {
  primarySSN: "400001032",
  nameLine1: "Tara Black",
  nameControl: "BLAC",
  fullName: "Tara Black",
  address: {
    line1: "17 Lexington Drive",
    city: "Cincinnati",
    state: "OH",
    zip: "45223",
  },
  filingStatus: FilingStatus.Single,
};

const source = {
  employer_ein: "123456789",
  cash_wages_over_2025_limit: true,
  cash_wages_over_quarter_limit: false,
  ss_wages: 3_100,
  medicare_wages: 3_100,
  federal_income_tax_withheld: 0,
  fica_only_payroll: {
    all_household_employees_included: true,
    prior_year_payroll_source_reference: "2024-household-payroll",
    prior_year_quarter_cash_wages: [0, 0, 0, 0],
    employee_wages: [{
      employee_id: "working-minor",
      payroll_source_reference: "2025-working-minor-payroll",
      relationship: "unrelated",
      age_18_or_older_for_fica: false,
      nonstudent_minor_fica_inclusion: {
        birth_date: "2008-05-10",
        birth_date_source_reference: "working-minor-birth-record",
        education_status_source_reference: "2025-nonenrollment-record",
        principal_occupation_source_reference: "2025-household-principal-work",
        not_a_student_during_2025_verified: true,
        household_services_principal_occupation_verified: true,
      },
      ordinary_cash_only: true,
      annual_cash_wages: 3_100,
      quarterly_cash_wages: [775, 775, 775, 775],
      w2: {
        source_reference: "2025-working-minor-w2",
        box2_federal_income_tax_withheld: 0,
        box3_social_security_wages: 3_100,
        box5_medicare_wages: 3_100,
      },
    }],
  },
} as const;

Deno.test("Schedule H FICA-only nonstudent minor joins Schedule 2, native and PDF", () => {
  const filed = inputSchema.parse(source);
  const result = schedule_h.compute(
    { taxYear: 2025, formType: "f1040" },
    filed,
  );
  assertEquals(
    result.outputs.find((entry) => entry.nodeType === "schedule2")?.fields
      .line9_household_employment,
    474,
  );
  const pending = {
    schedule_h: filed,
    schedule2: { line9_household_employment: 474 },
  };
  const xml = scheduleH.build(filed, { filer, pending });
  assertStringIncludes(
    xml,
    "<SocialSecurityTaxCashWagesAmt>3100</SocialSecurityTaxCashWagesAmt>",
  );
  assertStringIncludes(
    xml,
    "<MedicareTaxCashWagesAmt>3100</MedicareTaxCashWagesAmt>",
  );
  assertStringIncludes(
    xml,
    "<CombinedFUTATaxPlusNetTaxesAmt>474</CombinedFUTATaxPlusNetTaxesAmt>",
  );
  assertEquals(xml.includes("<FUTATaxAmt>"), false);
  const projected = scheduleHPdf.projectFields!(filed, {});
  assertEquals(projected.line8_fica_and_withholding, 474);
  assertEquals(projected.cash_wages_over_quarter_limit, false);
  assertEquals(scheduleHPdf.instances?.(projected, filer, pending)?.length, 1);
});

Deno.test("Schedule H FICA-only minor rejects unsupported age, student, source, quarter and export changes", () => {
  const filed = inputSchema.parse(source);
  const pending = {
    schedule_h: filed,
    schedule2: { line9_household_employment: 474 },
  };
  const worker = source.fica_only_payroll.employee_wages[0];
  const minor = worker.nonstudent_minor_fica_inclusion;
  const altered = (employee: Record<string, unknown>) =>
    inputSchema.parse({
      ...source,
      fica_only_payroll: {
        ...source.fica_only_payroll,
        employee_wages: [{ ...worker, ...employee }],
      },
    });
  assertThrows(() =>
    schedule_h.compute(
      { taxYear: 2025, formType: "f1040" },
      altered({
        nonstudent_minor_fica_inclusion: { ...minor, birth_date: "2007-01-01" },
      }),
    )
  );
  assertThrows(() =>
    schedule_h.compute(
      { taxYear: 2025, formType: "f1040" },
      altered({
        student_minor_fica_exclusion: {
          birth_date: "2008-05-10",
          birth_date_source_reference: "student-birth-record",
          student_enrollment_source_reference: "student-enrollment",
          student_during_2025_verified: true,
        },
      }),
    )
  );
  assertThrows(() =>
    schedule_h.compute(
      { taxYear: 2025, formType: "f1040" },
      altered({
        nonstudent_minor_fica_inclusion: {
          ...minor,
          principal_occupation_source_reference:
            worker.payroll_source_reference,
        },
      }),
    )
  );
  assertThrows(() =>
    schedule_h.compute(
      { taxYear: 2025, formType: "f1040" },
      inputSchema.parse({
        ...source,
        fica_only_payroll: {
          ...source.fica_only_payroll,
          prior_year_quarter_cash_wages: [1_000, 0, 0, 0],
        },
      }),
    )
  );
  assertThrows(() =>
    scheduleH.build(filed, {
      filer,
      pending: { ...pending, schedule2: { line9_household_employment: 473 } },
    })
  );
  assertThrows(() =>
    scheduleH.build(filed, {
      filer,
      pending: {
        ...pending,
        schedule_h: altered({ payroll_source_reference: "other-payroll" }),
      },
    })
  );
  assertThrows(() =>
    scheduleHPdf.instances?.(
      scheduleHPdf.projectFields!(filed, {}),
      filer,
      { ...pending, schedule2: { line9_household_employment: 473 } },
    )
  );
});

Deno.test("Schedule H complete FICA-only cash payroll sums quarter cents exactly", () => {
  const raw: any = structuredClone(source);
  const worker = raw.fica_only_payroll.employee_wages[0];
  worker.annual_cash_wages = 2_802.49;
  worker.quarterly_cash_wages = [700, 700.11, 700.11, 702.27];
  worker.w2.box3_social_security_wages = 2_802.49;
  worker.w2.box5_medicare_wages = 2_802.49;
  raw.ss_wages = 2_802.49;
  raw.medicare_wages = 2_802.49;
  const filed = inputSchema.parse(raw);
  const result = schedule_h.compute(
    { taxYear: 2025, formType: "f1040" },
    filed,
  );
  assertEquals(
    result.outputs.find((entry) => entry.nodeType === "schedule2")?.fields
      .line9_household_employment,
    428,
  );
  const pending = {
    schedule_h: filed,
    schedule2: { line9_household_employment: 428 },
  };
  const xml = scheduleH.build(filed, { filer, pending });
  assertStringIncludes(
    xml,
    "<CombinedFUTATaxPlusNetTaxesAmt>428</CombinedFUTATaxPlusNetTaxesAmt>",
  );
  assertEquals(
    scheduleHPdf.projectFields!(filed, {}).line8_fica_and_withholding,
    428,
  );
  worker.quarterly_cash_wages[1] = 700.111;
  assertThrows(() =>
    schedule_h.compute(
      { taxYear: 2025, formType: "f1040" },
      inputSchema.parse(raw),
    )
  );
});
