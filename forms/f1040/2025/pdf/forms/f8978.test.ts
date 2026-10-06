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
  assertEquals(parent?.line1b_0, scheduleA?.line2_0);
  assertEquals(parent?.line3b_0, scheduleA?.line4_0);
  assertEquals(parent?.line9b_0, scheduleA?.line6_0);
  assertEquals(parent?.line13_0, 450);
  assertEquals(parent?.line14, 450);
  assertEquals(parent?.line15_0, 10);
  assertEquals(parent?.line16, 10);
  assertEquals(parent?.line17_0, 20);
  assertEquals(scheduleA?.income_0_tracking, "20231231-123456");
  assertEquals(scheduleA?.deduction_0_tracking, "2312123456");
  assertEquals(scheduleA?.credit_0_tracking, "123456789");
  assertEquals(
    form8978Pdf.fields.find((field) => field.domainKey === "line13_0")
      ?.pdfField,
    "topmostSubform[0].Page1[0].Table_PartI[0].Row13[0].f1_75[0]",
  );
  assertEquals(
    form8978ScheduleAPdf.fields.find((field) =>
      field.domainKey === "income_0_amount_0"
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
    "native affected-year calculations disagree",
  );
  const changed = pending();
  changed.f1040.form8978_tax = 449;
  assertThrows(
    () => instance(form8978Pdf, changed),
    Error,
    "finalized Form1040 routing",
  );
});

Deno.test("Form8978 PDF preserves extra year columns and complete seven-row overflow sheets", () => {
  const f = filing();
  f.columns.push({ ...f.columns[0], tax_year_end: "2021-12-31" });
  const p = pending(f);
  const parent = instance(form8978Pdf, p);
  assertEquals(parent?.line13_1, 450);
  f.columns[0].income_adjustments = Array(8).fill(
    f.columns[0].income_adjustments[0],
  );
  const sheets = form8978ScheduleAPdf.instances!({}, filer, pending(f));
  assertEquals(sheets.length, 2);
  assertEquals(sheets[0].line2_0, 14000);
  assertEquals(sheets[1].line2_0, 2000);
  assertEquals(sheets[0].line2_1, 2000);
});
Deno.test("Form8978 PDF requires actual tracking except explicit partner attributes", () => {
  const f = filing();
  f.columns[0].income_adjustments[0] = {
    description: "Partner-level adjustment",
    amount: 2000,
  };
  assertThrows(
    () => instance(form8978ScheduleAPdf, pending(f)),
    Error,
    "tracking identifier",
  );
  f.columns[0].income_adjustments[0] = {
    origin: "partner_tax_attribute",
    attribute_explanation: "Reviewed historical loss ledger",
    description: "Partner-level adjustment",
    amount: 2000,
  };
  assertEquals(
    instance(form8978ScheduleAPdf, pending(f))?.income_0_tracking,
    undefined,
  );
});
