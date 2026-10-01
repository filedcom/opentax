import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import {
  inputSchema,
  schedule_h,
} from "../../../nodes/intermediate/forms/schedule_h/index.ts";
import { scheduleHPdf } from "../../pdf/forms/schedule_h.ts";
import { type FilerIdentity, FilingStatus } from "../types.ts";
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
  cash_wages_over_2025_limit: false,
  cash_wages_over_quarter_limit: false,
  federal_income_tax_withheld: 250,
  family_withholding_only_payroll: {
    all_household_employees_included: true,
    employer_ssn: "400001032",
    employee: {
      employee_id: "child-employee-1",
      employee_ssn: "400001041",
      relationship: "child",
      relationship_source_reference: "family-relationship-record",
      birth_date: "2006-06-15",
      birth_date_source_reference: "child-birth-record",
      payroll_source_reference: "2025-child-payroll-ledger",
      ordinary_cash_only: true,
      annual_cash_wages: 5_000,
      quarterly_cash_wages: [1_250, 1_250, 1_250, 1_250],
      federal_income_tax_withholding_requested_and_agreed: true,
      w4_source_reference: "2025-child-form-w4",
      w2: {
        source_reference: "2025-child-form-w2",
        employee_ssn: "400001041",
        box1_wages: 5_000,
        box2_federal_income_tax_withheld: 250,
        box3_social_security_wages: 0,
        box5_medicare_wages: 0,
      },
    },
  },
} as const;

Deno.test("Schedule H sourced child withholding joins Schedule 2, native, and PDF without FICA or FUTA", () => {
  const filedSource = inputSchema.parse(source);
  const result = schedule_h.compute(
    { taxYear: 2025, formType: "f1040" },
    filedSource,
  );
  assertEquals(
    result.outputs.find((entry) => entry.nodeType === "schedule2")?.fields
      .line9_household_employment,
    250,
  );
  const pending = {
    schedule_h: filedSource,
    schedule2: { line9_household_employment: 250 },
  };
  const xml = scheduleH.build(filedSource, { filer, pending });
  assertStringIncludes(
    xml,
    "<HsldEmplPdCashWageOverLmtCYInd>false</HsldEmplPdCashWageOverLmtCYInd>",
  );
  assertStringIncludes(
    xml,
    "<HsldEmplFedIncmTaxWithheldInd>true</HsldEmplFedIncmTaxWithheldInd>",
  );
  assertStringIncludes(
    xml,
    "<FederalIncomeTaxWithheldAmt>250</FederalIncomeTaxWithheldAmt>",
  );
  assertStringIncludes(
    xml,
    "<CombinedFUTATaxPlusNetTaxesAmt>250</CombinedFUTATaxPlusNetTaxesAmt>",
  );
  assertEquals(xml.includes("<FUTATaxAmt>"), false);
  assertEquals(xml.includes("<SocialSecurityTaxAmt>"), false);
  const projected = scheduleHPdf.projectFields!(filedSource);
  assertEquals(projected.line8_fica_and_withholding, 250);
  assertEquals(projected.cash_wages_over_quarter_limit, false);
  assertEquals(scheduleHPdf.instances?.(projected, filer, pending)?.length, 1);
});

Deno.test("Schedule H child source and export reject age, W-2, owner, and return tampering", () => {
  const filedSource = inputSchema.parse(source);
  const pending = {
    schedule_h: filedSource,
    schedule2: { line9_household_employment: 250 },
  };
  const family = source.family_withholding_only_payroll;
  const employee = family.employee;
  const invalid = (familyPatch: Record<string, unknown>) =>
    inputSchema.parse({
      ...source,
      family_withholding_only_payroll: { ...family, ...familyPatch },
    });
  assertThrows(() =>
    schedule_h.compute(
      { taxYear: 2025, formType: "f1040" },
      invalid({
        employee: { ...employee, birth_date: "2004-12-31" },
      }),
    )
  );
  assertThrows(() =>
    schedule_h.compute(
      { taxYear: 2025, formType: "f1040" },
      invalid({
        employee: {
          ...employee,
          w2: { ...employee.w2, box1_wages: 4_999 },
        },
      }),
    )
  );
  assertThrows(() =>
    scheduleH.build(filedSource, {
      filer: { ...filer, primarySSN: "400001099" },
      pending,
    })
  );
  assertThrows(() =>
    scheduleH.build(filedSource, {
      filer,
      pending: {
        ...pending,
        schedule_h: inputSchema.parse({
          ...source,
          family_withholding_only_payroll: {
            ...family,
            employee: { ...employee, payroll_source_reference: "other-ledger" },
          },
        }),
      },
    })
  );
  assertThrows(() =>
    scheduleH.build(filedSource, {
      filer,
      pending: { ...pending, schedule2: { line9_household_employment: 249 } },
    })
  );
  assertThrows(() =>
    scheduleHPdf.instances?.(
      scheduleHPdf.projectFields!(filedSource),
      filer,
      { ...pending, schedule2: { line9_household_employment: 249 } },
    )
  );
});
