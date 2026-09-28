import { assertEquals, assertThrows } from "@std/assert";
import { type FilerIdentity, FilingStatus } from "../../../mef/header.ts";
import {
  calculateFiling,
  type Form8978Input,
  Form8978Source,
} from "../../../nodes/inputs/f8978/index.ts";
import { form8978Pdf } from "./f8978.ts";
import { form8978ScheduleAPdf } from "./f8978_schedule_a.ts";

const filer: FilerIdentity = {
  primarySSN: "123456789",
  nameLine1: "Alex Partner",
  nameControl: "PART",
  address: {
    line1: "1 Main St",
    city: "Wilmington",
    state: "DE",
    zip: "19801",
  },
  filingStatus: FilingStatus.Single,
};

function filing(): Form8978Input["filings"][number] {
  return {
    source: Form8978Source.BbaAudit,
    columns: [{
      tax_year_end: "2022-12-31",
      original_income: 20_000,
      income_adjustments: [{
        description: "Schedule K-1 line 1 ordinary income",
        tracking_number: "20231231-123456",
        amount: 2_000,
      }],
      original_deductions: 5_000,
      deduction_adjustments: [{
        description: "Schedule K-1 line 12 section 179",
        audit_control_number: "2312123456",
        amount: 100,
      }],
      corrected_income_tax: 1_500,
      corrected_amt: 0,
      original_credits: 0,
      credit_adjustments: [{
        description: "Schedule K-1 line 15 credit",
        ein: "123456789",
        amount: 50,
      }],
      original_tax_liability: 1_000,
      penalty: 10,
      penalty_calculation_explanation: "Source penalty calculation.",
      interest: 20,
      interest_calculation_explanation: "Source interest calculation.",
      tax_calculation_explanation: "Affected-year return recomputation.",
    }],
  };
}

function pending(
  source = filing(),
): Record<string, Record<string, unknown>> {
  const calculated = calculateFiling(source);
  return {
    f8978: {
      filings: [source],
      calculated_filings: [calculated],
      line14: calculated.line14,
    },
    f1040: {
      form8978_tax: calculated.line14,
      line16_income_tax: 2_000,
    },
  };
}

function instance(
  descriptor: typeof form8978Pdf,
  allPending: Record<string, Record<string, unknown>>,
) {
  return descriptor.instances?.({}, filer, allPending)?.[0];
}

Deno.test("Form 8978 PDF prints native parent and Schedule A lines with source identity", () => {
  const allPending = pending();
  const parent = instance(form8978Pdf, allPending);
  const scheduleA = instance(form8978ScheduleAPdf, allPending);
  assertEquals(parent?.partner_name, "Alex Partner");
  assertEquals(parent?.source, Form8978Source.BbaAudit);
  assertEquals(parent?.line1b, scheduleA?.line2);
  assertEquals(parent?.line3b, scheduleA?.line4);
  assertEquals(parent?.line9b, scheduleA?.line6);
  assertEquals(parent?.line13, 450);
  assertEquals(parent?.line14, 450);
  assertEquals(parent?.line15, 10);
  assertEquals(parent?.line16, 10);
  assertEquals(parent?.line17, 20);
  assertEquals(scheduleA?.income_0_tracking, "20231231-123456");
  assertEquals(scheduleA?.deduction_0_tracking, "2312123456");
  assertEquals(scheduleA?.credit_0_tracking, "123456789");
  assertEquals(
    form8978Pdf.fields.find((field) => field.domainKey === "line13")?.pdfField,
    "topmostSubform[0].Page1[0].Table_PartI[0].Row13[0].f1_75[0]",
  );
  assertEquals(
    form8978ScheduleAPdf.fields.find((field) =>
      field.domainKey === "income_0_amount"
    )?.pdfField,
    "topmostSubform[0].Page1[0].Table_1_Income[0].Row1a[0].f1_17[0]",
  );
});

Deno.test("Form 8978 PDF rejects changed native or final-return tax", () => {
  const allPending = pending();
  allPending.f8978.line14 = 999;
  assertThrows(
    () => instance(form8978Pdf, allPending),
    Error,
    "native affected-year calculation disagree",
  );
  const changed = pending();
  changed.f1040.form8978_tax = 449;
  assertThrows(
    () => instance(form8978Pdf, changed),
    Error,
    "finalized Form 1040 line 16 routing",
  );
});

Deno.test("Form 8978 PDF rejects extra years, overflow rows, and unattributed rows", () => {
  const extraYear = filing();
  extraYear.columns.push({
    ...extraYear.columns[0],
    tax_year_end: "2021-12-31",
  });
  assertThrows(
    () => instance(form8978Pdf, pending(extraYear)),
    Error,
    "one filing and one affected tax year",
  );
  const overflow = filing();
  overflow.columns[0].income_adjustments = Array(8).fill(
    overflow.columns[0].income_adjustments[0],
  );
  assertThrows(
    () => instance(form8978Pdf, pending(overflow)),
    Error,
    "seven printed rows",
  );
  const noTracking = filing();
  noTracking.columns[0].income_adjustments[0] = {
    description: "Partner-level adjustment",
    amount: 2000,
  };
  assertThrows(
    () => instance(form8978ScheduleAPdf, pending(noTracking)),
    Error,
    "tracking number",
  );
});

Deno.test("Form 8978 PDF negative line 14 requires finalized reporting-year worksheet", () => {
  const negative = filing();
  negative.columns[0].original_tax_liability = 2_000;
  const allPending = pending(negative);
  delete allPending.f1040.form8978_tax;
  allPending.form8978_reporting_year = {
    negative_form8978_line14: 550,
  };
  assertEquals(instance(form8978Pdf, allPending)?.line14, -550);
  allPending.form8978_reporting_year.negative_form8978_line14 = 500;
  assertThrows(
    () => instance(form8978Pdf, allPending),
    Error,
    "finalized reporting-year worksheet",
  );
});
