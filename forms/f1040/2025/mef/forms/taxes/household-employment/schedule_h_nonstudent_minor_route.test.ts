import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import {
  inputSchema,
  schedule_h,
} from "../../../../../nodes/intermediate/forms/taxes/household-employment/schedule_h/index.ts";
import { scheduleHPdf } from "../../../../pdf/forms/taxes/household-employment/schedule_h.ts";
import { type FilerIdentity, FilingStatus } from "../../../types.ts";
import { scheduleH } from "./schedule_h.ts";

const source = {
  employer_ein: "123456789",
  cash_wages_over_2025_limit: true,
  cash_wages_over_quarter_limit: true,
  ss_wages: 4_000,
  medicare_wages: 4_000,
  federal_income_tax_withheld: 0,
  federal_unemployment: {
    paid_only_one_state: true,
    all_contributions_paid_on_time: true,
    all_futa_wages_state_taxable: true,
    state: "OH",
    contributions_paid: 40,
    taxable_wages: 4_000,
    all_household_employees_included: true,
    prior_year_quarter_threshold_met: false,
    employee_wages: [{
      employee_id: "working-minor",
      payroll_source_reference: "2025-working-minor-payroll",
      relationship: "unrelated",
      age_18_or_older_for_fica: false,
      nonstudent_minor_fica_inclusion: {
        birth_date: "2008-05-10",
        birth_date_source_reference: "working-minor-age-record",
        education_status_source_reference: "2025-nonenrollment-record",
        principal_occupation_source_reference: "2025-household-work-record",
        not_a_student_during_2025_verified: true,
        household_services_principal_occupation_verified: true,
      },
      ordinary_cash_only: true,
      annual_cash_wages: 4_000,
      quarterly_cash_wages: [1_000, 1_000, 1_000, 1_000],
      w2: {
        source_reference: "2025-working-minor-w2",
        box2_federal_income_tax_withheld: 0,
        box3_social_security_wages: 4_000,
        box5_medicare_wages: 4_000,
      },
    }],
  },
};
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

Deno.test("Schedule H nonstudent minor principal-work route joins calculation, native, PDF and Schedule 2", () => {
  const filedSource = inputSchema.parse(source);
  const result = schedule_h.compute(
    { taxYear: 2025, formType: "f1040" },
    filedSource,
  );
  assertEquals(
    result.outputs.find((entry) => entry.nodeType === "schedule2")?.fields
      .line9_household_employment,
    636,
  );
  const pending = {
    schedule_h: filedSource,
    schedule2: { line9_household_employment: 636 },
  };
  const xml = scheduleH.build(filedSource, { filer, pending });
  assertStringIncludes(
    xml,
    "<SocialSecurityTaxCashWagesAmt>4000</SocialSecurityTaxCashWagesAmt>",
  );
  assertStringIncludes(
    xml,
    "<MedicareTaxCashWagesAmt>4000</MedicareTaxCashWagesAmt>",
  );
  assertStringIncludes(xml, "<FUTATaxAmt>24</FUTATaxAmt>");
  assertStringIncludes(
    xml,
    "<CombinedFUTATaxPlusNetTaxesAmt>636</CombinedFUTATaxPlusNetTaxesAmt>",
  );
  const projected = scheduleHPdf.projectFields!(filedSource, {});
  assertEquals(projected.line8_fica_and_withholding, 612);
  assertEquals(projected.section_a_futa_tax, 24);
  assertEquals(projected.line26_total_tax, 636);
  assertEquals(scheduleHPdf.instances?.(projected, filer, pending)?.length, 1);
  assertThrows(
    () => scheduleH.build(filedSource, { filer }),
    Error,
    "reconcile to Schedule 2 line 9",
  );
  assertThrows(
    () =>
      scheduleHPdf.instances?.(projected, filer, {
        ...pending,
        schedule2: { line9_household_employment: 635 },
      }),
    Error,
    "reconcile to Schedule 2 line 9",
  );
});
